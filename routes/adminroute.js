const express = require("express");
const router = express.Router();
const { getAllOrders } = require("../controllers/admin");
const verifyToken = require("../verifyToken");

router.get("/admin/printorders", verifyToken, authorizeAdmin, getAllOrders);

module.exports = router;
