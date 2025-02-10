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
  origin: (origin, callback) => {
    // If there is no origin (e.g. non-browser requests), allow it.
    if (!origin) return callback(null, true);
    // Otherwise, echo back the origin from the request.
    // This allows requests from any origin while using credentials.
    return callback(null, origin);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

console.log("refresh");
app.use(cors(corsOptions));

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
