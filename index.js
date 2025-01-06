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
const corsOptions = {
  // origin: ["https://copymudralanka-react.vercel.app", "http://localhost:3000"], // Replace with your frontend domain
  origin: ["https://mudralanka-react.vercel.app", "http://localhost:3000"], // Replace with your frontend domain
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies if needed
};
console.log("refresh");
app.use(cors(corsOptions)); // Use CORS with options

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});
app.use("/", user);
app.use("/cart", cart);
app.use("/templates", template);

// Database connection and server start
const PORT = 8080;
mongoose
  .connect(process.env.MONGOURL)
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });
