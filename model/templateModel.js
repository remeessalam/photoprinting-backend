const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  base64_image: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("templates", templateSchema);
