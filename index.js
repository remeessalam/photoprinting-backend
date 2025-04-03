const express = require("express");
const serverless = require("serverless-http");
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
  origin: [
    "https://mudralanka-react.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://copymudralanka-react-26is.vercel.app",
  ], // Replace with your frontend domain
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
// .connect(process.env.MONGOURL)
// "mongodb+srv://boostmysites:VitjZ6rnbbMxk3mf@cluster0.xbd4qdk.mongodb.net/photoprinting"
// "mongodb+srv://remeessalam:surumiremees1@cluster0.6ncimah.mongodb.net/photoprinting"
// {
//   serverSelectionTimeoutMS: 30000,
//   socketTimeoutMS: 45000,
// }
mongoose
  .connect(
    "mongodb+srv://boostmysites:VitjZ6rnbbMxk3mf@cluster0.xbd4qdk.mongodb.net/photoprinting",
    {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 85000,
    }
  )
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => console.log(`App listening on port ${PORT}!`));
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });

module.exports = app;

// module.exports = serverless(app);
