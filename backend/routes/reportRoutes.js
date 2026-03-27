const express = require("express");
const router = express.Router();

const { getReportData, downloadReport } = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ CLEAN ROUTES
router.get("/report-data", authMiddleware, getReportData);
router.get("/report", authMiddleware, downloadReport);

module.exports = router;