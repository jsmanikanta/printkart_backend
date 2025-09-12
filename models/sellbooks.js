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
      "schools-TextBooks",
      "jee main/advance",
      "engg textbooks",
      "neet",
      "medical-textbooks",
      "b.com/b.sc",
      "gate",
      "cat",
      "bank exams",
      "rrb",
      "upsc",
      "others",
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
});

const Sellbooks = mongoose.model("Sellbooks", sellbooksschema);
module.exports = Sellbooks;
