const path = require("path");
const fs = require("fs");
const Resend = require("resend");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);  // ✅ PERFECT

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ✅ ADD THESE MODEL IMPORTS RIGHT HERE
const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");  // Model exports 'Sellbooks'
const OrderedBooks = require("../models/orderedbooks");

// Upload buffer to Cloudinary
const uploadToCloudinary = async (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

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
    if (!req.file) return res.status(400).json({ message: "Image file is required" });

    const {
      name, price, categeory, subcategeory, description, location, selltype, condition, soldstatus
    } = req.body;

    if (!name || !price || !description || !location || !categeory || !condition || !selltype) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload image
    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");

    // ✅ Use Sellbooks (matches your model export)
    const newBook = new Sellbooks({
      name,
      image: uploadResult.secure_url,
      price: parseFloat(price),
      categeory,
      subcategeory: subcategeory || "",
      description,
      location,
      selltype,
      condition,
      soldstatus: soldstatus || "Instock",
      user: userId  // ✅ Model uses 'user' field
    });

    await newBook.save();

    // Admin email
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: "printkart0001@gmail.com",
        subject: "🆕 New Book Listed",
        html: `<h2>${newBook.name}</h2><p>By: ${user.email}</p>`
      });
      console.log("✅ Admin email sent");
    } catch (e) {
      console.error("Admin email failed:", e.message);
    }

    // User email
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: user.email,
        subject: "✅ Book Listed Successfully",
        html: `<h2>Your book "${newBook.name}" is now live!</h2>`
      });
      console.log("✅ User email sent");
    } catch (e) {
      console.error("User email failed:", e.message);
    }

    res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .sort({ _id: -1 })
      .populate("user", "fullname email mobileNumber");

    res.status(200).json({ books });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Sellbooks.findById(req.params.id)
      .populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateSoldStatus = async (req, res) => {
  try {
    const book = await Sellbooks.findById(req.params.bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const { soldstatus } = req.body;
    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    book.soldstatus = soldstatus;
    await book.save();

    res.status(200).json({ message: "Status updated", book });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const bookOrdered = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "User not logged in" });

    const { bookId, action } = req.body;
    const book = await Sellbooks.findById(bookId).populate("user");
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (action === "confirm") {
      const orderedBook = new OrderedBooks({
        buyerid: req.userId,
        bookid: bookId,
        review: ""
      });
      await orderedBook.save();

      res.status(200).json({ message: "Order confirmed", order: orderedBook });
    } else {
      res.status(400).json({ message: "Use action: confirm" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  Sellbook,
  getBookById,
  getAllBooks,
  updateSoldStatus,
  bookOrdered,
};
