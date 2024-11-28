const express = require("express");
const router = express.Router();
const CartItem = require("../model/cartItemModel");
const User = require("../model/userModel");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME, // your Cloudinary cloud name
  api_key: process.env.API_KEY, // your Cloudinary API key
  api_secret: process.env.API_SECRET, // your Cloudinary API secret
});

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
router.post("/create", async (req, res) => {
  try {
    const { userId, size, quantity, amount, category, brand } = req.body;
    console.log(req.body);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const validationError = validateFieldsByCategory(category, req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "auto",
          public_id: `cart_items/${userId}_${Date.now()}`,
          folder: "cart_items/",
          allowed_formats: ["jpg", "png", "jpeg", "gif"],
        },
        async (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return res
              .status(500)
              .json({ error: "Error uploading image to Cloudinary" });
          }

          const imageUrl = result.secure_url;

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
            return res.status(404).json({ error: "User not found" });
          }

          user.cartItems.push(newCartItem._id);
          await user.save();

          const cartItem = await CartItem.findById(newCartItem._id).select(
            "-createdAt -updatedAt"
          );
          console.log(cartItem, "cart item created");
          return res.status(201).json({
            message: "Item added to cart successfully",
            cartItem: cartItem,
          });
        }
      )
      .end(file.buffer);
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: "error", err: err });
  }
});

// get cart
router.get("/get/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).populate("cartItems");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ cartItems: user.cartItems });
  } catch (err) {
    console.error("Error fetching cart items:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// update cart
router.put("/update/:cartItemId", async (req, res) => {
  try {
    const cartItemId = req.params.cartItemId;
    const { size, quantity, imageFile, amount, category, brand } = req.body;

    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) {
      return res.status(404).json({ error: "cartitem not found" });
    }

    if (category) cartItem.category = category;
    if (size) cartItem.size = size;
    if (quantity) cartItem.quantity = quantity;
    if (imageFile) cartItem.imageFile = imageFile;
    if (amount) cartItem.amount = amount;
    if (brand) cartItem.brand = brand;

    await cartItem.save();

    return res.status(200).json({ message: "cart item updated", cartItem });
  } catch (err) {
    console.error("erro in updateing:", err);
    return res.status(500).json({ error: "error" });
  }
});

// remove item from cart
router.delete("/delete/:cartItemId", async (req, res) => {
  try {
    const cartItemId = req.params.cartItemId;

    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    const user = await User.findById(cartItem.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.cartItems.pull(cartItemId);
    await user.save();

    await cartItem.remove();

    return res.status(200).json({ message: "cart item deleted" });
  } catch (err) {
    console.error("err:", err);
    return res.status(500).json({ error: "error" });
  }
});

module.exports = router;
