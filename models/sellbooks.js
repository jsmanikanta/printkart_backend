import mongoose from "mongoose";

const sellbooksSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    condition: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      default: "",
      trim: true,
    },
    categeory: {
      type: String,
      enum: [
        "School Books (Class 1-12)",
        "College & University Books",
        "Competitive Exam Books",
        "Fictional Books",
        "Non-Fiction Books",
        "others",
      ],
      required: true,
    },
    subcategeory: {
      type: String,
      required: true,
      trim: true,
    },
    selltype: {
      type: String,
      enum: ["sell", "donate"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    updatedPrice: {
      type: Number,
      default: null,
    },
    soldstatus: {
      type: String,
      enum: ["Instock", "Soldout", "Orderd"],
      default: "Instock",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    soldcount: {
      type: Number,
      default: 0,
    },
    date_added: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Sellbooks =
  mongoose.models.Sellbooks || mongoose.model("Sellbooks", sellbooksSchema);

export default Sellbooks;
