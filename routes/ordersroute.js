const express = require("express");
const multer = require("multer");
const router = express.Router();

const { verifyToken } = require("../verifyToken");
const { orderPrint } = require("../controllers/orderprints");
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/orderprints",
  verifyToken,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "transctionid", maxCount: 1 },
  ]),
  orderPrint
);
module.exports = router;
