const mongoose = require("mongoose");

const buybookschema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sellbooks",
    required: true,
  },
  bookSold: {
    type: Boolean,
    default: false,
  },
  quantity: {
    type: Number,
    default: 1,
  },
});

const Buybooks = mongoose.model("Buybooks", buybookschema);
module.exports = Buybooks;
