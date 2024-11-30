const express = require("express");
const router = express.Router();
const https = require("https");
const fs = require("fs");
const CartItem = require("../model/cartItemModel");
const User = require("../model/userModel");
require("dotenv").config();
const multer = require("multer");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
//for redeploy
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const validateFieldsByCategory = (category, data) => {
  if (category === "STICKER_PRINTING") {
    if (!data.userId || !data.size || !data.quantity || !data.amount) {
      return "all feilds require";
    }
  } else if (category === "PVC_ID_CARD") {
    if (!data.userId || !data.quantity || !data.amount) {
      return "all feilds require";
    }
  } else if (category === "VISITING_CARD") {
    if (!data.userId || !data.quantity || !data.amount) {
      return "all feilds require";
    }
  } else if (category === "MOBILE_CASE") {
    if (!data.userId || !data.brand || !data.amount) {
      return "all feilds require";
    }
  } else if (category === "BILLBOOK") {
    if (!data.userId || !data.size || !data.quantity || !data.amount) {
      return "all feilds require";
    }
  } else {
    return "category note found";
  }

  return null;
};
// add to cart
router.post("/create", upload.single("imageFile"), async (req, res) => {
  try {
    const {
      userId,
      size,
      quantity,
      amount,
      category,
      brand,
      imageUrl,
      isBackgroundRemoved,
    } = req.body;
    console.log(req.body);
    const file = req.file;

    if (!file && !imageUrl) {
      return res.status(400).json({ status: false, error: "please add image" });
    }

    const validationError = validateFieldsByCategory(category, req.body);
    if (validationError) {
      return res.status(400).json({ status: false, error: validationError });
    }

    let imageSource;

    if (file) {
      const uploadPromise = () =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              public_id: `cart_items/${userId}_${Date.now()}`,
              folder: "cart_items",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });

      const uploadResult = await uploadPromise();
      imageSource = uploadResult.secure_url;
    } else {
      imageSource = imageUrl;
    }

    const newCartItem = new CartItem({
      userId,
      size,
      quantity,
      imageFile: imageSource,
      amount,
      category,
      brand,
      isBackgroundRemoved,
    });

    await newCartItem.save();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, error: "User not found" });
    }

    user.cartItems.push(newCartItem._id);
    await user.save();

    const cartItem = await CartItem.findById(newCartItem._id).select(
      "-createdAt -updatedAt"
    );
    console.log(cartItem, "cart item created");

    return res.status(201).json({
      status: true,
      message: "Item added to cart successfully",
      cartItem: cartItem,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ status: false, error: "error", err: err });
  }
});

// cartitem get by id
router.get("/cartitembyid/:cartItemId", async (req, res) => {
  const cartItemId = req.params.cartItemId;

  try {
    const cartItem = await CartItem.findById(cartItemId);

    if (!cartItem) {
      return res.status(404).json({ status: false, error: "no cart founded" });
    }

    return res.status(200).json({ status: true, cartItem });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "error" });
  }
});

// get cart
router.get("/get/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).populate({
      path: "cartItems",
      options: { sort: { createdAt: -1 } },
    });
    if (!user) {
      return res.status(404).json({ status: false, error: "User not found" });
    }

    return res.status(200).json({ status: true, cartItems: user.cartItems });
  } catch (err) {
    console.error("Error fetching cart items:", err);
    return res
      .status(500)
      .json({ status: false, error: "Internal server error" });
  }
});

// update cart
router.put(
  "/update/:cartItemId",
  upload.single("imageFile"),
  async (req, res) => {
    try {
      const cartItemId = req.params.cartItemId;
      const { size, quantity, amount, category, brand, isBackgroundRemoved } =
        req.body;
      const file = req.file;
      console.log(req.body);
      let imageUrl;
      const validationError = validateFieldsByCategory(category, req.body);
      if (validationError) {
        return res.status(400).json({ status: false, error: validationError });
      }
      const cartItem = await CartItem.findById(cartItemId);
      if (!cartItem) {
        return res
          .status(404)
          .json({ status: false, error: "cartitem not found" });
      }

      const uploadPromise = () =>
        new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              public_id: `cart_items/${cartItem._id}_${Date.now()}`,
              folder: "cart_items",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );

          uploadStream.end(file.buffer);
        });
      if (file) {
        const uploadResult = await uploadPromise();
        imageUrl = uploadResult.secure_url;
        console.log("new image added");
      } else {
        imageUrl = cartItem.imageFile;
      }
      if (category) cartItem.category = category;
      if (size) cartItem.size = size;
      if (quantity) cartItem.quantity = quantity;
      if (file) cartItem.imageFile = imageUrl;
      if (amount) cartItem.amount = amount;
      if (brand) cartItem.brand = brand;
      if (isBackgroundRemoved)
        cartItem.isBackgroundRemoved = isBackgroundRemoved;

      await cartItem.save();

      return res
        .status(200)
        .json({ status: true, message: "cart item updated", cartItem });
    } catch (err) {
      console.error("erro in updateing:", err);
      return res.status(500).json({ status: false, error: "error" });
    }
  }
);

// remove item from cart
router.delete("/delete/:cartItemId", async (req, res) => {
  try {
    const cartItemId = req.params.cartItemId;

    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) {
      return res
        .status(404)
        .json({ status: false, error: "Cart item not found" });
    }

    const user = await User.findById(cartItem.userId);
    if (!user) {
      return res.status(404).json({ status: false, error: "User not found" });
    }

    user.cartItems.pull(cartItemId);
    await user.save();

    await CartItem.deleteOne({ _id: cartItemId });

    return res.status(200).json({ status: true, message: "cart item deleted" });
  } catch (err) {
    console.error("err:", err);
    return res.status(500).json({ status: false, error: "error" });
  }
});

router.post(
  "/removebackground",
  upload.single("imageFile"),
  async (req, res) => {
    try {
      const { imageUrl, cartItemId } = req.body;
      const file = req.file;

      if (!file && !imageUrl) {
        return res
          .status(400)
          .json({ status: false, error: "Please add an image" });
      }

      let imageSource;

      // Upload the image file to Cloudinary or use the provided image URL
      if (file) {
        const uploadPromise = () =>
          new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "remove_backround" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            );
            uploadStream.end(file.buffer);
          });

        imageSource = await uploadPromise();
      } else {
        imageSource = imageUrl;
      }

      console.log(process.env.PHOTOROOM_API, "thisisphotoroomapi");

      const editParams =
        "background.color=transparent&background.scaling=fill&outputSize=1000x1000&padding=0.1";
      const options = {
        hostname: "image-api.photoroom.com",
        port: 443,
        path: `/v2/edit?${editParams}&imageUrl=${encodeURIComponent(
          imageSource
        )}`,
        method: "GET",
        headers: {
          "x-api-key": process.env.PHOTOROOM_API,
        },
      };

      // Process the image via the PhotoRoom API and directly upload it to Cloudinary
      const processedImagePromise = () =>
        new Promise((resolve, reject) => {
          const cloudinaryUploadStream = cloudinary.uploader.upload_stream(
            { folder: "processed_images" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url); // Return the Cloudinary URL
            }
          );

          const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
              res.pipe(cloudinaryUploadStream); // Stream directly to Cloudinary
            } else {
              // console.log(res.statusCode, "htisisereroer");
              reject(
                new Error(`PhotoRoom API failed with status ${res.statusCode}`)
              );
            }
          });

          req.on("error", (error) => reject(error));
          req.end();
        });

      const processedImageUrl = await processedImagePromise();

      // Update cart item if cartItemId is provided
      if (cartItemId) {
        const cartItem = await CartItem.findById(cartItemId);

        if (!cartItem) {
          return res
            .status(404)
            .json({ status: false, error: "Cart item not found" });
        }

        cartItem.imageFile = processedImageUrl;
        await cartItem.save();
      }

      // Respond with success
      return res.status(200).json({
        status: true,
        message: "Background removed successfully",
        processedImageUrl,
      });
    } catch (error) {
      console.error("Failed to remove background", error);
      return res.status(500).json({ status: false, error: error.message });
    }
  }
);

module.exports = router;
