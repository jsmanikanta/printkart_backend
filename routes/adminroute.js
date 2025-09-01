const express = require("express");
const router = express.Router();
const { getAllOrders, getOrderById } = require("../controllers/admin");
const { verifyToken, authorizeAdmin } = require("../verifyToken");

router.post("/printorders", verifyToken, authorizeAdmin, getOrderById);
router.get("printorders", verifyToken, authorizeAdmin, getAllOrders);
router.get("printorders/:orderId", verifyToken, authorizeAdmin, getOrderById);

module.exports = router;
