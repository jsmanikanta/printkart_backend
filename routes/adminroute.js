const express = require("express");
const router = express.Router();
const { getAllOrders, getOrderById } = require("../controllers/admin");
const { verifyToken, authorizeAdmin } = require("../verifyToken");

<<<<<<< HEAD
router.get("/printorders", getAllOrders);
=======
router.get("/printorders",getAllOrders);
>>>>>>> 4a91f2f21855751be4032ac4f66f9d9f390cfb70
router.get("/printorders/:orderId", verifyToken, authorizeAdmin, getOrderById);

module.exports = router;
