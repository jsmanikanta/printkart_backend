const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Prints = require("../models/prints");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' }, 
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

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
    user: process.env.PRINTS_EMAIL,
    pass: process.env.PRINTS_PASS,
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
    } = req.body;

    if (!req.files?.file || !req.files?.transctionid)
      return res
        .status(400)
        .json({
          message: "Both print file and transaction image are required.",
        });

    // Upload files to Cloudinary
    const uploadedPrint = await uploadToCloudinary(
      req.files.file[0].buffer,
      "PrintOrderFiles"
    );
    const uploadedTransaction = await uploadToCloudinary(
      req.files.transctionid[0].buffer,
      "Transactions"
    );

    // Create new print order
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

    // Email options for admin notification
    const mailToAdmin = {
      from: process.env.EMAIL_USER,
      to: "printkart0001@gmail.com",
      subject: "New Print Order Placed",
      text: `
New print order placed by ${user.fullname}.

Order ID: ${newOrder._id}

Details:
Name: ${newOrder.name}
Mobile: ${newOrder.mobile}
Color: ${newOrder.color}
Sides: ${newOrder.sides}
Binding: ${newOrder.binding}
Copies: ${newOrder.copies}
Original Price: ${newOrder.originalprice}
Offer Price: ${newOrder.discountprice}
Address: ${newOrder.address}
College: ${newOrder.college}, Year: ${newOrder.year}, Section: ${
        newOrder.section
      }, Roll No: ${newOrder.rollno}
Description: ${newOrder.description || "N/A"}
Order Date: ${newOrder.orderDate ? newOrder.orderDate.toLocaleString() : ""}

Attached are the print file and transaction image.
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

    transporter.sendMail(mailToAdmin, (error, info) => {
      if (error) console.error("Admin email error:", error);
      else console.log("Admin mail sent:", info.response);
    });

    // Email options for user confirmation
    const mailToUser = {
      from: `"MyBookHub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your Print Order Confirmation at MyBookHub",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Thank you for placing a print order with <b>MyBookHub</b>.</p>
        <p>Order details:</p>
        <ul>
          <li>Name on order: ${newOrder.name}</li>
          <li>Color: ${newOrder.color}</li>
          <li>Sides: ${newOrder.sides}</li>
          <li>Binding type: ${newOrder.binding}</li>
          <li>Number of copies: ${newOrder.copies}</li>
          <li>Original Price: ${newOrder.originalprice}</li>
          <li>Offer Price: ${newOrder.discountprice}</li>
          <li>Address: ${newOrder.address} | College: ${
        newOrder.college
      } | Year: ${newOrder.year} | Section: ${newOrder.section} | Roll No: ${
        newOrder.rollno
      }</li>
          <li>Description: ${newOrder.description || "N/A"}</li>
          <li>Order date: ${
            newOrder.orderDate ? newOrder.orderDate.toDateString() : ""
          }</li>
        </ul>
        <p><strong>Transaction ID Screenshot:</strong> <a href="${
          newOrder.transctionid
        }" target="_blank">View Image</a></p>
        <p>Your order is processing. If any questions, reply to this email.</p>
        <p>Thanks for choosing MyBookHub!</p>
      `,
    };

    transporter.sendMail(mailToUser, (error, info) => {
      if (error) console.error("User email error:", error);
      else console.log("User confirmation mail sent:", info.response);
    });

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllPrintOrders = async (req, res) => {
  try {
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    res.status(200).json({
      orders: orders.map((order) => ({
        id: order._id,
        name: order.name,
        mobile: order.mobile,
        file: order.file,
        color: order.color,
        sides: order.sides,
        binding: order.binding || "none",
        copies: order.copies,
        originalprice: order.originalprice,
        discountprice: order.discountprice,
        address: order.address,
        college: order.college,
        year: order.year,
        section: order.section,
        rollno: order.rollno,
        description: order.description,
        transctionid: order.transctionid,
        orderDate: order.orderDate,
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
    console.error("Fetching orders error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  cloudinary,
  orderPrint,
  getAllPrintOrders,
};
