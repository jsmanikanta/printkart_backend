const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  Sellbook,
  getBookById,
  getAllBooks,
  updateSoldStatus,
  bookOrdered,
  getBooksByUserId,
} = require("../controllers/bookscontroller");

const { verifyToken } = require("../verifyToken");

router.post("/sellbook", verifyToken, upload.single("image"), Sellbook);
router.put("/updateSoldStatus/:bookId", verifyToken, updateSoldStatus);
router.get("/:id", getBookById);
router.get("/mybooks/:id", verifyToken, getBooksByUserId);
router.get("/", getAllBooks);
router.post("/confirm-order", verifyToken, bookOrdered);

module.exports = router;
