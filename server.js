const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

// Middleware - Order matters!
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - Only once
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || process.env.database)
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection error:", err));

// Routes
const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");
const books = require("./routes/bookroute");
const papers = require("./routes/papersroute");

// Mount routes properly
app.use("/api/user", userroute);
app.use("/api/orders", orders);
app.use("/api/admin", admin);
app.use("/api/books", books);
app.use("/api/papers", papers); // Fixed: was "/anits"

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Something went wrong!" });
});
// Start server
const port = process.env.PORT || process.env.port || 5000;
const server = app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
