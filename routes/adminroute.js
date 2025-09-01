const express = require("express");
const router = express.Router();
const { getAllOrders } = require("../controllers/admin");
const { verifyToken, authorizeAdmin } = require("../verifyToken");

router.post("/admin/printorders", verifyToken, authorizeAdmin, getAllOrders);

module.exports = router;
