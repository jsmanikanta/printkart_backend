const mongoose = require("mongoose");

const printSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  file: { type: String, required: true },
  originalprice: { type: Number, required: true },
  discountprice: { type: Number },
  color: { type: String, enum: ["b/w", "colour", "both"], required: true },
  sides: { type: String, enum: ["1", "2","2 per side","4 per side"], required: true },
  binding: {
    type: String,
    enum: ["none", "spiral", "stick", "soft", "book"],
    default: "none",
  },
  copies: { type: Number, required: true, default: 1 },
  address: { type: String },
  college: { type: String },
  year: { type: String },
  section: { type: String },
  rollno: { type: String },
  description: { type: String },
  userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  transctionid: { type: String },
  payment: {type: String ,required: true},
  orderDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: [
      "Order placed",
      "Verified",
      "Ready to dispatch",
      "Out for delivery",
      "Delivered",
      "Cancelled",
     
    ],
    default: "Order placed",
  },
});

const Prints = mongoose.model("Prints", printSchema);

module.exports = Prints;
