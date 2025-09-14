const express = require("express");
const router = express.Router();
const { getAllOrders, getAllBooks, updateStatus } = require("../controllers/admin");

router.get("/printorders", getAllOrders);
router.get("/books", getAllBooks);
router.patch("/book/:bookId/status", updateStatus);

module.exports = router;
