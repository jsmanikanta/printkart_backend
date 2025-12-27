const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const verifyToken = require("../verifyToken");
const express = require("express");
const fileUpload = require("express-fileupload");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const User = require("../models/user");
const sellbook = require("../models/sellbooks");

// Cloudinary config already present
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

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
    if (!req.file)
      return res.status(400).json({ message: "Image file is required" });

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

    if (!name || !price || !description || !location || !categeory) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ message: "Image file is required" });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "sellbooks", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const newBook = new sellbook({
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
      userid: userId,
    });

    await newBook.save();

    // Email admin notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "printkart0001@gmail.com",
      subject: "New book is ready to sell",
      text: `New book sold by ${user.email}

Book details:
- Name: ${newBook.name}
- Price: ${newBook.price}
- Category: ${newBook.categeory}
- Subcategory: ${newBook.subcategeory}
- Description: ${newBook.description}
- Location: ${newBook.location}
- Sell type: ${newBook.selltype}
- Book's Condition: ${newBook.condition}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Failed to send book notification email:", error);
      } else {
        console.log("Book notification email sent:", info.response);
      }
    });

    // Email user confirmation
    const mailToUser = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Thank You for Listing Your Book on MyBookHub!",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Thank you for choosing <b>MyBookHub</b> to sell your book titled "<i>${newBook.name}</i>".</p>
        <p>We are happy to help you reach book buyers and supporters who appreciate the value you offer.</p>
        <p>Your book details:</p>
        <ul>
          <li>Category: ${newBook.categeory}</li>
          <li>Price: ₹${newBook.price}</li>
          <li>Condition: ${newBook.condition}</li>
          <li>Sell type: ${newBook.selltype}</li>
        </ul>
        <p>We will notify you when someone expresses interest or buys your book. In the meantime, you can log into your dashboard to manage your listings.</p>
        <p>Thank you for being a part of MyBookHub community!</p>
        <p>Warm regards,<br/>The MyBookHub Team</p>
      `,
    };

    transporter.sendMail(mailToUser, (error, info) => {
      if (error) {
        console.error("Failed to send user notification email:", error);
      } else {
        console.log("User notification email sent:", info.response);
      }
    });

    res.status(201).json({ message: "Book added successfully", Book: newBook });
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

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!bookId || !soldstatus)
      return res
        .status(400)
        .json({ message: "Book ID and soldstatus required" });

    if (!["Instock", "Soldout", "Orderd"].includes(soldstatus)) {
      return res.status(400).json({ message: "Invalid soldstatus" });
    }

    const book = await sellbook.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

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

const OrderedBooks = require("../models/orderedbooks");

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

    const book = await sellbook
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
      const buyerMailOptions = {
        from: process.env.EMAILUSER,
        to: user.email,
        subject: "Order Confirmation - Your Book Order",
        html: `
          <h2>Thank you for your order!</h2>
          <p>You have ordered the book: <strong>${book.name}</strong></p>
          <p>Description: ${book.description}</p>
          <p>Condition: ${book.condition}</p>
          <p>Price: ₹${book.updatedPrice ?? book.price}</p>
          <br/>
          <p>We will contact you shortly.</p>`,
      };

      const sellerMailOptions = {
        from: process.env.EMAILUSER,
        to: book.user.email,
        subject: "Your book has been ordered!",
        html: `
          <h2>Your book has been ordered!</h2>
          <p>Book: <strong>${book.name}</strong></p>
          <p>Ordered by: ${user.fullname} (${user.email})</p>
          <p>Contact Number: <a href="tel:${user.mobileNumber}">${user.mobileNumber}</a></p>
          <p>You can contact the buyer via email or phone.</p>
          <br/>
          <p><a href="mailto:${user.email}"><button>Contact Buyer by Email</button></a></p>
          <p><a href="tel:${user.mobileNumber}"><button>Call Buyer</button></a></p>`,
      };
      const Adminmail = {
        from: process.env.EMAILUSER,
        to: "printkart0001@gmail.com",
        subject: "Book Ordered alert",
        html: `
          <h2>A Book has been ordered!</h2>
          <p>Book: <strong>${book.name}</strong></p>
          <P>Book seller: <strong>${book.user.name}</strong/>
          <P>Book seller email: <strong>${book.user.email}</strong/>
          <p>Ordered by: ${user.fullname}</p> 
          <p>Buyer mail: ${user.email}</p>
          <p> Buyer Contact Number: <a href="tel:${user.mobileNumber}">${user.mobileNumber}</a></p>
          <p> Seller Contact Number: <a href="tel:${book.mobileNumber}">${book.mobileNumber}</a></p>
          <br/>
        `,
      };

      await transporter.sendMail(buyerMailOptions);
      await transporter.sendMail(sellerMailOptions);
      await transporter.sendMail(Adminmail);

      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: "",
      });

      await orderedBook.save();

      return res
        .status(200)
        .json({ message: "Order confirmed and emails sent", book });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Error in bookOrdered:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// controllers/bookscontroller.js - ADD THIS FUNCTION

const getBooksByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId; // Support both admin and user access
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select("fullname email isAdmin");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check authorization: User can only see their own books, Admin can see any
    if (userId !== req.userId.toString() && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Unauthorized to view these books" });
    }

    // Fetch user's books with population and filtering
    const books = await Sellbooks.find({ user: userId })
      .populate("user", "fullname email mobileNumber")
      .sort({ createdAt: -1 }) // Latest first
      .select("-__v"); // Exclude version key

    // Filter by status if requested
    const { status, soldstatus } = req.query;
    let filteredBooks = books;

    if (status) {
      filteredBooks = books.filter(book => book.status === status);
    }
    if (soldstatus) {
      filteredBooks = books.filter(book => book.soldstatus === soldstatus);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        isAdmin: user.isAdmin || false
      },
      count: filteredBooks.length,
      books: filteredBooks.map(book => ({
        id: book._id,
        name: book.name,
        image: book.image,
        originalPrice: book.price,
        updatedPrice: book.updatedPrice,
        categeory: book.categeory,
        subcategeory: book.subcategeory,
        condition: book.condition,
        description: book.description,
        location: book.location,
        selltype: book.selltype,
        status: book.status,
        soldstatus: book.soldstatus,
        date_added: book.date_added,
        actions: {
          canUpdate: book.status !== "Rejected" && req.userId.toString() === userId,
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
