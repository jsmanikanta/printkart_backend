const express = require("express");
const app = express();
const router = express.Router();

const usercontrol = require("../controllers/usercontroller");
const { verifyToken } = require("../verifyToken");
const forgot = require("../controllers/forgotpassword");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
router.post("/register", usercontrol.Register);
router.post("/login", usercontrol.login);
router.get("/printorders", verifyToken, usercontrol.getPrintsById);
router.get("/soldbooks", verifyToken, usercontrol.getBooksSoldById);
router.post("/reset-password", forgot.resetPasswordWithoutOTP);

module.exports = router;
