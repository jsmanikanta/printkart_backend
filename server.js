const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const verifyToken = require("./verifyToken");

dotenv.config();

const app = express();

app.use(cors());

mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");
const books = require("./routes/bookroute");
const { getPreviousYears } = ("./controllers/previous"); 

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/orders", orders);

// Mount body parsers AFTER file upload routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Other routes
app.use("/user", userroute);
app.use("/books", books);
app.use("/admin", admin);
app.get('/anits/previous-years-papers', verifyToken, getPreviousYears); // ✅ Fixed route


// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
