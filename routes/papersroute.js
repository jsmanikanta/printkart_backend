import express from "express";
import { getPreviousYears } from "../controllers/previous.js";
import { verifyToken } from "../verifyToken.js";

const router = express.Router();

router.get('/previous-years', verifyToken, getPreviousYears); // Fixed middleware order

module.exports = router;
