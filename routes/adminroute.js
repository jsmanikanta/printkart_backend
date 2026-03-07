const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

const {
  getAllOrders,
  getAllBooks,
  updateStatus,
  updatePrintStatus,
  uploadBookCategoryImage,
  getBookCategoryImages,
  deleteBookCategoryImage,
} = require("../controllers/admin");

const upload = multer({
  storage: multer.memoryStorage(),
});
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

router.get("/printorders", getAllOrders);
router.get("/books", getAllBooks);
router.patch("/book/:bookId/status", updateStatus);
router.put("/update-status/:orderId", updatePrintStatus);
router.post("/upload", upload.single("image"), uploadBookCategoryImage);
router.get("/add", getBookCategoryImages);
router.delete("/delete/:id", deleteBookCategoryImage);
module.exports = router;
