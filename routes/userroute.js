const express = require("express");
const router = express.Router();

const usercontrol = require("../controllers/usercontroller");
const { verifyToken } = require("../verifyToken");
const forgot = require("../controllers/forgotpassword");

router.post("/register", usercontrol.Register);
router.post("/login", usercontrol.login);
router.get("/printorders", verifyToken, usercontrol.getPrintsById);
router.get("/soldbooks" ,verifyToken, usercontrol.getBooksSoldById);
router.post("/reset-password", forgot.resetPasswordWithoutOTP);

module.exports = router;
