const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");
const OrderedBooks = require("../models/orderedbooks");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
require("dotenv").config();

const Resend = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadToCloudinary = async (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// 1. SELL BOOK
const Sellbook = async (req, res) => {
  try {
    console.log("📤 Sellbook called");
    
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.file) return res.status(400).json({ message: "Image required" });

    const { name, price, categeory, condition, description, location, selltype } = req.body;
    if (!name || !price || !categeory || !condition || !description || !location || !selltype) {
      return res.status(400).json({ 
        message: "Missing fields", 
        required: ["name", "price", "categeory", "condition", "description", "location", "selltype"]
      });
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");
    
    const newBook = new Sellbooks({
      name,
      image: uploadResult.secure_url,
      price: parseFloat(price),
      categeory,
      condition,
      description,
      location,
      selltype,
      user: userId
    });

    await newBook.save();

    // Admin Email
    try {
      await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: "printkart0001@gmail.com",
        subject: "🆕 New Book Listed",
        html: `<h2>${newBook.name}</h2><p>Price: ₹${newBook.price}</p><p>By: ${user.email}</p>`
      });
    } catch (e) {
      console.log("Admin email failed:", e.message);
    }

    res.status(201).json({ message: "Book listed successfully", book: newBook });
  } catch (error) {
    console.error("Sellbook error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// 2. GET ALL BOOKS
const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .sort({ createdAt: -1 })
      .populate("user", "fullname email mobileNumber");
    
    res.json({ 
      success: true, 
      count: books.length,
      books: books.map(book => ({
        id: book._id,
        name: book.name,
        image: book.image,
        price: book.price,
        categeory: book.categeory,
        condition: book.condition,
        soldstatus: book.soldstatus,
        seller: book.user?.fullname || "Unknown"
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// 3. GET BOOK BY ID
const getBookById = async (req, res) => {
  try {
    const book = await Sellbooks.findById(req.params.id)
      .populate("user", "fullname email mobileNumber");
    
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// 4. UPDATE SOLD STATUS
const updateSoldStatus = async (req, res) => {
  try {
    const { soldstatus } = req.body;
    const book = await Sellbooks.findById(req.params.bookId);
    
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    book.soldstatus = soldstatus;
    await book.save();
    
    res.json({ message: "Status updated", book });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// 5. BOOK ORDER
const bookOrdered = async (req, res) => {
  try {
    const { action } = req.body;
    const bookId = req.params.bookId;
    
    if (action === "confirm") {
      const orderedBook = new OrderedBooks({
        buyerid: req.userId,
        bookid: bookId,
        review: ""
      });
      await orderedBook.save();
      res.json({ message: "Order confirmed", order: orderedBook });
    } else {
      res.status(400).json({ message: "Use action: confirm" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  Sellbook,
  getAllBooks,
  getBookById,
  updateSoldStatus,
  bookOrdered
};
