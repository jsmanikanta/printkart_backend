import cloudinary from "cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";
import { Resend } from "resend";
import User from "../models/user.js";
import Sellbooks from "../models/sellbooks.js";

dotenv.config();

// Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Resend config
const resend = new Resend(process.env.RESEND_API_KEY);

// Upload buffer to Cloudinary
const uploadToCloudinary = async (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const SellBook = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      price,
      categeory,
      subcategeory,
      description,
      location,
      selltype,
      condition,
    } = req.body;

    if (!name || !price || !categeory || !description || !location) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!req.files?.image?.[0]) {
      return res.status(400).json({ message: "Book image is required" });
    }

    // Upload image
    const imageFile = req.files.image[0];
    const uploadedImage = await uploadToCloudinary(
      imageFile.buffer,
      "sellbooks"
    );

    if (!uploadedImage?.secure_url) {
      return res.status(500).json({ message: "Image upload failed" });
    }

    // Save book
    const newBook = new Sellbooks({
      name,
      image: uploadedImage.secure_url,
      price,
      categeory,
      subcategeory,
      description,
      location,
      selltype,
      condition,
      user: userId,
    });

    await newBook.save();
    const adminEmailHtml = `
      <h2>📚 New Book Listed on MyBookHub</h2>

      <h3>👤 Seller Details</h3>
      <ul>
        <li><b>Name:</b> ${user.fullname}</li>
        <li><b>Email:</b> ${user.email}</li>
        <li><b>Mobile:</b> ${user.mobileNumber}</li>
      </ul>

      <h3>📘 Book Details</h3>
      <ul>
        <li><b>Book Name:</b> ${newBook.name}</li>
        <li><b>Category:</b> ${newBook.categeory}</li>
        <li><b>Sub Category:</b> ${newBook.subcategeory || "N/A"}</li>
        <li><b>Description:</b> ${newBook.description}</li>
        <li><b>Condition:</b> ${newBook.condition}</li>
        <li><b>Sell Type:</b> ${newBook.selltype}</li>
        <li><b>Location:</b> ${newBook.location}</li>
        <li><b>Price:</b> ₹${newBook.price}</li>
        <li><b>Status:</b> ${newBook.status}</li>
        <li><b>Stock Status:</b> ${newBook.soldstatus}</li>
        <li><b>Listed On:</b> ${newBook.date_added.toLocaleString()}</li>
      </ul>

      <p>
        🖼️ <a href="${newBook.image}" target="_blank">View Book Image</a>
      </p>
    `;

    await resend.emails.send({
      from: "MyBookHub <onboarding@resend.dev>",
      to: "printkart0001@gmail.com",
      subject: "📘 New Book Listed for Sale - MyBookHub",
      html: adminEmailHtml,
    });

    return res.status(201).json({
      message: "Book listed successfully",
      book: newBook,
    });
  } catch (error) {
    console.error("Error listing book:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
