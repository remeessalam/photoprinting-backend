const mongoose = require("mongoose");
const { type } = require("express/lib/response");

// Define the schema for templates
const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, 
      trim: true, 
    },
    template: {
      type: Object, 
      required: true, 
    }
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model("templates", templateSchema);
