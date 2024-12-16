const express = require("express");
const router = express.Router();
const templateSchema = require("../model/templateModel"); 

router.post("/create", async (req, res) => {
  try {
    const { name, template } = req.body;

    if (!name || !template) {
      return res.status(400).json({ status: false, message: "Name and template data are required." });
    }

    const newTemplate = await templateSchema.create({ name, template });
    res.status(201).json({ status: true, template: newTemplate });
  } catch (err) {
    console.error("Error creating template:", err);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});

router.get("/get-templates", async (req, res) => {
  try {
    const templates = await templateSchema.find();
    res.status(200).json({ status: true, templates });
  } catch (err) {
    console.error("Error fetching templates:", err);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const template = await templateSchema.findById(id);
    if (!template) {
      return res.status(404).json({ status: false, message: "Template not found." });
    }

    res.status(200).json({ status: true, template });
  } catch (err) {
    console.error("Error fetching template:", err);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, template } = req.body;

    if (!name || !template) {
      return res.status(400).json({ status: false, message: "Name and template data are required." });
    }

    const updatedTemplate = await templateSchema.findByIdAndUpdate(
      id,
      { name, template },
      { new: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ status: false, message: "Template not found." });
    }

    res.status(200).json({ status: true, template: updatedTemplate });
  } catch (err) {
    console.error("Error updating template:", err);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTemplate = await templateSchema.findByIdAndDelete(id);
    if (!deletedTemplate) {
      return res.status(404).json({ status: false, message: "Template not found." });
    }

    res.status(200).json({ status: true, message: "Template deleted successfully." });
  } catch (err) {
    console.error("Error deleting template:", err);
    res.status(500).json({ status: false, error: "Internal server error" });
  }
});

module.exports = router;
