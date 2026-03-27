const express = require("express");
const router = express.Router();

const { chatWithAI } = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ CHAT ROUTE
router.post("/", authMiddleware, chatWithAI);

module.exports = router;