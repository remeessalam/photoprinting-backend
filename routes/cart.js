const express = require("express");
const router = express.Router();
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

const storage = multer.memoryStorage();
const upload = multer({ storage });

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
    const { userId, size, quantity, amount, category, brand } = req.body;
    console.log(req.body);
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ status: false, error: "No image file uploaded" });
    }

    const validationError = validateFieldsByCategory(category, req.body);
    if (validationError) {
      return res.status(400).json({ status: false, error: validationError });
    }

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

    const imageUrl = uploadResult.secure_url;

    const newCartItem = new CartItem({
      userId,
      size,
      quantity,
      imageFile: imageUrl,
      amount,
      category,
      brand,
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

    const user = await User.findById(userId).populate("cartItems");
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
      const { size, quantity, imageFile, amount, category, brand } = req.body;
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

module.exports = router;
