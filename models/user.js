const mongoose = require("mongoose");

const userschema = new mongoose.Schema({
  fullname: { type: String, required: true,unique: true },
  mobileNumber: { type: String, required: true,unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  birthday:{type: Date},
  location:{type:String},
  userType:{type: String,
            enum:["vendor","user"],
           }
});

const User = mongoose.model("user", userschema);

module.exports = User;
