import express from "express";
import multer from "multer";

import { verifyToken } from "../verifyToken.js";
import { orderPrint, cancelOrder } from "../controllers/orderprints.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/orderprints",
  verifyToken,
  upload.fields([{ name: "file", maxCount: 1 }]),
  orderPrint,
);
router.patch("/cancelorder/:orderId", verifyToken, cancelOrder);
module.exports = router;
