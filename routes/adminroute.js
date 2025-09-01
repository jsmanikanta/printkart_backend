const express = require("express");
const router = express.Router();
const { getOrderById } = require("../controllers/admin");
const { verifyToken, authorizeAdmin } = require("../verifyToken");

router.post("/admin/printorders", verifyToken, authorizeAdmin, getOrderById);

module.exports = router;
