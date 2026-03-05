const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const {
  Sellbook,
  updateSoldStatus,
} = require("../controllers/bookscontroller");
const {
  getBookById,
  getAllBooks,
  getBooksByFilter,
} = require("../controllers/buyBooksController");
const { verifyToken } = require("../verifyToken");
router.post("/sellbook", verifyToken, upload.single("image"), Sellbook);
router.get("/allbooks", verifyToken, getAllBooks);
router.get("/filter", verifyToken, getBooksByFilter);
router.get("/:id", verifyToken, getBookById);
router.patch("/:id/sold", verifyToken, updateSoldStatus);

module.exports = router;
