const express = require("express");
const app = express();
const router = express.Router();
const path = require("path");
const {
  getAllOrders,
  getAllBooks,
  updateStatus,
  getAllOrderedBooks
} = require("../controllers/admin");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
router.get("/printorders", getAllOrders);
router.get("/books", getAllBooks);
router.patch("/book/:bookId/status", updateStatus);
router.get("/ordered-books",getAllOrderedBooks);

module.exports = router;
