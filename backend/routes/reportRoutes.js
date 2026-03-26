const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");

const Data = require("../models/DataModel");

// 📄 Generate Report
router.get("/report/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        // 🔥 Fetch latest user data
        const userData = await Data.findOne({ userId }).sort({ createdAt: -1 });

        if (!userData) {
            return res.status(404).json({ message: "No data found" });
        }

        const {
            username,
            mood,
            stressLevel,
            sleepHours,
            screenTime
        } = userData;

        // 🧠 Generate conclusion
        let conclusion = "User shows balanced mental health indicators.";

        if (stressLevel > 7) {
            conclusion = "User is experiencing high stress. Immediate attention recommended.";
        } else if (sleepHours < 6) {
            conclusion = "User sleep pattern is unhealthy and may affect mental well-being.";
        }

        // 📄 Create PDF
        const doc = new PDFDocument();

        // 🔥 Set headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${username}_report.pdf`
        );

        doc.pipe(res);

        // =========================
        // 🎨 PDF DESIGN
        // =========================

        doc.fontSize(20).text("Mental Health Report", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
        doc.moveDown(2);

        // Patient Info
        doc.fontSize(16).text("Patient Information");
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Username: ${username}`);
        doc.text(`Mood: ${mood}`);
        doc.text(`Stress Level: ${stressLevel} / 10`);
        doc.text(`Sleep Hours: ${sleepHours} hrs`);
        doc.text(`Screen Time: ${screenTime} hrs/day`);

        doc.moveDown(2);

        // Analysis
        doc.fontSize(16).text("Analysis & Findings");
        doc.moveDown();

        doc.fontSize(12);
        doc.text(
            `Stress Analysis: ${
                stressLevel > 7 ? "High stress detected" : "Stress level is manageable"
            }`
        );

        doc.text(
            `Sleep Analysis: ${
                sleepHours < 6 ? "Sleep is below recommended levels" : "Sleep is adequate"
            }`
        );

        doc.text(
            `Screen Time: ${
                screenTime > 8 ? "Excessive usage" : "Within normal limits"
            }`
        );

        doc.text(`Mood: User is feeling ${mood}`);

        doc.moveDown(2);

        // Conclusion
        doc.fontSize(16).text("Conclusion");
        doc.moveDown();

        doc.fontSize(12).text(conclusion);

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;