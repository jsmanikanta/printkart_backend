const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const mongoose = require("mongoose"); 

const User = require("../models/user");
const Sellbooks = require("../models/sellbooks"); 
const OrderedBooks = require("../models/orderedbooks");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const Sellbook = async (req, res) => {
  try {
    console.log("req.userId:", req.userId);
    console.log("req.body:", req.body);
    console.log("req.files keys:", Object.keys(req.files || {}));

    const userId = req.userId; 
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      price,
      categeory,
      subcategeory,
      description,
      location,
      selltype,
      condition,
      soldstatus
    } = req.body;

    if (!name?.trim() || !price || !description?.trim() || !location?.trim() || !categeory || !subcategeory) {
      return res.status(400).json({ 
        message: "Required fields missing",
        received: { 
          name: name?.trim(), 
          price, 
          description: description?.trim(), 
          location: location?.trim(),
          categeory,
          subcategeory
        }
      });
    }

    let imageFile = req.files?.image;
    if (!imageFile) imageFile = req.files?.file;
    if (!imageFile) imageFile = req.files?.photo;

    if (!imageFile || !imageFile.data || imageFile.data.length === 0) {
      return res.status(400).json({ 
        message: "Image file required", 
        availableFiles: Object.keys(req.files || {})
      });
    }

    const fileBuffer = Buffer.isBuffer(imageFile.data) ? imageFile.data : Buffer.from(imageFile.data);

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sellbooks", resource_type: "image" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(stream);
    });

    const newBook = new Sellbooks({
      name: name.trim(),
      image: uploadResult.secure_url,
      price: parseFloat(price),
      categeory,
      subcategeory,
      description: description.trim(),
      location: location.trim(),
      selltype: selltype || "sell",
      condition: condition || "Good",
      soldstatus: soldstatus || "Instock",
      user: userId,
      status: "Pending"
    });

    await newBook.save();

    res.status(201).json({ 
      success: true,
      message: "Book added successfully", 
      book: newBook 
    });
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

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!bookId || !soldstatus) {
      return res.status(400).json({ message: "Book ID and soldstatus required" });
    }

    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to update this book" });
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
    const book = await Sellbooks.findById(id).populate("user", "fullname email mobileNumber");
    
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
        mobileNumber: book.user.mobileNumber
      } : null
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find().sort({ date_added: -1 }).populate("user", "fullname email mobileNumber");

    res.status(200).json({
      books: books.map((book) => ({
        _id: book._id,
        name: book.name || "-",
        image: book.image || "-",
        status: book.status || "Pending",
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
        userMobile: book.user?.mobileNumber || "-"
      }))
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

    const book = await Sellbooks.findById(bookId).populate("user", "fullname email mobileNumber");
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
      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: ""
      });

      await orderedBook.save();

      res.status(200).json({ message: "Order confirmed", book });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    console.error("Error in bookOrdered:", error);
    res.status(500).json({ error: "Internal server error" });
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
      .sort({ date_added: -1 })
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
        categeory: book.categeory,
        subcategeory: book.subcategeory,
        condition: book.condition,
        description: book.description,
        location: book.location,
        selltype: book.selltype,
        status: book.status || "Pending",
        soldstatus: book.soldstatus || "Instock",
        date_added: book.date_added,
        actions: {
          canUpdate: (book.status !== "Rejected") && (req.userId.toString() === userId.toString()),
          canDelete: req.userId.toString() === userId.toString()
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
