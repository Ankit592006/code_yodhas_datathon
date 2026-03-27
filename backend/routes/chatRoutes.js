const express = require("express");
const router = express.Router();

const { handleChat, endChat } = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/chat", authMiddleware, handleChat);
router.post("/end-chat", authMiddleware, endChat);

module.exports = router;