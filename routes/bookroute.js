const express = require("express");

const router = express.Router();

const {
  Sellbook,
  upload,
  getBookById,
  getAllBooks,
} = require("../controllers/bookscontroller");

const { verifyToken } = require("../verifyToken");
router.post("/sellbook", verifyToken, upload.single("image"), Sellbook);
router.get("/:id", getBookById);
router.get("/", getAllBooks);

module.exports = router;
