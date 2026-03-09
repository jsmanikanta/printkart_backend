<<<<<<< HEAD
const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

const {
  getAllOrders,
  getAllBooks,
  updateStatus,
  updatePrintStatus,
  updatePaymentStatus,
  uploadBookCategoryImage,
  getBookCategoryImages,
} = require("../controllers/admin");

const upload = multer({
  storage: multer.memoryStorage(),
});

router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// print orders
router.get("/printorders", getAllOrders);
router.put("/update-status/:orderId", updatePrintStatus);
router.put("/update-payment-status/:orderId", updatePaymentStatus);

// books
router.get("/books", getAllBooks);
router.patch("/book/:bookId/status", updateStatus);

// category images
router.post("/upload", upload.single("image"), uploadBookCategoryImage);
router.get("/add", getBookCategoryImages);

module.exports = router;
=======
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
>>>>>>> 4e81323cd22d291208993d243c6528e215fc18a3
