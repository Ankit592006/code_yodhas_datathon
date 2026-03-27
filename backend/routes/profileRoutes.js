
const express = require("express");
const router = express.Router();

const { getProfile } = require("../controllers/profileController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Correct route
router.get("/", authMiddleware, getProfile);

module.exports = router;