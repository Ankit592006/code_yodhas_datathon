const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require("../controllers/authController");

// ✅ CLEAN ROUTES (NO LOGIC)
router.post("/signup", registerUser);
router.post("/login", loginUser);

module.exports = router;