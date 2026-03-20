import express from "express";
import {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  isBookWishlisted,
  toggleWishlist,
} from "../controllers/wishlistcontroller.js";

import { verifyToken } from "../verifyToken.js";

const router = express.Router();

router.post("/add", verifyToken, addToWishlist);
router.delete("/remove/:bookId", verifyToken, removeFromWishlist);
router.get("/my", verifyToken, getMyWishlist);
router.get("/check/:bookId", verifyToken, isBookWishlisted);
router.post("/toggle", verifyToken, toggleWishlist);

module.exports = router;
