const express = require("express");
const router = express.Router();

const {
  Sellbook,
  getBookById,
  getAllBooks,
  updateSoldStatus,
  bookOrdered,
} = require("../controllers/bookscontroller");

const { verifyToken } = require("../verifyToken");

router.post("/sellbook", verifyToken, Sellbook);
router.put("/updateSoldStatus/:bookId", verifyToken, updateSoldStatus);
router.get("/:id", getBookById);
router.get("/", getAllBooks);
router.post("/confirm-order", verifyToken, bookOrdered);

module.exports = router;
