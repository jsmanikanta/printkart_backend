const express = require("express");
const router = express.Router();
const { getAllOrders, getOrderById } = require("../controllers/admin");
const { verifyToken, authorizeAdmin } = require("../verifyToken");
<<<<<<< HEAD
=======

>>>>>>> 79839eb14069558f997d514a89fda300ac555384
router.get("/printorders", verifyToken, authorizeAdmin, getAllOrders);
router.get("/printorders/:orderId", verifyToken, authorizeAdmin, getOrderById);

module.exports = router;
