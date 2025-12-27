const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Resend = require("resend");
require("dotenv").config();

// ✅ CORRECT Resend v4+ import - NO .default needed
const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const User = require("../models/user");
const Sellbooks = require("../models/sellbooks"); // ✅ Fixed: matches model export
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
      categeory,      // ✅ Matches model
      subcategeory,   // ✅ Matches model
      description,
      location,
      selltype,       // ✅ Matches model
      condition,
      soldstatus,
    } = req.body;

    if (!name || !price || !description || !location || !categeory || !condition || !selltype) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");

    const newBook = new Sellbooks({ // ✅ Fixed: Use Sellbooks (model name)
      name,
      image: uploadResult.secure_url,
      price: parseFloat(price), // ✅ Convert to Number
      categeory,
      subcategeory,
      description,
      location,
      selltype,
      condition,
      soldstatus: soldstatus || "Instock",
      user: userId, // ✅ Fixed: model uses 'user' not 'userid'
    });

    await newBook.save();

    // Email admin notification
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: "printkart0001@gmail.com",
        subject: "New book is ready to sell",
        text: `New book listed by ${user.email}

Book details:
- Name: ${newBook.name}
- Price: ₹${newBook.price}
- Category: ${newBook.categeory}
- Subcategory: ${newBook.subcategeory || 'N/A'}
- Description: ${newBook.description}
- Location: ${newBook.location}
- Sell type: ${newBook.selltype}
- Condition: ${newBook.condition}`,
      });
      console.log("✅ Admin notification email sent");
    } catch (emailError) {
      console.error("❌ Admin email failed:", emailError.message);
    }

    // Email user confirmation
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: user.email,
        subject: "Thank You for Listing Your Book on PrintKart!",
        html: `
          <h2>Hello ${user.fullname || user.email},</h2>
          <p>Thank you for choosing <b>PrintKart</b> to sell your book titled "<i>${newBook.name}</i>".</p>
          <p>Your book is now live and visible to all buyers!</p>
          <p><strong>Book Details:</strong></p>
          <ul>
            <li>📚 Category: ${newBook.categeory}</li>
            <li>💰 Price: ₹${newBook.price}</li>
            <li>📍 Location: ${newBook.location}</li>
            <li>📦 Condition: ${newBook.condition}</li>
            <li>🎯 Sell Type: ${newBook.selltype}</li>
          </ul>
          <p>We will notify you when someone places an order. You can manage your listing from your dashboard.</p>
          <p>Thank you for being part of PrintKart community!<br/>
          <strong>The PrintKart Team</strong></p>
        `,
      });
      console.log("✅ User confirmation email sent");
    } catch (emailError) {
      console.error("❌ User email failed:", emailError.message);
    }

    res.status(201).json({ 
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
    const book = await Sellbooks
      .findById(id)
      .populate("user", "fullname email mobileNumber"); // ✅ Fixed: 'user' field
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
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
      user: book.user ? {
        id: book.user._id,
        fullname: book.user.fullname,
        email: book.user.email,
        mobileNumber: book.user.mobileNumber,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks
      .find()
      .sort({ _id: -1 })
      .populate("user", "fullname email mobileNumber");

    res.status(200).json({
      books: books.map((book) => ({
        _id: book._id,
        name: book.name || "-",
        image: book.image || "-",
        status: book.status || "Pending",
        price: book.price || "-",
        updatedPrice: book.updatedPrice || "-",
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

    const book = await Sellbooks
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
      // Send emails with error handling
      try {
        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: user.email,
          subject: "Order Confirmation - Your Book Order",
          html: `
            <h2>✅ Order Confirmed!</h2>
            <p>You have ordered: <strong>${book.name}</strong></p>
            <p>Price: ₹${book.updatedPrice ?? book.price}</p>
            <p>Condition: ${book.condition}</p>
            <p>We will contact you shortly for payment & delivery details.</p>
          `,
        });

        await resend.emails.send({
          from: "PrintKart <noreply@printkart.com>",
          to: book.user.email,
          subject: "🎉 Your book has been ordered!",
          html: `
            <h2>Your book "${book.name}" has been ordered!</h2>
            <p><strong>Buyer:</strong> ${user.fullname} (${user.email})</p>
            <p><strong>Phone:</strong> <a href="tel:${user.mobileNumber}">${user.mobileNumber}</a></p>
            <p>Contact buyer to arrange payment & delivery.</p>
          `,
        });
        console.log("✅ Order emails sent successfully");
      } catch (emailError) {
        console.error("❌ Order emails failed:", emailError.message);
      }

      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: "",
      });
      await orderedBook.save();

      res.status(200).json({ message: "Order confirmed successfully", book });
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
