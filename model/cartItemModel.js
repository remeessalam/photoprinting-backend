const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    size: {
      type: String,
    },
    quantity: {
      type: mongoose.Schema.Types.Mixed,
    },
    imageFile: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
    },
    isBackgroundRemoved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CartItem", cartItemSchema);
