const http = require("http");
const express = require("express");
const app = express();
const server = http.createServer(app);
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const user = require("./routes/user");
const cart = require("./routes/cart");
const cors = require("cors");
require("dotenv").config();
app.use(express.json());
// Middleware
app.use(bodyParser.json());
app.use(cors());

// Use routes

app.use("/", user);
app.use("/cart", cart);

// Database connection and server start
const PORT = 7070;
mongoose
  .connect(process.env.MONGOURL)
  .then(() => {
    console.log("Database connected");
    server.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });
