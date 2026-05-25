
const express = require("express");
const router = express.Router();

const { getProfile, updateEmergencyContact } = require("../controllers/profileController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Correct routes
router.get("/", authMiddleware, getProfile);
router.put("/emergency-contact", authMiddleware, updateEmergencyContact);

module.exports = router;