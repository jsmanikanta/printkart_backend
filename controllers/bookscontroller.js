const path = require("path");
const fs = require("fs");
const Resend = require("resend");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");  // ✅ FIXED: Import model
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

    // ✅ FIXED: Match model required fields
    if (!name || !price || !description || !location || !categeory || !condition || !selltype) {
      return res.status(400).json({ 
        message: "Missing required fields", 
        required: ["name", "price", "description", "location", "categeory", "condition", "selltype"]
      });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");

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
      user: userId,
    });

    await newBook.save();

    // Email admin notification
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: "printkart0001@gmail.com",
        subject: "New book listed for sale",
        text: `New book listed by ${user.email || user.username}

📚 ${newBook.name}
💰 ₹${newBook.price}
📂 ${newBook.categeory}
📍 ${newBook.location}
📦 ${newBook.condition}`,
      });
      console.log("✅ Admin notification sent");
    } catch (emailError) {
      console.error("❌ Admin email failed:", emailError.message);
    }

    // Email user confirmation
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: user.email,
        subject: "✅ Your book is live on PrintKart!",
        html: `
          <h2>Hello ${user.fullname || user.username || user.email},</h2>
          <p>Your book <strong>"${newBook.name}"</strong> is now LIVE! 🎉</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Your Book Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>📚 <strong>Category:</strong> ${newBook.categeory}</li>
              <li>💰 <strong>Price:</strong> ₹${newBook.price}</li>
              <li>📍 <strong>Location:</strong> ${newBook.location}</li>
              <li>📦 <strong>Condition:</strong> ${newBook.condition}</li>
              <li>🎯 <strong>Type:</strong> ${newBook.selltype}</li>
            </ul>
          </div>
          
          <p>Buyers can now see your listing. We'll notify you when someone places an order!</p>
          <p><strong>PrintKart Team</strong></p>
        `,
      });
      console.log("✅ User confirmation sent");
    } catch (emailError) {
      console.error("❌ User email failed:", emailError.message);
    }

    res.status(201).json({ 
      message: "Book listed successfully", 
      book: newBook 
    });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Update other functions (same fixes applied)
const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const bookId = req.params.bookId;
    const { soldstatus } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!bookId || !soldstatus) {
      return res.status(400).json({ message: "Book ID and soldstatus required" });
    }

    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus. Use: Instock, Soldout, Orderd" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to update this book" });
    }

    book.soldstatus = soldstatus;
    await book.save();

    res.status(200).json({ message: "Sold status updated", book });
  } catch (error) {
    console.error("Error updating sold status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Sellbooks.findById(req.params.id).populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ error: "Book not found" });
    
    res.status(200).json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .sort({ _id: -1 })
      .populate("user", "fullname email mobileNumber");

    res.status(200).json({
      books: books.map(book => ({
        _id: book._id,
        name: book.name,
        image: book.image,
        price: book.price,
        categeory: book.categeory,
        condition: book.condition,
        soldstatus: book.soldstatus,
        userFullName: book.user?.fullname || "Anonymous",
      }))
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const bookOrdered = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "User not logged in" });

    const { bookId, action } = req.body;
    if (!bookId) return res.status(400).json({ message: "Book ID required" });

    const book = await Sellbooks.findById(bookId).populate("user", "fullname email mobileNumber");
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (action === "decline") {
      return res.status(200).json({ message: "Order declined" });
    }

    if (action === "confirm") {
      // Create order record
      const orderedBook = new OrderedBooks({
        buyerid: req.userId,
        bookid: bookId,
        review: "",
      });
      await orderedBook.save();

      // Send notifications
      try {
        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: user.email,
          subject: "✅ Order Confirmed!",
          html: `<h2>Order placed for "${book.name}"</h2><p>Contact seller: ${book.user.email}</p>`
        });

        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: book.user.email,
          subject: "🎉 New Order Received!",
          html: `<h2>"${book.name}" ordered by ${user.fullname}</h2><p>Contact: ${user.email}</p>`
        });
      } catch (emailError) {
        console.error("Email notification failed:", emailError.message);
      }

      res.status(200).json({ message: "Order confirmed", order: orderedBook });
    } else {
      res.status(400).json({ message: "Invalid action. Use 'confirm' or 'decline'" });
    }
  } catch (error) {
    console.error("Error in bookOrdered:", error);
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
