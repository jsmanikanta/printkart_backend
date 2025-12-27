const path = require("path");
const fs = require("fs");
const Resend = require("resend");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const verifyToken = require("../verifyToken");
require("dotenv").config();
const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const User = require("../models/user");
const sellbook = require("../models/sellbooks");
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

    if (!name || !price || !description || !location || !categeory) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Upload image buffer to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");

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
    const adminEmail = await resend.emails.send({
      from: "PrintKart <noreply@printkart.com>",
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
    });

    // Email user confirmation
    const userEmail = await resend.emails.send({
      from: "PrintKart <noreply@printkart.com>",
      to: user.email,
      subject: "Thank You for Listing Your Book on PrintKart!",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Thank you for choosing <b>PrintKart</b> to sell your book titled "<i>${newBook.name}</i>".</p>
        <p>We are happy to help you reach book buyers and supporters who appreciate the value you offer.</p>
        <p>Your book details:</p>
        <ul>
          <li>Category: ${newBook.categeory}</li>
          <li>Price: ₹${newBook.price}</li>
          <li>Condition: ${newBook.condition}</li>
          <li>Sell type: ${newBook.selltype}</li>
        </ul>
        <p>We will notify you when someone expresses interest or buys your book. In the meantime, you can log into your dashboard to manage your listings.</p>
        <p>Thank you for being a part of PrintKart community!</p>
        <p>Warm regards,<br/>The PrintKart Team</p>
      `,
    });

    console.log("Admin notification email sent:", adminEmail);
    console.log("User confirmation email sent:", userEmail);

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
      return res.status(400).json({ message: "Book ID and soldstatus required" });

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
      .populate("userid", "fullname email mobileNumber");
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
      user: book.userid
        ? {
            id: book.userid._id,
            fullname: book.userid.fullname,
            email: book.userid.email,
            mobileNumber: book.userid.mobileNumber,
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
      .populate("userid", "fullname email mobileNumber");

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
        userFullName: book.userid?.fullname || "-",
        userEmail: book.userid?.email || "-",
        userMobile: book.userid?.mobileNumber || "-",
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

    const book = await sellbook
      .findById(bookId)
      .populate("userid", "fullname email mobileNumber");

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
      // Buyer confirmation email
      const buyerEmail = await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
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
      });

      // Seller notification email
      const sellerEmail = await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: book.userid.email,
        subject: "Your book has been ordered!",
        html: `
          <h2>Your book has been ordered!</h2>
          <p>Book: <strong>${book.name}</strong></p>
          <p>Ordered by: ${user.fullname} (${user.email})</p>
          <p>Contact Number: <a href="tel:${user.mobileNumber}">${user.mobileNumber}</a></p>
          <p>You can contact the buyer via email or phone.</p>
          <br/>
          <p><a href="mailto:${user.email}"><button style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Contact Buyer by Email</button></a></p>
          <p><a href="tel:${user.mobileNumber}"><button style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Call Buyer</button></a></p>`,
      });

      // Admin notification email
      const adminEmail = await resend.emails.send({
        from: "PrintKart <noreply@printkart.com>",
        to: "printkart0001@gmail.com",
        subject: "Book Ordered alert",
        html: `
          <h2>A Book has been ordered!</h2>
          <p>Book: <strong>${book.name}</strong></p>
          <p>Book seller: <strong>${book.userid.fullname}</strong></p>
          <p>Book seller email: <strong>${book.userid.email}</strong></p>
          <p>Ordered by: ${user.fullname}</p> 
          <p>Buyer mail: ${user.email}</p>
          <p>Buyer Contact Number: <a href="tel:${user.mobileNumber}">${user.mobileNumber}</a></p>
          <p>Seller Contact Number: <a href="tel:${book.userid.mobileNumber}">${book.userid.mobileNumber}</a></p>
          <br/>`,
      });

      const orderedBook = new OrderedBooks({
        buyerid: userId,
        bookid: bookId,
        review: "",
      });

      await orderedBook.save();

      console.log("Order emails sent:", { buyerEmail, sellerEmail, adminEmail });

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

module.exports = {
  Sellbook,
  getBookById,
  getAllBooks,
  updateSoldStatus,
  bookOrdered,
};
