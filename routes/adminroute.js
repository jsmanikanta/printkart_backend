const express = require("express");
const router = express.Router();
const path = require("path");

const users = require("../controllers/usercontroller");
const orders = require("../controllers/orderprints");
const verifyToken = require("../verifyToken"); 

router.get("/users", verifyToken, users.getAllUsersWithPrints);

router.get("/print-orders", verifyToken, orders.getAllPrintOrders);

// Expose uploads folder statically (should be added in your main app.js/server.js file)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

module.exports = router;
