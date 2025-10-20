const path = require("path");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Prints = require("../models/prints");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Configure mail transporters
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.PRINTS_MAIL,
    pass: process.env.PRINTS_PASS,
  },
});

const uploadToCloudinary = async (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const orderPrint = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      mobile,
      color,
      sides,
      address,
      originalprice,
      discountprice,
      rollno,
      college,
      year,
      section,
      description,
      binding,
      copies,
      transctionid,
    } = req.body;

    if (!color || !sides) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // File validations
    if (!req.files?.file?.[0]) {
      return res.status(400).json({ message: "Print PDF file is required" });
    }

    if (!req.files?.transctionid?.[0]) {
      return res.status(400).json({ message: "Transaction image is required" });
    }

    // Upload files to Cloudinary
    const uploadedPrint = await uploadToCloudinary(
      req.files.file[0].buffer,
      "PrintOrders"
    );

    const uploadedTransaction = await uploadToCloudinary(
      req.files.transctionid[0].buffer,
      "Transactions"
    );

    // Save order to DB
    const newOrder = new Prints({
      name,
      mobile,
      file: uploadedPrint.secure_url,
      originalprice,
      discountprice,
      color,
      sides,
      binding,
      copies,
      address,
      college,
      year,
      section,
      rollno,
      description,
      transctionid: uploadedTransaction.secure_url,
      userid: userId,
    });

    await newOrder.save();

    // Send email to admin
    const adminMail = {
      from: process.env.EMAIL_USER,
      to: "printkart0001@gmail.com",
      subject: "New Print Order Placed",
      text: `
New print order placed by ${user.fullname}.

Transaction ID: ${transctionid}
Order ID: ${newOrder._id}

Details:
- Name: ${newOrder.name}
- Mobile Number: ${newOrder.mobile}
- Color: ${newOrder.color}
- Sides: ${newOrder.sides}
- Binding: ${newOrder.binding}
- Copies: ${newOrder.copies}
- Original Price: ${newOrder.originalprice}
- Offer Price: ${newOrder.discountprice}
- Address: ${newOrder.address}
- College Info: ${newOrder.college}, ${newOrder.year}, ${newOrder.section}, ${
        newOrder.rollno
      }
- Description: ${newOrder.description || "N/A"}
- Transaction ID: ${newOrder.transctionid}
- Order Date: ${newOrder.orderDate.toLocaleString()} 
      `,
      attachments: [
        {
          filename: path.basename(uploadedPrint.secure_url),
          path: uploadedPrint.secure_url,
        },
        {
          filename: path.basename(uploadedTransaction.secure_url),
          path: uploadedTransaction.secure_url,
        },
      ],
    };

    transporter.sendMail(adminMail, (error, info) => {
      if (error) console.error("Admin mail failed:", error);
      else console.log("Admin notification sent:", info.response);
    });

    // Send confirmation email to user
    const userMail = {
      from: `"MyBookHub" <${process.env.PRINTS_MAIL}>`,
      to: user.email,
      subject: "Your Print Order Confirmation at MyBookHub",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Thank you for placing a print order with <b>MyBookHub</b>.</p>      
        <p>Order details:</p>
        <ul>
          <li>Name: ${newOrder.name}</li>
          <li>Color: ${newOrder.color}</li>
          <li>Sides: ${newOrder.sides}</li>
          <li>Binding: ${newOrder.binding}</li>
          <li>Copies: ${newOrder.copies}</li>
          <li>Original Price: ${newOrder.originalprice}</li>
          <li>Offer Price: ${newOrder.discountprice}</li>
          <li>Order Date: ${newOrder.orderDate.toDateString()}</li>
        </ul>
        <p>Your order is being processed and will be fulfilled shortly.</p>
        <p>Best regards,<br/>MyBookHub Team</p>
      `,
    };

    mailer.sendMail(userMail, (error, info) => {
      if (error) console.error("User email error:", error);
      else console.log("Order confirmation sent to user:", info.response);
    });

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  cloudinary,
  orderPrint,
};
