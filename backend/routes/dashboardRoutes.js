const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ CLEAN ROUTE
router.get("/", authMiddleware, getDashboard);

module.exports = router;