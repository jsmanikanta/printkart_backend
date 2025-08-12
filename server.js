const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require('path');

dotenv.config();

const app = express();

mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const allowedOrigins = [
  'http://localhost:5173',
  // 'https://your-frontend-domain.com' // Add your frontend production URL here
];

app.set('trust proxy', 1); // Required if behind a proxy like Render with Secure cookies

// Configure CORS once, properly
app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true, // to allow cookies across origins
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.options('*', cors()); // enable pre-flight for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");

app.get("/", (req, res) => {
  res.send("Home page");
});

app.use("/user", userroute);
app.use("/orders", orders);
app.use("/admin", admin); // Added admin route usage (you imported it but didn't use it)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Removed duplicate orders mount on /api - uncomment and fix if needed
// app.use("/api", orders);

const port = process.env.PORT || 5000; // Use uppercase PORT by convention
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
