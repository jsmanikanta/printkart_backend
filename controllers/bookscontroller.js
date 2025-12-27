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
const Sellbooks = require("../models/sellbooks");  // ✅ Fixed model name
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

    // ✅ Fixed: Match model required fields exactly
    if (!name || !price || !description || !location || !categeory || !condition || !selltype) {
      return res.status(400).json({ 
        message: "Required fields missing",
        required: ["name", "price", "description", "location", "categeory", "condition", "selltype"]
      });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");

    const newBook = new Sellbooks({  // ✅ Fixed: Sellbooks model
      name,
      image: uploadResult.secure_url,
      price: parseFloat(price),  // ✅ Convert to Number
      categeory,
      subcategeory: subcategeory || "",
      description,
      location,
      selltype,
      condition,
      soldstatus: soldstatus || "Instock",
      user: userId,  // ✅ Fixed: model uses 'user' not 'userid'
    });

    await newBook.save();

    // ✅ Email admin notification - Resend
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: "printkart0001@gmail.com",
        subject: "🆕 New book listed for sale - PrintKart",
        html: `
          <h2>New book listed by ${user.fullname || user.email}</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📚 Book Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>📖 <strong>Name:</strong> ${newBook.name}</li>
              <li>💰 <strong>Price:</strong> ₹${newBook.price}</li>
              <li>📂 <strong>Category:</strong> ${newBook.categeory}</li>
              <li>📍 <strong>Location:</strong> ${newBook.location}</li>
              <li>📦 <strong>Condition:</strong> ${newBook.condition}</li>
              <li>🎯 <strong>Sell Type:</strong> ${newBook.selltype}</li>
            </ul>
          </div>
          <p><a href="${newBook.image}" target="_blank">View Book Image</a></p>
          <p><strong>User:</strong> ${user.fullname || user.email}</p>
        `,
      });
      console.log("✅ Admin notification email sent");
    } catch (emailError) {
      console.error("❌ Admin email failed:", emailError.message);
    }

    // ✅ Email user confirmation - Resend
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: user.email,
        subject: "✅ Your book is now LIVE on PrintKart!",
        html: `
          <h2>Hello ${user.fullname || user.email},</h2>
          <p>🎉 Your book <strong>"${newBook.name}"</strong> is now LIVE on PrintKart!</p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Your Book Summary:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>📚 <strong>Category:</strong> ${newBook.categeory}</li>
              <li>💰 <strong>Price:</strong> ₹${newBook.price}</li>
              <li>📍 <strong>Location:</strong> ${newBook.location}</li>
              <li>📦 <strong>Condition:</strong> ${newBook.condition}</li>
              <li>🎯 <strong>Type:</strong> ${newBook.selltype}</li>
            </ul>
          </div>
          
          <p>Buyers can now browse and contact you for your book. 
          We'll notify you when someone places an order!</p>
          <p><strong>PrintKart Team</strong></p>
          <img src="${newBook.image}" alt="Your book" style="max-width: 300px; border-radius: 8px;">
        `,
      });
      console.log("✅ User confirmation email sent");
    } catch (emailError) {
      console.error("❌ User email failed:", emailError.message);
    }

    res.status(201).json({ message: "Book added successfully", book: newBook });
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
      return res.status(400).json({ message: "Invalid soldstatus. Use: Instock, Soldout, Orderd" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // ✅ Fixed: Check ownership with correct field
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
  const { id } = req.params;
  try {
    const book = await Sellbooks  // ✅ Fixed model name
      .findById(id)
      .populate("user", "fullname email mobileNumber");  // ✅ Fixed: 'user' field
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    return res.status(200).json({
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
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks  // ✅ Fixed model name
      .find()
      .sort({ _id: -1 })
      .populate("user", "fullname email mobileNumber");

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
        category: book.categeory || "-",
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

    const book = await Sellbooks  // ✅ Fixed model name
      .findById(bookId)
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
      // ✅ Buyer confirmation email - Resend
      try {
        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: user.email,
          subject: "✅ Order Confirmed - PrintKart",
          html: `
            <h2>Thank you for your order!</h2>
            <p>You have ordered the book: <strong>${book.name}</strong></p>
            <p><strong>Description:</strong> ${book.description}</p>
            <p><strong>Condition:</strong> ${book.condition}</p>
            <p><strong>Price:</strong> ₹${book.updatedPrice ?? book.price}</p>
            <br/>
            <p>We will connect you with the seller shortly.</p>
            <p><strong>PrintKart Team</strong></p>
          `,
        });
      } catch (emailError) {
        console.error("❌ Buyer email failed:", emailError.message);
      }

      // ✅ Seller notification email - Resend
      try {
        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: book.user.email,
          subject: "🎉 Your book has been ordered! - PrintKart",
          html: `
            <h2>Your book "${book.name}" has been ordered!</h2>
            <p><strong>Book Details:</strong></p>
            <p>📖 ${book.name} | ₹${book.price} | ${book.condition}</p>
            
            <p><strong>Buyer:</strong> ${user.fullname} (${user.email})</p>
            <p><strong>Contact:</strong> <a href="tel:${user.mobileNumber}">${user.mobileNumber}</a></p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p>💡 <strong>Next Steps:</strong></p>
              <ul>
                <li>Contact buyer to confirm order</li>
                <li>Arrange payment & delivery</li>
                <li>Mark as Soldout when delivered</li>
              </ul>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("❌ Seller email failed:", emailError.message);
      }

      // ✅ Admin notification email - Resend
      try {
        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: "printkart0001@gmail.com",
          subject: "🔔 Book Order Alert - PrintKart",
          html: `
            <h2>A Book has been ordered!</h2>
            <hr>
            <h3>📚 Book: <strong>${book.name}</strong></h3>
            <p><strong>Seller:</strong> ${book.user.fullname} (${book.user.email})</p>
            <p><strong>Buyer:</strong> ${user.fullname} (${user.email})</p>
            <p><strong>Price:</strong> ₹${book.price}</p>
            <p><strong>Buyer Phone:</strong> ${user.mobileNumber}</p>
            <p><strong>Seller Phone:</strong> ${book.user.mobileNumber}</p>
          `,
        });
      } catch (emailError) {
        console.error("❌ Admin email failed:", emailError.message);
      }

      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: "",
      });

      await orderedBook.save();

      return res.status(200).json({ 
        message: "Order confirmed and notifications sent", 
        book,
        order: orderedBook 
      });
    }

    return res.status(400).json({ message: "Invalid action. Use 'confirm' or 'decline'" });
  } catch (error) {
    console.error("Error in bookOrdered:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  Sellbook,
  getBookById,
  getAllBooks,
  updateSoldStatus,
  bookOrdered,
};
