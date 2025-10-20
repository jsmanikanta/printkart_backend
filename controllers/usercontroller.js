import dotenv from "dotenv";
dotenv.config();
import Prints from "../models/prints.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const secretkey = process.env.SECRETKEY;

const resend = new Resend(process.env.RESEND_API_KEY);

export const Register = async (req, res) => {
  const { fullname, mobileNumber, email, password } = req.body;

  try {
    const number = await User.findOne({ mobileNumber });
    const mail = await User.findOne({ email });

    if (number || mail) {
      return res.status(400).json({ error: "User already found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullname,
      mobileNumber,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    try {
      await resend.emails.send({
        from: "MyBookHub <onboarding@resend.dev>",
        to: newUser.email,
        subject: `${newUser.fullname}! Welcome to MyBookHub 🎉`,
        html: `
          <h2>Hello ${newUser.fullname},</h2>
          <p>Welcome to <b>MyBookHub</b>! We’re thrilled to have you on board.</p>
          <ul>
            <li>📚 Buy or sell books easily.</li>
            <li>🖨️ Order quick, affordable printouts anytime.</li>
          </ul>
          <p>Your journey for seamless study materials and secondhand books starts here.</p>
          <p>If you have any questions, reply to this email — we’re always happy to help!</p>
          <p>Happy reading,<br/><b>The MyBookHub Team</b></p>
        `,
      });

      console.log("✅ Welcome email sent to:", newUser.email);
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
    }

    res.status(201).json({
      message: "User registered successfully!",
      user: newUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    let user;

    if (emailRegex.test(identifier)) {
      user = await User.findOne({ email: identifier });
    } else if (phoneRegex.test(identifier)) {
      user = await User.findOne({ mobileNumber: identifier });
    } else {
      return res.status(400).json({ error: "Invalid email or phone format" });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, secretkey, {
      expiresIn: "3000s",
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export function setupUploadsStatic(app) {
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
}

export const getPrintsById = async (req, res) => {
  try {
    const userId = req.userId; // Ensure a middleware is setting this, e.g., verifyToken

    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }

    // Fetch user info
    const user = await User.findById(userId).select(
      "fullname mobileNumber email"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the print orders for this user
    const orders = await Prints.find({ userid: userId })
      .select(
        "name mobile file originalprice discountprice color sides binding copies address college year section rollno description transctionid orderDate status"
      )
      .sort({ orderDate: -1 });

    // Format response
    return res.status(200).json({
      user: {
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      orders: orders.map((order) => ({
        id: order._id,
        name: order.name,
        mobile: order.mobile,
        file: order.file,
        originalprice: order.originalprice,
        discountprice: order.discountprice,
        color: order.color,
        sides: order.sides,
        binding: order.binding,
        copies: order.copies,
        college: order.college,
        year: order.year,
        section: order.section,
        address: order.address,
        rollno: order.rollno,
        description: order.description,
        transctionid: order.transctionid,
        orderDate: order.orderDate,
        status: order.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getBooksSoldById = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }

    const user = await User.findById(userId).select(
      "fullname mobileNumber email"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const books = await Sellbooks.find({ user: userId })
      .select(
        "name image price condition description location categeory selltype status updatedPrice soldstatus"
      )
      .sort({ orderDate: -1 });

    res.status(200).json({
      user: {
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      books: books.map((book) => ({
        id: book._id,
        name: book.name,
        image: book.image
          ? `${process.env.BASE_URL}/uploads/${book.image.replace(
              /^uploads[\\/]/,
              ""
            )}`
          : null,
        price: book.price,
        condition: book.condition,
        description: book.description,
        location: book.location,
        category: book.categeory,
        sellType: book.selltype,
        soldstatus: book.soldstatus,
        status: book.status,
        updatedPrice: book.updatedPrice || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

import OrderedBooks from "../models/orderedbooks.js";

export const getUserBoughtBooks = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "User not logged in" });
    }
    const userId = req.userId;
    const orders = await OrderedBooks.find({ buyerid: userId })
      .populate({
        path: "bookid",
        select: "name description price updatedPrice condition image user",
        populate: { path: "user", select: "fullname" }, // populate seller info from 'user' field
      })
      .sort({ createdAt: -1 });

    const boughtBooks = orders.map((order) => ({
      orderId: order._id,
      book: {
        ...order.bookid._doc,
        sellerName: order.bookid.user?.fullname || "Unknown Seller",
        image: order.bookid.image || null,
      },
      review: order.review || "",
    }));

    return res.status(200).json({ boughtBooks });
  } catch (error) {
    console.error("Error in getUserBoughtBooks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
