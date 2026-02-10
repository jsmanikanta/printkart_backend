const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",   // frontend (Vite)
    "http://localhost:3000",
    "https://mybookhub.store",
    "https://www.mybookhub.store",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");
const books = require("./routes/bookroute");
const papers = require("./routes/papersroute");
const coupon = require("./routes/couponroute");
const location = require("./routes/locationroute");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/user", userroute);
app.use("/orders", orders);
app.use("/books", books);
app.use("/admin", admin);
app.use("/anits", papers);
app.use("/coupon", coupon);
app.use("/locations", location);

const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
