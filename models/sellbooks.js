const mongoose = require("mongoose");

const sellbooksschema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  condition: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  categeory: {
    type: String,
    enum: [
      "School Books",
      "IIT - JEE",
      "Engineering",
      "NEET UG/PG",
      "Medical",
      "B.sc & B.com",
      "GATE",
      "CAT",
      "Bank Exams",
      "RRP",
      "UPSC & APPSC",
      "Others",
    ],
    required: true,
  },
  selltype: {
    type: String,
    enum: ["sell", "donate"],
    required: true,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending",
  },
  updatedPrice: {
    type: Number,
  },
});

const Sellbooks = mongoose.model("Sellbooks", sellbooksschema);
module.exports = Sellbooks;
