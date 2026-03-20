import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// 🔥 Fix __dirname (important in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS
app.use(cors());

// Connect to database
mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

// Import routes
import userroute from "./routes/userroute.js";
import orders from "./routes/ordersroute.js";
import admin from "./routes/adminroute.js";
import books from "./routes/bookroute.js";
import papers from "./routes/papersroute.js";
import coupon from "./routes/couponroute.js";
import location from "./routes/locationroute.js";
import payment from "./routes/paymentroute.js";
import { getImages } from "./getimages.js";
import wish from "./routes/wishroute.js";

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/orders", orders);
app.use("/user", userroute);
app.use("/books", books);
app.use("/admin", admin);
app.use("/anits", papers);
app.use("/coupon", coupon);
app.use("/locations", location);
app.use("/payments", payment);
app.get("/images", getImages);
app.use("/wishlist", wish);

// Start server
const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
