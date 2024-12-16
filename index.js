const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const user = require("./routes/user");
const cart = require("./routes/cart");
const template = require("./routes/template");
const cors = require("cors");
require("dotenv").config();
app.use(express.json());

app.use(bodyParser.json());
app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: "https://copymudralanka-react.vercel.app", // Allow only your frontend origin
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "Payload too large!" });
  } else {
    next(err);
  }
});

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});
app.use("/", user);
app.use("/cart", cart);
app.use("/templates", template);

// Database connection and server start
const PORT = 8080;
mongoose
  .connect(process.env.MONGOURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });

  module.exports = mongoose;