const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { Resend } = require("resend");
const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Resend config
const resend = new Resend(process.env.RESEND_API_KEY);

// Upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const Sellbook = async (req, res) => {
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

    if (!name || !price || !categeory || !location) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Book image is required" });
    }

    // Upload image
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      "sellbooks"
    );

    // Save book
    const newBook = new Sellbooks({
      name,
      image: uploadResult.secure_url,
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
      <h2>📘 New Book Listed</h2>

      <h3>User Details</h3>
      <ul>
        <li>Name: ${user.fullname}</li>
        <li>Email: ${user.email}</li>
        <li>Mobile: ${user.mobileNumber}</li>
      </ul>

      <h3>Book Details</h3>
      <ul>
        <li>Name: ${newBook.name}</li>
        <li>Category: ${newBook.categeory}</li>
        <li>Subcategory: ${newBook.subcategeory || "-"}</li>
        <li>Condition: ${newBook.condition}</li>
        <li>Price: ₹${newBook.price}</li>
        <li>Location: ${newBook.location}</li>
        <li>Status: ${newBook.status}</li>
      </ul>

      <p><a href="${newBook.image}" target="_blank">View Image</a></p>
    `;

    await resend.emails.send({
      from: "MyBookHub <onboarding@resend.dev>",
      to: "printkart0001@gmail.com",
      subject: "📘 New Book Listed for Sale - MyBookHub",
      html: adminEmailHtml,
    });

    return res.status(201).json({
      success: true,
      message: "Book listed successfully",
      book: newBook,
    });
  } catch (error) {
    console.error("Sellbook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { Sellbook };
