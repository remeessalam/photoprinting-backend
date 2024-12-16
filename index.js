const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const user = require("./routes/user");
const cart = require("./routes/cart");
const template = require('./routes/template');
const cors = require("cors");
require("dotenv").config();
app.use(express.json());

app.use(bodyParser.json());
app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});
app.use("/", user);
app.use("/cart", cart);
app.use('/template', template);

// Database connection and server start
const PORT = 7070;
mongoose
  .connect(process.env.MONGOURL)
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });
