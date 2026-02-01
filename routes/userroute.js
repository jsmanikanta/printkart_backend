const express = require("express");
const app = express();
const router = express.Router();
const path = require("path");

const usercontrol = require("../controllers/usercontroller");
const { verifyToken } = require("../verifyToken");
const forgot = require("../controllers/forgotpassword");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
router.post("/register", usercontrol.Register);
router.post("/login", usercontrol.login);
router.get("/printorders", verifyToken, usercontrol.getPrintsById);
router.post("/reset-password", forgot.resetPasswordWithoutOTP);
router.get("/profile", verifyToken, usercontrol.getProfile);
router.patch("/profile/:userId/update",verifyToken,usercontrol.updateProfile);

module.exports = router;
