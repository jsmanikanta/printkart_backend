const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Prints = require("../models/prints");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, 
  },
});


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

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
      price,
      sides,
      delivery,
      address,
      rollno,
      college,
      year,
      section,
      description,
      transctionid,
      binding,
      copies,
    } = req.body;

    if (!color || !sides || !address || !transctionid || !name || !mobile)
      return res.status(400).json({ message: "Required fields missing" });

    if (!req.file) return res.status(400).json({ message: "File is required" });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "print_orders", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const savedFilePath = uploadResult.secure_url;

    const newOrder = new Prints({
      file: savedFilePath,
      name,
      mobile,
      color,
      price,
      sides,
      delivery: delivery || "Home",
      address,
      rollno,
      college: college || "",
      year: year || "",
      section: section || "",
      description,
      transctionid,
      userid: userId,
      orderDate: new Date(),
      binding: binding || "none",
      copies: copies || 1,
    });

    await newOrder.save();

    // Email Admin Notification
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "printkart0001@gmail.com",
      subject: "New Print Order Placed",
      text: `New print order placed by ${user.fullname}.
Transaction ID: ${transctionid}
Order ID: ${newOrder._id}
Details:
- Name: ${newOrder.name}
- Mobile Number: ${newOrder.mobile}
- Color: ${newOrder.color}
- Sides: ${newOrder.sides}
- Binding: ${newOrder.binding}
- Copies: ${newOrder.copies}
- Price shown: ${newOrder.price}
- Delivery: ${newOrder.delivery}
- Address: ${newOrder.address}
- College: ${newOrder.college}
- Year: ${newOrder.year}
- Section: ${newOrder.section}
- Description: ${newOrder.description || "N/A"}
- Order Date: ${newOrder.orderDate.toLocaleString()}`,
      attachments: [
        {
          filename: path.basename(savedFilePath),
          path: savedFilePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // Email User Confirmation
    const mailToUser = {
      from: `"MyBookHub" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your Print Order Confirmation at MyBookHub",
      html: `
        <p>Thank you for placing a print order with <strong>MyBookHub</strong>.</p>
        <p>Your order is being processed and will be fulfilled shortly. If you have any questions, please reply to this email.</p>
        <p>Thank you for choosing MyBookHub for your printing needs!</p>
        <p>Best regards,<br/>The MyBookHub Team</p>
      `,
    };

    await transporter.sendMail(mailToUser);

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Server error" });
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
        mobile: order.mobile,
        price: order.price,
        id: order._id,
        file: order.file,
        color: order.color,
        sides: order.sides,
        delivery: order.delivery,
        address: order.address,
        rollno: order.rollno,
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
  cloudinary,
  getAllPrintOrders,
  orderPrint,
};
