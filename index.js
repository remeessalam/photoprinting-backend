const express = require("express");
const serverless = require("serverless-http");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const user = require("./routes/user");
const cart = require("./routes/cart");
const template = require("./routes/template");
const cors = require("cors");
const https = require("https");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
app.use(express.json());

app.use(bodyParser.json());
const corsOptions = {
  origin: [
    "https://mudralanka-react.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://copymudralanka-react-26is.vercel.app",
    "https://backend.mudralanka.com/",
  ],
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
const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;

// Check if SSL certificates exist
// const keyPath = "/etc/ssl/photoprinting/private.key";
// const certPath = "/etc/ssl/photoprinting/certificate.crt";
// let sslAvailable = false;

// try {
//   if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
//     sslAvailable = true;
//   }
// } catch (err) {
//   console.log("SSL certificates not found, running in HTTP mode only");
// }

mongoose
  .connect(
    "mongodb+srv://boostmysites:VitjZ6rnbbMxk3mf@cluster0.xbd4qdk.mongodb.net/photoprinting?retryWrites=true&w=majority",
    {
      serverSelectionTimeoutMS: 5000, // Reduce timeout for faster failure detection
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Limit connections for serverless
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false, // Disable buffering for serverless
    }
  )
  .then(() => {
    console.log("Database connected");

    // Start HTTP server
    app.listen(HTTP_PORT, () =>
      console.log(`HTTP server listening on port ${HTTP_PORT}!`)
    );

    // Start HTTPS server if certificates are available
    // if (sslAvailable) {
    //   const httpsOptions = {
    //     key: fs.readFileSync(keyPath),
    //     cert: fs.readFileSync(certPath),
    //   };

    //   https
    //     .createServer(httpsOptions, app)
    //     .listen(HTTPS_PORT, "0.0.0.0", () => {
    //       console.log(`HTTPS server listening on port ${HTTPS_PORT}!`);
    //     });
    // }
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
  });

module.exports = app;
// app.use("/.netlify/index", router);
module.exports.handler = serverless(app);
