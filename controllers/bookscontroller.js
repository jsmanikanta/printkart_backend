const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const mongoose = require("mongoose");
const verifyToken = require("../verifyToken");

const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");
const OrderedBooks = require("../models/orderedbooks");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ✅ Create new book (NO EMAIL)
const Sellbook = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.file) return res.status(400).json({ message: "Image file required" });

    const { name, price, category, subcategory, description, location, selltype, condition } = req.body;

    if (!name || !price || !description || !location || !category) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sellbooks", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // ✅ Correct field names & user field
    const newBook = new Sellbooks({
      name,
      image: uploadResult.secure_url,
      price: Number(price),
      category,
      subcategory,
      description,
      location,
      selltype,
      condition,
      user: userId, // ✅ FIXED
    });

    await newBook.save();

    res.status(201).json({ success: true, message: "Book created successfully", book: newBook });
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Admin: Update book status & stock
const updateStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status, sellingPrice, stockStatus } = req.body;

    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be Accepted/Rejected" });
    }

    const book = await Sellbooks.findById(bookId).populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ error: "Book not found" });

    book.status = status;
    if (sellingPrice !== undefined) book.updatedPrice = Number(sellingPrice);
    if (stockStatus !== undefined) book.soldstatus = stockStatus;

    await book.save();

    res.status(200).json({ 
      success: true, 
      message: `Book ${status.toLowerCase()}d successfully`, 
      book 
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get all books (admin view)
const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .populate("user", "fullname email mobileNumber")
      .sort({ date_added: -1 });

    const formattedBooks = books.map((book) => ({
      _id: book._id,
      name: book.name || "-",
      image: book.image || "-",
      status: book.status,
      price: book.price ?? "-",
      updatedPrice: book.updatedPrice ?? "-",
      condition: book.condition || "-",
      description: book.description || "-",
      location: book.location || "-",
      category: book.category || "-",
      subcategory: book.subcategory || "-",
      selltype: book.selltype || "-",
      soldstatus: book.soldstatus || "Instock",
      userFullName: book.user?.fullname || "-",
      userEmail: book.user?.email || "-",
      userMobile: book.user?.mobileNumber || "-",
      date_added: book.date_added,
    }));

    res.status(200).json({
      success: true,
      count: formattedBooks.length,
      books: formattedBooks,
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get single book
const getBookById = async (req, res) => {
  try {
    const book = await Sellbooks.findById(req.params.id)
      .populate("user", "fullname email mobileNumber");
    
    if (!book) return res.status(404).json({ error: "Book not found" });

    res.status(200).json({
      success: true,
      book: {
        id: book._id,
        name: book.name,
        image: book.image,
        price: book.price,
        updatedPrice: book.updatedPrice,
        category: book.category,
        subcategory: book.subcategory,
        selltype: book.selltype,
        condition: book.condition,
        description: book.description,
        location: book.location,
        status: book.status,
        soldstatus: book.soldstatus,
        user: book.user ? {
          id: book.user._id,
          fullname: book.user.fullname,
          email: book.user.email,
          mobileNumber: book.user.mobileNumber,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get user's books
const getBooksByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const books = await Sellbooks.find({ user: userId })
      .populate("user", "fullname email mobileNumber")
      .sort({ date_added: -1 });

    res.status(200).json({
      success: true,
      count: books.length,
      books: books.map(book => ({
        id: book._id,
        name: book.name,
        image: book.image,
        category: book.category,
        subcategory: book.subcategory,
        status: book.status,
        soldstatus: book.soldstatus,
        price: book.price,
        updatedPrice: book.updatedPrice,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Book ordering (NO EMAIL)
const bookOrdered = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Login required" });

    const { bookId, action } = req.body;
    const userId = req.userId;

    const book = await Sellbooks.findById(bookId).populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === "decline") {
      return res.status(200).json({ success: true, message: "Order declined" });
    }

    if (action === "confirm") {
      // Save order record
      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: "",
      });
      await orderedBook.save();

      // Update book stock status
      book.soldstatus = "Ordered";
      await book.save();

      res.status(200).json({ 
        success: true, 
        message: "Order confirmed and recorded", 
        book 
      });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    console.error("Order error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Update sold status (user function)
const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.params;
    const { soldstatus } = req.body;

    if (!["Instock", "Soldout", "Ordered", "Rejected"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    const book = await Sellbooks.findOne({ _id: bookId, user: userId });
    if (!book) return res.status(404).json({ message: "Book not found or unauthorized" });

    book.soldstatus = soldstatus;
    await book.save();

    res.status(200).json({ success: true, message: "Status updated", book });
  } catch (error) {
    console.error("Update sold status error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  Sellbook,
  getAllBooks,
  getBookById,
  getBooksByUserId,
  updateStatus,
  updateSoldStatus,
  bookOrdered,
};
