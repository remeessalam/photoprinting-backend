const express = require("express");
const router = express.Router();
const userSchema = require("../model/userModel");

router.post("/login", async (req, res) => {
  console.log(req.body);

  try {
    const { id } = req.body;

    if (!id) {
      console.log("No browserid provided. Creating a new user.");
      const newUser = await userSchema.create({});
      return res.status(201).json({ user: newUser });
    }

    const existingUser = await userSchema.findOne({ _id: id });
    if (existingUser) {
      console.log(id, "old user found");
      return res.status(200).json({ user: existingUser });
    }
  } catch (err) {
    console.log("error-", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
