import dotenv from "dotenv";
dotenv.config();

import User from "../models/user.js";
import Prints from "../models/prints.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const secretkey = process.env.secretkey;

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

    res
      .status(201)
      .json({ message: "User registered successfully!", user: newUser });
  } catch (error) {
    console.error(error);
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

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, secretkey, {
      expiresIn: "300s",
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        fullname: user.fullname,
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

export const getUserById = async (req, res) => {
  try {
    const userId = req.userId; // From verified token middleware
    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }

    const user = await User.findById(userId).select(
      "fullname mobileNumber email"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await Prints.find({ userid: userId }).select(
      "name email mobile file color sides binding copies address college year section description delivery transctionid orderDate"
    );

    res.status(200).json({
      user: {
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      orders: orders.map((order) => ({
        id: order._id,
        name: order.name,
        email: order.email,
        mobile: order.mobile,
        file: order.file
          ? `${process.env.BASE_URL}/uploads/${order.file.replace(
              /^uploads[\\/]/,
              ""
            )}`
          : null,
        color: order.color,
        sides: order.sides,
        binding: order.binding,
        copies: order.copies,
        college: order.college,
        year: order.year,
        section: order.section,
        address: order.address,
        description: order.description,
        transctionid: order.transctionid,
        delivery: order.delivery,
        orderDate: order.orderDate,
      })),
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsersWithPrints = async (req, res) => {
  try {
    const users = await User.find().select("fullname mobileNumber email");
    const usersWithPrints = await Promise.all(
      users.map(async (user) => {
        const orders = await Prints.find({ userid: user._id }).select(
          "file color sides delivery address description orderDate status"
        );

        return {
          id: user._id,
          fullname: user.fullname,
          mobileNumber: user.mobileNumber,
          email: user.email,
          orders: orders.map((order) => ({
            id: order._id,
            name: order.name,
            email: order.email,
            mobile: order.mobile,
            file: `${process.env.BASE_URL}/uploads/${order.file}`,
            color: order.color,
            sides: order.sides,
            delivery: order.delivery,
            college: order.college,
            year: order.year,
            section: order.section,
            copies: order.copies,
            address: order.address,
            description: order.description,
            orderDate: order.orderDate,
            status: order.status || "Pending",
          })),
        };
      })
    );

    res.status(200).json({ users: usersWithPrints });
  } catch (error) {
    console.error("Error fetching users with prints:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
