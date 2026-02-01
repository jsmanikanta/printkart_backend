const mongoose = require("mongoose");

const couponStatusSchema = new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  status: { type: Boolean, default: false },
  code: { type: String, required: true },
  discountPercentage: { type: Number, required: true },
  usedDate: { type: Date, default: null },

  // store user details when coupon is used
  userName: { type: String },
  userEmail: { type: String },
  userMobile: { type: String },
});

const Couponstatus = mongoose.model("Couponstatus", couponStatusSchema);

module.exports = Couponstatus;
