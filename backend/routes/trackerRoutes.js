const express = require("express");
const router = express.Router();

const { addDailyData } = require("../controllers/trackerController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ CLEAN ROUTE
router.post("/daily", authMiddleware, addDailyData);

module.exports = router;