const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const verifyToken = require("../verifyToken");
const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const User = require("../models/user");
const sellbook = require("../models/sellbooks");

// Cloudinary config already present
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const Sellbook = async (req, res) => {
  try {
    console.log("req.userId:", req.userId);
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    const userId = req.userId; 
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.body) return res.status(400).json({ message: "No data received" });
    if (!req.file)
      return res.status(400).json({ message: "Image file is required" });

    const {
      name,
      price,
      categeory,
      subcategeory,
      description,
      location,
      selltype,
      condition,
      soldstatus,
    } = req.body;

    if (!name || !price || !description || !location || !categeory) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ message: "Image file is required" });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sellbooks", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const newBook = new sellbook({
      name,
      image: uploadResult.secure_url,
      price,
      categeory,
      subcategeory,
      description,
      location,
      selltype,
      condition,
      soldstatus,
      userid: userId,
    });

    await newBook.save();

    // Email admin notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "printkart0001@gmail.com",
      subject: "New book is ready to sell",
      text: `New book sold by ${user.email}

Book details:
- Name: ${newBook.name}
- Price: ${newBook.price}
- Category: ${newBook.categeory}
- Subcategory: ${newBook.subcategeory}
- Description: ${newBook.description}
- Location: ${newBook.location}
- Sell type: ${newBook.selltype}
- Book's Condition: ${newBook.condition}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Failed to send book notification email:", error);
      } else {
        console.log("Book notification email sent:", info.response);
      }
    });

    // Email user confirmation
    const mailToUser = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Thank You for Listing Your Book on MyBookHub!",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Thank you for choosing <b>MyBookHub</b> to sell your book titled "<i>${newBook.name}</i>".</p>
        <p>We are happy to help you reach book buyers and supporters who appreciate the value you offer.</p>
        <p>Your book details:</p>
        <ul>
          <li>Category: ${newBook.categeory}</li>
          <li>Price: ₹${newBook.price}</li>
          <li>Condition: ${newBook.condition}</li>
          <li>Sell type: ${newBook.selltype}</li>
        </ul>
        <p>We will notify you when someone expresses interest or buys your book. In the meantime, you can log into your dashboard to manage your listings.</p>
        <p>Thank you for being a part of MyBookHub community!</p>
        <p>Warm regards,<br/>The MyBookHub Team</p>
      `,
    };

    transporter.sendMail(mailToUser, (error, info) => {
      if (error) {
        console.error("Failed to send user notification email:", error);
      } else {
        console.log("User notification email sent:", info.response);
      }
    });

    res.status(201).json({ message: "Book added successfully", Book: newBook });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;
    const { soldstatus } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!bookId || !soldstatus)
      return res
        .status(400)
        .json({ message: "Book ID and soldstatus required" });

    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    const book = await sellbook.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    book.soldstatus = soldstatus;
    await book.save();

    return res.status(200).json({ message: "Sold status updated", book });
  } catch (error) {
    console.error("Error updating sold status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  Sellbook,
};
