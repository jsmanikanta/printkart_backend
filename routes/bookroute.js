import express from "express";
import multer from "multer";

const router = express.Router();

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
router.get("/allbooks", getAllBooks);
router.get("/filter", getBooksByFilter);
router.get("/:id",verifyToken, getBookById);
router.patch("/:id/sold", verifyToken, updateSoldStatus);

module.exports = router;
