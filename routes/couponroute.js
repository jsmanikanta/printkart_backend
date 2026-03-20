import express from "express";
import { verifyCoupon } from "../controllers/couponstatus.js";
import { verifyToken } from "../verifyToken.js";

const router = express.Router();

router.post("/verify", verifyToken, verifyCoupon);

module.exports = router;
