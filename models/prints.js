const mongoose = require("mongoose");

const printSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  file: { type: String, required: true },
  price: { type: Number, required: true },
  color: { type: String, enum: ["b/w", "colour", "both"], required: true },
  sides: { type: String, enum: ["1", "2"], required: true },
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
  transctionid: { type: String, required: true }, 
  orderDate: { type: Date, default: Date.now },
  deliveryDate: { type: Date },
});

const Prints = mongoose.model("Prints", printSchema);

module.exports = Prints;
