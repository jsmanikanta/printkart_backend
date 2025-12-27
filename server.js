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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/orders", orders);

// Mount body parsers AFTER file upload routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Other routes
app.use("/user", userroute);
app.use("/books", books);
app.use("/admin", admin);
app.get('/anits/previous-years-papers', verifyToken, async (req, res) => {
  try {
    const { subject, branch, college, sem, year } = req.query;
    
    if (!subject || !college || !sem || !year) {
      return res.status(400).json({ success: false, error: "Missing required filters" });
    }

    const filter = { subject, college, sem, year };
    if (branch) filter.branch = branch;

    // ✅ SAFE DB check - works on Render!
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: "Database not ready" });
    }

    const papersData = await mongoose.connection.collection('papers').find(filter)
      .project({ subject: 1, branch: 1, college: 1, sem: 1, year: 1, file: 1, exam_date: 1, uploaded_at: 1 })
      .sort({ year: -1 })
      .limit(50)
      .toArray();

    res.status(200).json({
      success: true,
      count: papersData.length,
      filters: { subject, branch: branch || 'All Branches', college, sem, year },
      data: papersData.map(paper => ({
        id: paper._id.toString(),
        subject: paper.subject,
        branch: paper.branch || 'N/A',
        college: paper.college,
        sem: paper.sem,
        year: paper.year,
        file_url: paper.file,
      }))
    });
  } catch (error) {
    console.error("Previous papers error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
