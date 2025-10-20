const express = require("express");
const router = express.Router();
const path = require("path");

const {
  getAllOrders,
  getAllBooks,
  updateStatus,
  updatePrintStatus,
  getAllOrderedBooks,
} = require("../controllers/admin");

router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

router.get("/printorders", getAllOrders);
router.get("/books", getAllBooks);
router.patch("/book/:bookId/status", updateStatus);
router.put("/update-status/:orderId", updatePrintStatus);
router.get("/ordered-books", getAllOrderedBooks);

module.exports = router;
