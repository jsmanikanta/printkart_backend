const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const express = require("express");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");
const OrderedBooks = require("../models/orderedbooks");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

// Add a new book for sale
const Sellbook = async (req, res) => {
  try {
    const userId = req.userId; 
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.body) return res.status(400).json({ message: "No data received" });
    if (!req.file) return res.status(400).json({ message: "Image file is required" });

    const { name, price, categeory, subcategeory, description, location, selltype, condition, soldstatus } = req.body;

    if (!name || !price || !description || !location || !categeory) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sellbooks", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const newBook = new Sellbooks({
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
      user: userId,
    });

    await newBook.save();

    res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update sold status of a book
const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;
    const { soldstatus } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!bookId || !soldstatus) return res.status(400).json({ message: "Book ID and soldstatus required" });

    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    book.soldstatus = soldstatus;
    await book.save();

    res.status(200).json({ message: "Sold status updated", book });
  } catch (error) {
    console.error("Error updating sold status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get book by ID
const getBookById = async (req, res) => {
  const { id } = req.params;
  try {
    const book = await Sellbooks.findById(id).populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ error: "Book not found" });

    res.status(200).json({
      id: book._id,
      name: book.name,
      image: book.image,
      price: book.price,
      updatedPrice: book.updatedPrice,
      categeory: book.categeory,
      subcategeory: book.subcategeory,
      selltype: book.selltype,
      condition: book.condition,
      description: book.description,
      location: book.location,
      status: book.status,
      soldstatus: book.soldstatus,
      user: book.user
        ? {
            id: book.user._id,
            fullname: book.user.fullname,
            email: book.user.email,
            mobileNumber: book.user.mobileNumber,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all books
const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find().sort({ _id: -1 }).populate("user", "fullname email mobileNumber");

    res.status(200).json({
      books: books.map((book) => ({
        _id: book._id,
        name: book.name || "-",
        image: book.image || "-",
        status: book.status,
        price: book.price !== undefined ? book.price : "-",
        updatedPrice: book.updatedPrice !== undefined ? book.updatedPrice : "-",
        condition: book.condition || "-",
        description: book.description || "-",
        location: book.location || "-",
        categeory: book.categeory || "-",
        subcategeory: book.subcategeory || "-",
        selltype: book.selltype || "-",
        userFullName: book.user?.fullname || "-",
        userEmail: book.user?.email || "-",
        userMobile: book.user?.mobileNumber || "-",
      })),
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark a book as ordered
const bookOrdered = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "User not logged in" });

    const userId = req.userId;
    const { bookId, action } = req.body;

    if (!bookId) return res.status(400).json({ message: "Book ID is required" });

    const book = await Sellbooks.findById(bookId).populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === "decline") return res.status(200).json({ message: "Order declined" });

    if (action === "confirm") {
      const orderedBook = new OrderedBooks({ buyerid: userId, bookid: bookId, review: "" });
      await orderedBook.save();

      return res.status(200).json({ message: "Order confirmed", book });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Error in bookOrdered:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get books by user ID
const getBooksByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid user ID format" });

    if (userId !== req.userId.toString()) return res.status(403).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select("fullname email");
    if (!user) return res.status(404).json({ error: "User not found" });

    const query = { user: userId };
    const { status, soldstatus } = req.query;
    if (status) query.status = status;
    if (soldstatus) query.soldstatus = soldstatus;

    const books = await Sellbooks.find(query).populate("user", "fullname email mobileNumber").sort({ date_added: -1 });

    res.status(200).json({
      success: true,
      user: { id: user._id, fullname: user.fullname, email: user.email },
      count: books.length,
      books: books.map(book => ({
        id: book._id,
        name: book.name,
        image: book.image,
        originalPrice: book.price,
        updatedPrice: book.updatedPrice || book.price,
        categeory: book.categeory,
        subcategeory: book.subcategeory,
        condition: book.condition,
        description: book.description,
        location: book.location,
        selltype: book.selltype,
        status: book.status || "Pending",
        soldstatus: book.soldstatus || "Instock",
        date_added: book.date_added,
        actions: { canUpdate: book.status !== "Rejected", canDelete: true }
      }))
    });
  } catch (error) {
    console.error("Error fetching user books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  Sellbook,
  getBookById,
  getAllBooks,
  updateSoldStatus,
  bookOrdered,
  getBooksByUserId,
};
