const mongoose = require("mongoose");

const userschema = new mongoose.Schema({
  fullname: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userschema);

module.exports = User;
