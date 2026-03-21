import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    printOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prints",
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      default: "",
      trim: true,
    },
    razorpaySignature: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
  },
  { timestamps: true }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
