const express = require("express");

const router = express.Router();

const {
  Sellbook,
  upload,
  getBookById,
  getAllBooks,
  buyBook,
} = require("../controllers/bookscontroller");

const { verifyToken } = require("../verifyToken");
router.post("/sellbook", verifyToken, upload.single("image"), Sellbook);
router.get("/:id", getBookById);
router.get("/", getAllBooks);
router.post("/buybook", buyBook);

module.exports = router;
