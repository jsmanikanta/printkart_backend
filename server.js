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

// Multer middleware for uploads
const upload = multer({ storage: multer.memoryStorage() });

// Mount `/orders` route BEFORE JSON/urlencoded parsers for file uploads
app.use("/orders", orders);

// Mount body parsers AFTER file upload routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Other routes
app.use("/user", userroute);
app.use("/books", books);
app.use("/admin", admin);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
