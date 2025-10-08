const express = require("express");
const multer = require("multer");
const router = express.Router();

const { verifyToken } = require("../verifyToken");
const { orderPrint } = require("../controllers/orderprints");
const upload = multer({ storage: multer.memoryStorage() });
router.post("/orderprints", verifyToken, upload.single("file"), orderPrint);


module.exports = router;
