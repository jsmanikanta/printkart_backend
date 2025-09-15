const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const multer = require("multer");
const User = require("../models/user");
const Prints = require("../models/prints");

// Multer setup for file uploads
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Print_Orders",
    allowed_formats: ["pdf"],
  },
});

const upload = multer({ storage });

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Place an order and send admin an email
const orderPrint = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      email,
      mobile,
      color,
      sides,
      delivery,
      address,
      collegeName,
      yearOfStudy,
      classSection,
      description,
      transctionid,
      binding,
      copies,
    } = req.body;

    if (!color || !sides || !address || !transctionid) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const imageUrl = req.file.path; // Cloudinary URL

    const newOrder = new Prints({
      file: imageUrl,
      name,
      email,
      mobile,
      color,
      sides,
      delivery: delivery || "Home",
      address,
      college: collegeName,
      year: yearOfStudy,
      section: classSection,
      description,
      transctionid,
      userid: userId,
      orderDate: new Date(),
      binding: binding || "none",
      copies: copies || 1,
    });

    await newOrder.save();

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
- Email: ${newOrder.email}
- Mobile Number: ${newOrder.mobile}
- Color: ${newOrder.color}
- Sides: ${newOrder.sides}
- Binding: ${newOrder.binding}
- Copies: ${newOrder.copies}
- Delivery: ${newOrder.delivery}
- Address: ${newOrder.address}
- College, Year, Section: ${newOrder.college}, ${newOrder.year}, ${
        newOrder.section
      }
- Description: ${newOrder.description || "N/A"}
- Order Date: ${newOrder.orderDate.toLocaleString()}
`,
      attachments: [
        {
          path: imageUrl,
          filename: path.basename(imageUrl),
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

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
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
        name: order.name,
        email: order.email,
        mobile: order.mobile,
        id: order._id,
        file: order.file,
        color: order.color,
        sides: order.sides,
        delivery: order.delivery,
        address: order.address,
        college: order.college,
        year: order.year,
        section: order.section,
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
  upload,
  orderPrint,
  getAllPrintOrders,
};
