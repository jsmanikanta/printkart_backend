const express = require("express");
const router = express.Router();
const { getAllOrders, getOrderById } = require("../controllers/admin");
const { verifyToken, authorizeAdmin } = require("../verifyToken");

router.get("/admin/printorders", verifyToken, authorizeAdmin, getAllOrders);
router.get(
  "/admin/printorders/:orderId",
  verifyToken,
  authorizeAdmin,
  getOrderById
);

module.exports = router;
