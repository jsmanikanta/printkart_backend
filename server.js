const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");

dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// Connect to database
mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

// Import routes
const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");
const books = require("./routes/bookroute");
const papers = require("./routes/papersroute");
const coupon = require("./routes/couponroute");
const location = require("./routes/locationroute");
const payment = require("./routes/paymentroute");
const { getImages } = require("./getimages");
const wish = require("./routes/wishroute");

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
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
