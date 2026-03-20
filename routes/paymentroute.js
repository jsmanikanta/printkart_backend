import express from "express";
import { verifyToken } from "../verifyToken.js";
import {
  createOrder,
  verifyPayment,
  paymentFailed,
} from "../controllers/paymentcontroller.js";

const router = express.Router();

router.post("/create-order", verifyToken, createOrder);
router.post("/verify-payment", verifyToken, verifyPayment);
router.post("/payment-failed", verifyToken, paymentFailed);

module.exports = router;
