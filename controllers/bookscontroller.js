const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const multer = require("multer");
const verifyToken = require("../verifyToken");

const sellbook = require("../models/sellbooks");
const Buybooks = require("../models/buybook");
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
      soldstatus,
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
      soldstatus,
      user: userId,
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

    const mailtouser = {
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
    transporter.sendMail(mailtouser, (error, info) => {
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
const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.params;
    const { soldstatus } = req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!bookId || !soldstatus)
      return res
        .status(400)
        .json({ message: "Book ID and Sold status required" });

    const book = await sellbook.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.user.toString() !== userId)
      return res.status(403).json({ message: "Forbidden: Not your book" });

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
      selltype: book.selltype,
      condition: book.condition,
      description: book.description,
      location: book.location,
      status: book.status,
      soldstatus: book.soldstatus, // include here
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

const buyBook = async (req, res) => {
  const { bookId, userId } = req.body;

  try {
    const sellBook = await sellbook.findById(bookId);
    const user = await User.findById(userId);

    if (!sellBook) {
      return res.status(404).json({ error: "Sellbook not found" });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (sellBook.status !== "Accepted") {
      return res
        .status(400)
        .json({ error: "Book is not available for purchase" });
    }

    let existingBuyBook = await Buybooks.findOne({
      bookName: sellBook.name,
    });

    if (existingBuyBook) {
      existingBuyBook.quantity = (existingBuyBook.quantity || 1) + 1;
      await existingBuyBook.save();
      return res
        .status(200)
        .json({ message: "Book quantity updated", buyBook: existingBuyBook });
    }

    const newBuyBook = new Buybooks({
      user: user._id,
      book: sellBook._id,
      bookName: sellBook.name,
      image: sellBook.image,
      updatedPrice: sellBook.updatedPrice ?? sellBook.price,
      status: sellBook.status,
      category: sellBook.categeory,
      selltype: sellBook.selltype,
      quantity: 1,
      bookSold: sellBook.soldstatus,
    });

    await newBuyBook.save();

    return res
      .status(201)
      .json({ message: "Book added to buybooks", buyBook: newBuyBook });
  } catch (error) {
    console.error("Error buying book:", error);
    return res.status(500).json({ error: "Internal server error" });
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
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Order Confirmation - Your Book Order",
        html: `
          <h2>Thank you for your order!</h2>
          <p>You have ordered the book: <strong>${book.name}</strong></p>
          <p>Description: ${book.description}</p>
          <p>Condition: ${book.condition}</p>
          <p>Price: ₹${book.updatedPrice ?? book.price}</p>
          <br/>
          <p>We will contact you shortly.</p>
        `,
      };

      const sellerMailOptions = {
        from: process.env.EMAIL_USER,
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
          <p><a href="tel:${user.mobileNumber}"><button>Call Buyer</button></a></p>
        `,
      };
      
      await transporter.sendMail(buyerMailOptions);
      await transporter.sendMail(sellerMailOptions);

      return res
        .status(200)
        .json({ message: "Order confirmed and emails sent" });
    }

    res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Error in bookOrdered:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  Sellbook,
  upload,
  getBookById,
  getAllBooks,
  buyBook,
  updateSoldStatus,
  bookOrdered,
};
