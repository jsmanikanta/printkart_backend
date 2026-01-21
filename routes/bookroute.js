const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {
  Sellbook,
} = require("../controllers/bookscontroller");

const { verifyToken } = require("../verifyToken");

router.post("/sellbook", verifyToken, upload.single("image"), Sellbook);
module.exports = router;
