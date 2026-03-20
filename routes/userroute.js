import express from "express";

import usercontrol from "../controllers/usercontroller.js";
import { verifyToken } from "../verifyToken.js";
import forgot from "../controllers/forgotpassword.js";

const router = express.Router();

router.post("/register", usercontrol.Register);
router.post("/login", usercontrol.login);
router.get("/printorders", verifyToken, usercontrol.getPrintsById);
router.post("/reset-password", forgot.resetPasswordWithoutOTP);
router.get("/profile", verifyToken, usercontrol.getProfile);
router.patch("/profile/update", verifyToken, usercontrol.updateProfile);
router.get("/mybooks", verifyToken, usercontrol.getBooksById);

module.exports = router;
