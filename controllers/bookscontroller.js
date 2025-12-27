const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const verifyToken = require("../verifyToken");
const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();
const mongoose = require("mongoose"); 
const User = require("../models/user");
const Sellbooks = require("../models/sellbooks"); 
const OrderedBooks = require("../models/orderedbooks");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const Sellbook = async (req, res) => {
  try {
    const userId = req.userId; 
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      price,
      category,
      subcategory,
      categeory,      
      subcategeory,   
      description,
      location,
      selltype,
      condition,
      soldstatus,
      frontendUserId
    } = req.body;

    const finalCategory = category || categeory || subcategory;
    const finalSubcategory = subcategory || subcategeory;

    console.log("Final category:", finalCategory);
    console.log("Final subcategory:", finalSubcategory);

    if (!name?.trim() || !price || !description?.trim() || !location?.trim() || !finalCategory) {
      return res.status(400).json({ 
        message: "Required fields missing",
        received: { 
          name: name?.trim(), 
          price, 
          description: description?.trim(), 
          location: location?.trim(),
          category: finalCategory,
          allFields: req.body 
        }
      });
    }

    const imageFile = req.files?.image;
    if (!imageFile) {
      return res.status(400).json({ message: "Image file 'image' is required" });
    }

    const fileBuffer = imageFile.data;

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sellbooks", resource_type: "image" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(stream);
    });

    console.log("Cloudinary upload success:", uploadResult.secure_url);

    const newBook = new Sellbooks({
      name: name.trim(),
      image: uploadResult.secure_url,
      price: parseFloat(price),
      category: finalCategory,
      subcategory: finalSubcategory,
      categeory: finalCategory,
      subcategeory: finalSubcategory,
      description: description.trim(),
      location: location.trim(),
      selltype: selltype || "sell",
      condition: condition || "Good",
      soldstatus: soldstatus || "Instock",
      user: userId,
      userid: userId,
      status: "pending"
    });

    await newBook.save();
    console.log("Book saved:", newBook._id);
    res.status(201).json({ 
      success: true,
      message: "Book added successfully", 
      book: newBook 
    });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;
    const { soldstatus } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!bookId || !soldstatus)
      return res.status(400).json({ message: "Book ID and soldstatus required" });

    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.user.toString() !== userId && book.userid?.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to update this book" });
    }

    book.soldstatus = soldstatus;
    await book.save();

    return res.status(200).json({ message: "Sold status updated", book });
  } catch (error) {
    console.error("Error updating sold status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getBookById = async (req, res) => {
  const { id } = req.params;
  try {
    const book = await Sellbooks
      .findById(id)
      .populate("user", "fullname email mobileNumber");
      
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    return res.status(200).json({
      id: book._id,
      name: book.name,
      image: book.image,
      price: book.price,
      updatedPrice: book.updatedPrice,
      category: book.category || book.categeory,
      subcategory: book.subcategory || book.subcategeory,
      selltype: book.selltype,
      condition: book.condition,
      description: book.description,
      location: book.location,
      status: book.status || "pending",
      soldstatus: book.soldstatus || "Instock",
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
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks
      .find()
      .sort({ createdAt: -1 })
      .populate("user", "fullname email mobileNumber");

    res.status(200).json({
      books: books.map((book) => ({
        _id: book._id,
        name: book.name || "-",
        image: book.image || "-",
        status: book.status || "pending",
        price: book.price !== undefined ? book.price : "-",
        updatedPrice: book.updatedPrice !== undefined ? book.updatedPrice : "-",
        condition: book.condition || "-",
        description: book.description || "-",
        location: book.location || "-",
        category: book.category || book.categeory || "-",
        subcategory: book.subcategory || book.subcategeory || "-",
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

const bookOrdered = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const userId = req.userId;
    const { bookId, action } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: "Book ID is required" });
    }

    const book = await Sellbooks.findById(bookId)
      .populate("user", "fullname email mobileNumber");

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (action === "decline") {
      return res.status(200).json({ message: "Order declined" });
    }

    if (action === "confirm") {
      const buyerMailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Order Confirmation - Your Book Order",
        html: `
          <h2>Thank you for your order!</h2>
          <p>You have ordered: <strong>${book.name}</strong></p>
          <p>Price: ₹${book.updatedPrice ?? book.price}</p>
          <p>We will contact you shortly.</p>`,
      };

      const sellerMailOptions = {
        from: process.env.EMAIL_USER,
        to: book.user?.email,
        subject: "Your book has been ordered!",
        html: `
          <h2>Your book "${book.name}" has been ordered!</h2>
          <p>Buyer: ${user.fullname} (${user.email})</p>
          <p>Contact: ${user.mobileNumber}</p>`,
      };

      await transporter.sendMail(buyerMailOptions);
      await transporter.sendMail(sellerMailOptions);

      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: "",
      });

      await orderedBook.save();

      return res.status(200).json({ message: "Order confirmed", book });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Error in bookOrdered:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getBooksByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select("fullname email isAdmin");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userId !== req.userId.toString() && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const booksQuery = { 
      $or: [{ user: userId }, { userid: userId }]
    };
    const { status, soldstatus } = req.query;

    if (status) booksQuery.status = status;
    if (soldstatus) booksQuery.soldstatus = soldstatus;

    const books = await Sellbooks.find(booksQuery)
      .populate("user", "fullname email mobileNumber")
      .sort({ createdAt: -1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        isAdmin: user.isAdmin || false
      },
      count: books.length,
      books: books.map(book => ({
        id: book._id,
        name: book.name,
        image: book.image,
        originalPrice: book.price,
        updatedPrice: book.updatedPrice || book.price,
        category: book.category || book.categeory,
        subcategory: book.subcategory || book.subcategeory,
        condition: book.condition,
        description: book.description,
        location: book.location,
        selltype: book.selltype,
        status: book.status || "pending",
        soldstatus: book.soldstatus || "Instock",
        date_added: book.createdAt,
        actions: {
          canUpdate: (book.status !== "Rejected") && (req.userId.toString() === userId),
          canDelete: req.userId.toString() === userId
        }
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
