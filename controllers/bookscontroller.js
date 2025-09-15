const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const multer = require("multer");

const sellbook = require("../models/sellbooks");
const User = require("../models/user");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const Sellbook = async (req, res) => {
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);

  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      price,
      categeory,
      description,
      location,
      selltype,
      condition,
    } = req.body;

    if (!name || !price || !description || !location)
      return res.status(400).json({ message: "Required fields missing" });

    if (!categeory || typeof categeory !== "string" || categeory.trim() === "")
      return res.status(400).json({ message: "Required category missing" });

    if (!req.file) return res.status(400).json({ message: "File is required" });

    const savedFilePath = path.join("uploads", req.file.filename);

    const newBook = new sellbook({
      name,
      image: savedFilePath,
      price,
      categeory,
      description,
      location,
      selltype,
      condition,
      user: userId, // Associate the user here
    });

    await newBook.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "printkart0001@gmail.com",
      subject: "New book is ready to sell",
      text: `New book sold by ${user.email}

Book details:
- Name: ${newBook.name}
- Price: ${newBook.price}
- Category: ${newBook.categeory}
- Description: ${newBook.description}
- Location: ${newBook.location}
- sell type : ${newBook.selltype}
-Book's Condition : ${newBook.condition}`,
      attachments: [
        {
          path: path.join(__dirname, "..", newBook.image),
          filename: path.basename(newBook.image),
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Failed to send book notification email:", error);
      } else {
        console.log("Book notification email sent:", info.response);
      }
    });

    return res
      .status(201)
      .json({ message: "Book added successfully", Book: newBook });
  } catch (error) {
    console.error("Error adding book:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getBookById = async (req, res) => {
  const { id } = req.params;
  try {
    const book = await sellbook
      .findById(id)
      .populate("user", "fullname email mobileNumber");
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    return res.status(200).json({
      id: book._id,
      name: book.name,
      image: book.image,
      price: book.updatedPrice,
      categeory: book.categeory,
      selltype: book.selltype,
      condition: book.condition,
      description: book.description,
      location: book.location,
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
    const books = await sellbook
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

module.exports = { Sellbook, upload, getBookById, getAllBooks };
