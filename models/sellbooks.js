const mongoose = require("mongoose");

const sellbooksSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Book name is required"],
    trim: true,
  },
  image: {
    type: String,
    required: [true, "Book image is required"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
  },
  condition: {
    type: String,
    required: [true, "Book condition is required"],
    enum: ["New", "Like New", "Good", "Fair", "Poor"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    maxlength: [1000, "Description too long"],
  },
  location: {
    type: String,
    required: [true, "Location is required"],
  },
  category: {  // ✅ Fixed typo
    type: String,
    required: [true, "Category is required"],
    enum: [
      "School Books",
      "College & University Books",
      "Competitive Exam Books",
      "Fictional Books",
      "Novels & Storybooks",
      "Notes & Study Materials",
      "Previous Year Papers",
      "Non-Fiction Books",
      "GATE", "CAT", "IIT JEE", "PYQ books", "others"
    ],
  },
  subcategory: {  // ✅ Fixed typo & naming
    type: String,
  },
  selltype: {
    type: String,
    required: [true, "Sell type is required"],
    enum: ["sell", "donate"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",  // ✅ Fixed - matches User model
    required: [true, "User is required"],
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending",
  },
  updatedPrice: {
    type: Number,
    min: [0, "Updated price cannot be negative"],
  },
  soldstatus: {
    type: String,
    enum: ["Instock", "Soldout", "Ordered", "Rejected"],  // ✅ Fixed "Orderd"
    default: "Instock",
  },
  date_added: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,  // ✅ createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

module.exports = mongoose.model("Sellbooks", sellbooksSchema);
