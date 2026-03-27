const PDFDocument = require("pdfkit");
const User = require("../models/UserModel");

// =======================================
// 📊 GET REPORT DATA (FOR UI)
// =======================================
const getReportData = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // ✅ FIXED FIELD MAPPING
        const latestMood = user.moods.at(-1);
        const latestSleep = user.sleep.at(-1);
        const latestScreen = user.screenTime.at(-1);
        const latestStress = user.stress.at(-1);

        const mood = latestMood?.emotion?.primary || "neutral";
        const stressLevel = latestStress?.stress_score || 0;
        const sleepHours = latestSleep?.avg_sleep || 0;
        const screenTime = latestScreen?.screenTime || 0;

        let conclusion = "User shows balanced mental health indicators.";

        if (stressLevel > 7) {
            conclusion = "User is experiencing high stress.";
        } else if (sleepHours < 6) {
            conclusion = "Sleep is insufficient.";
        }

        res.json({
            username: user.email,
            mood,
            stressLevel,
            sleepHours,
            screenTime,
            conclusion,
            date: new Date().toLocaleDateString()
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// =======================================
// 📄 DOWNLOAD PDF REPORT
// =======================================
const downloadReport = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // ✅ FIXED FIELD MAPPING
        const latestMood = user.moods.at(-1);
        const latestSleep = user.sleep.at(-1);
        const latestScreen = user.screenTime.at(-1);
        const latestStress = user.stress.at(-1);

        const mood = latestMood?.emotion?.primary || "neutral";
        const stressLevel = latestStress?.stress_score || 0;
        const sleepHours = latestSleep?.avg_sleep || 0;
        const screenTime = latestScreen?.screenTime || 0;

        const username = user.email || "User";

        let conclusion = "User shows balanced mental health indicators.";

        if (stressLevel > 7) {
            conclusion = "High stress detected.";
        } else if (sleepHours < 6) {
            conclusion = "Low sleep detected.";
        }

        const doc = new PDFDocument();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${username}_report.pdf`
        );

        doc.pipe(res);

        doc.fontSize(20).text("Mental Health Report", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
        doc.moveDown(2);

        doc.fontSize(16).text("Patient Information");
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Username: ${username}`);
        doc.text(`Mood: ${mood}`);
        doc.text(`Stress Level: ${stressLevel} / 10`);
        doc.text(`Sleep Hours: ${sleepHours} hrs`);
        doc.text(`Screen Time: ${screenTime} hrs/day`);

        doc.moveDown(2);

        doc.fontSize(16).text("Analysis & Findings");
        doc.moveDown();

        doc.fontSize(12);
        doc.text(
            `Stress Analysis: ${
                stressLevel > 7 ? "High stress detected" : "Stress manageable"
            }`
        );

        doc.text(
            `Sleep Analysis: ${
                sleepHours < 6 ? "Below recommended" : "Adequate"
            }`
        );

        doc.text(
            `Screen Time: ${
                screenTime > 8 ? "Excessive" : "Normal"
            }`
        );

        doc.moveDown(2);

        doc.fontSize(16).text("Conclusion");
        doc.moveDown();

        doc.fontSize(12).text(conclusion);

        doc.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getReportData, downloadReport };