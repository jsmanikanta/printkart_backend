const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

// Import routes
const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Home page");
});

app.use("/user", userroute);
app.use("/orders", orders);
app.use("/admin", admin);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
