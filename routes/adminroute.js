const express = require("express");
const router = express.Router();
const { getAllOrders, getAllBooks, updateStatus } = require("../controllers/admin");

router.get("/printorders", getAllOrders);
router.get("/booksforsale", getAllBooks);
router.post('/updatestatus', updateStatus)

module.exports = router;
