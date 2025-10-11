const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Prints = require("../models/prints");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

cloudinary.api.resources(
  { type: "upload", prefix: "my_book_hub/" },
  function (error, result) {
    if (error) console.error("API error:", error);
    else console.log("Uploaded files:", result.resources);
  }
);

const orderPrint = async (req, res) => {
  console.log("Cloudinary cloud_name:", process.env.CLOUD_NAME);

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
      delivery,
      address,
      price,
      rollno,
      college,
      year,
      section,
      description,
      transctionid,
      binding,
      copies,
    } = req.body;

    if (!color || !sides || !transctionid) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    // Upload file buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "print_orders", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // Use Cloudinary URL as file path
    const savedFilePath = uploadResult.secure_url;

    const newOrder = new Prints({
      file: savedFilePath,
      name,
      mobile,
      color,
      sides,
      delivery: delivery || "Home",
      address,
      price,
      rollno,
      college: college,
      year: year,
      section: section,
      description,
      transctionid,
      userid: userId,
      orderDate: new Date(),
      binding: binding || "none",
      copies: copies || 1,
    });

    await newOrder.save();

    // Send email to admin
    const mailOptions = {
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
- Price: ${newOrder.price}
- Delivery: ${newOrder.delivery}
- Address: ${newOrder.address}
- College, Year, Section, Registred Number: ${newOrder.college}, ${
        newOrder.year
      }, ${newOrder.section}, ${newOrder.rollno}
- Description: ${newOrder.description || "N/A"}
- TransactionId: ${newOrder.transctionid}
- Order Date: ${newOrder.orderDate.toLocaleString()}
      `,
      attachments: [
        {
          filename: path.basename(savedFilePath),
          path: savedFilePath,
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Failed to send order notification email:", error);
      } else {
        console.log("Order notification email sent:", info.response);
      }
    });

    // Send order confirmation to user
    const mailtouser = {
      from: `"MyBookHub" <${process.env.EMAIL_USER}>`,
      to: newOrder.email,
      subject: "Your Print Order Confirmation at MyBookHub",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Thank you for placing a print order with <b>MyBookHub</b>.</p>      
        <p>Here are the details of your print order:</p>
        <ul>
          <li>Name on order: ${newOrder.name}</li>
          <li>Color: ${newOrder.color}</li>
          <li>Sides: ${newOrder.sides}</li>
          <li>Binding type: ${newOrder.binding}</li>
          <li>Number of copies: ${newOrder.copies}</li>
          <li>Price :${newOrder.price}</li>
          <li>Order date: ${newOrder.orderDate.toDateString()}</li>
        </ul>
        <p>Your order is being processed and will be fulfilled shortly. If you have any questions, please reply to this email.</p>
        <p>Thank you for choosing MyBookHub for your printing needs!</p>
        <p>Best regards,<br/>The MyBookHub Team</p>
      `,
    };

    transporter.sendMail(mailtouser, function (error, info) {
      if (error) {
        console.error("Error sending print order email:", error);
      } else {
        console.log("Print order confirmation email sent:", info.response);
      }
    });

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { orderPrint };

const getAllPrintOrders = async (req, res) => {
  try {
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    res.status(200).json({
      orders: orders.map((order) => ({
        name: order.name,
        mobile: order.mobile,
        id: order._id,
        file: order.file,
        color: order.color,
        sides: order.sides,
        delivery: order.delivery,
        rollno: order.rollno,
        address: order.address,
        college: order.college,
        year: order.year,
        section: order.section,
        price: order.price,
        description: order.description,
        orderDate: order.orderDate,
        transctionid: order.transctionid,
        binding: order.binding || "none",
        status: order.status || "Pending",
        user: order.userid
          ? {
              id: order.userid._id,
              fullname: order.userid.fullname,
              email: order.userid.email,
              mobileNumber: order.userid.mobileNumber,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  cloudinary,
  orderPrint,
  getAllPrintOrders,
};
