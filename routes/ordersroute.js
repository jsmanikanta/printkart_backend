const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const path = require("path");

const { upload, orderPrint } = require("../controllers/orderprints");
const { verifyToken } = require("../verifyToken");
// Route for order print: verify token and upload using memory storage
router.post("/orderprints", verifyToken, upload.single("file"), orderPrint);

router.post("/sendOrderEmail", async (req, res) => {
  const { pages, colorType, sideType, copies, spiral, transactionId, total } =
    req.body;

  if (
    !pages ||
    !colorType ||
    !sideType ||
    !copies ||
    !transactionId ||
    total === undefined
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Missing order details" });
  }

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const message = `
      New Print Order Received\n
      Pages: ${pages}\n
      Color: ${colorType}\n
      Sides: ${sideType}\n
      Copies: ${copies}\n
      Spiral Binding: ${spiral ? "Yes" : "No"}\n
      Transaction ID: ${transactionId}\n
      Total Amount: ₹${total}
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "manikanta13102006@gmail.com",
      subject: "New Print Order",
      text: message,
    });

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
