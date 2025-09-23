const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  buyerid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  bookid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sellbooks",
    required: true,
  },
  review: {
    type: String,
  },
});

const OrderedBooks=mongoose.model("orderedbooks",orderSchema);
module.exports=OrderedBooks;