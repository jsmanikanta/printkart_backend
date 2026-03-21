const Razorpay = require("razorpay");
const Payment = require("../models/payments");
const PrintsImport = require("../models/prints");
const crypto = require("crypto");

const Prints = PrintsImport.default || PrintsImport;

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay keys missing in environment variables");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const { printOrderId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!printOrderId) {
      return res.status(400).json({
        success: false,
        message: "printOrderId is required",
      });
    }

    const printOrder = await Prints.findById(printOrderId);

    if (!printOrder) {
      return res.status(404).json({
        success: false,
        message: "Print order not found",
      });
    }

    if (!printOrder.userid || String(printOrder.userid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (printOrder.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this order",
      });
    }

    const originalAmount = Number(printOrder.originalprice || 0);
    const discountedAmount =
      printOrder.discountprice !== undefined &&
      printOrder.discountprice !== null &&
      printOrder.discountprice !== ""
        ? Number(printOrder.discountprice)
        : originalAmount;

    const finalAmount =
      discountedAmount > 0 ? discountedAmount : originalAmount;

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount",
      });
    }

    const amountInPaise = Math.round(finalAmount * 100);

    const existingPendingPayment = await Payment.findOne({
      printOrderId: printOrder._id,
      status: "created",
    });

    if (existingPendingPayment && printOrder.razorpayOrderId) {
      return res.status(200).json({
        success: true,
        message: "Existing Razorpay order found",
        key: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: printOrder.razorpayOrderId,
        amount: amountInPaise,
        currency: "INR",
        printOrderId: printOrder._id,
        paymentId: existingPendingPayment._id,
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `print_${printOrder._id}`,
      notes: {
        printOrderId: String(printOrder._id),
        userId: String(userId),
      },
    });

    const payment = await Payment.create({
      userId,
      printOrderId: printOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount: originalAmount,
      discount: Math.max(originalAmount - finalAmount, 0),
      finalAmount,
      currency: "INR",
      status: "created",
    });

    printOrder.razorpayOrderId = razorpayOrder.id;
    printOrder.paymentMethod = "Razorpay";
    printOrder.paymentStatus = "pending";
    await printOrder.save();

    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      printOrderId: printOrder._id,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message,
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const {
      printOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !printOrderId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details",
      });
    }

    const printOrder = await Prints.findById(printOrderId);

    if (!printOrder) {
      return res.status(404).json({
        success: false,
        message: "Print order not found",
      });
    }

    if (!printOrder.userid || String(printOrder.userid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (printOrder.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order: printOrder,
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "failed",
        },
      );

      printOrder.paymentStatus = "failed";
      printOrder.razorpayPaymentId = razorpay_payment_id;
      printOrder.razorpaySignature = razorpay_signature;
      printOrder.transactionId = razorpay_payment_id;
      await printOrder.save();

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "paid";
    await payment.save();

    printOrder.paymentStatus = "paid";
    printOrder.paymentMethod = "Razorpay";
    printOrder.razorpayOrderId = razorpay_order_id;
    printOrder.razorpayPaymentId = razorpay_payment_id;
    printOrder.razorpaySignature = razorpay_signature;
    printOrder.transactionId = razorpay_payment_id;
    await printOrder.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order: printOrder,
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during payment verification",
      error: error.message,
    });
  }
};

const paymentFailed = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const { printOrderId, razorpayOrderId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!printOrderId || !razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Missing order details",
      });
    }

    const printOrder = await Prints.findById(printOrderId);

    if (!printOrder) {
      return res.status(404).json({
        success: false,
        message: "Print order not found",
      });
    }

    if (!printOrder.userid || String(printOrder.userid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await Payment.findOneAndUpdate({ razorpayOrderId }, { status: "failed" });

    printOrder.paymentStatus = "failed";
    await printOrder.save();

    return res.status(200).json({
      success: true,
      message: "Payment marked as failed",
    });
  } catch (error) {
    console.error("paymentFailed error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};

module.exports = { createOrder, verifyPayment, paymentFailed };
