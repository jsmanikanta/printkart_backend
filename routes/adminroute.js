const express = require("express");
const router = express.Router();
const path = require("path");

const users = require("../controllers/usercontroller");
const orders = require("../controllers/orderprints");
const verifyToken = require("../verifyToken"); 

router.get("/users", verifyToken, users.getAllUsersWithPrints);
router.get("/printorders", verifyToken, orders.getAllPrintOrders);


module.exports = router;
