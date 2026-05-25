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

        let conclusion = "User shows balanced mental health indicators. Continue maintaining a healthy daily routine.";

        if (stressLevel > 7) {
            conclusion = "Warning: High stress index detected. We recommend practicing mindfulness exercises, lowering screen exposure, and reaching out to your emergency contacts or therapist.";
        } else if (sleepHours < 6) {
            conclusion = "Alert: Sleep duration is below the recommended 7-8 hours. Sleep deprivation is closely linked to higher anxiety and stress. Consider setting a manual bedtime routine.";
        }

        const doc = new PDFDocument({ margin: 40, size: "LETTER" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${username.split('@')[0]}_report.pdf`
        );

        doc.pipe(res);

        // --- 1. Header Banner ---
        doc.rect(40, 40, 532, 60).fill("#1A365D");
        doc.fillColor("#FFFFFF")
           .fontSize(18)
           .font("Helvetica-Bold")
           .text("MINDBUDDY SANCTUARY", 55, 52)
           .fontSize(10)
           .font("Helvetica")
           .text("CLINICAL BEHAVIOR & WELL-BEING REPORT", 55, 75);

        // --- 2. Report Details Card ---
        doc.rect(40, 115, 532, 70).fill("#F7FAFC");
        doc.rect(40, 115, 532, 70).stroke("#E2E8F0");

        doc.fillColor("#4A5568").fontSize(9).font("Helvetica-Bold").text("PATIENT ADDRESS / ID", 55, 125);
        doc.fillColor("#2D3748").fontSize(11).font("Helvetica").text(username, 55, 140);

        doc.fillColor("#4A5568").fontSize(9).font("Helvetica-Bold").text("GENERATION DATE", 320, 125);
        doc.fillColor("#2D3748").fontSize(11).font("Helvetica").text(new Date().toLocaleDateString("en-US", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }), 320, 140);

        doc.fillColor("#4A5568").fontSize(9).font("Helvetica-Bold").text("STATUS", 470, 125);
        const statusText = stressLevel >= 7 ? "ATTENTION" : "STABLE";
        const statusColor = stressLevel >= 7 ? "#E53E3E" : "#38A169";
        doc.fillColor(statusColor).fontSize(11).font("Helvetica-Bold").text(statusText, 470, 140);

        // --- 3. Key Metrics Section ---
        doc.fillColor("#1A365D").fontSize(14).font("Helvetica-Bold").text("Key Wellness Metrics", 40, 205);
        doc.moveTo(40, 222).lineTo(572, 222).stroke("#E2E8F0");

        // Metrics Grid (2x2 Layout)
        const renderMetricCard = (title, value, unit, status, x, y, color) => {
            doc.rect(x, y, 256, 65).fill("#FFFFFF");
            doc.rect(x, y, 256, 65).stroke("#E2E8F0");
            // Accent bar on the left of each card
            doc.rect(x, y, 5, 65).fill(color);

            doc.fillColor("#718096").fontSize(9).font("Helvetica-Bold").text(title.toUpperCase(), x + 15, y + 12);
            doc.fillColor("#1A202C").fontSize(20).font("Helvetica-Bold").text(value, x + 15, y + 26);
            if (unit) {
                doc.fillColor("#718096").fontSize(10).font("Helvetica").text(unit, x + 15 + doc.widthOfString(value) + 4, y + 35);
            }
            doc.fillColor(color).fontSize(8).font("Helvetica-Bold").text(status, x + 15, y + 50);
        };

        const moodColor = mood === "stressed" || mood === "sad" || mood === "anxious" ? "#DD6B20" : "#38A169";
        const stressColor = stressLevel > 7 ? "#E53E3E" : stressLevel > 4 ? "#DD6B20" : "#38A169";
        const sleepColor = sleepHours < 6 ? "#E53E3E" : sleepHours < 7 ? "#DD6B20" : "#38A169";
        const screenColor = screenTime > 8 ? "#DD6B20" : "#38A169";

        renderMetricCard("Primary Mood State", mood.toUpperCase(), "", "LOGGED TODAY", 40, 235, moodColor);
        renderMetricCard("Stress Index Score", `${stressLevel}`, "/ 10", stressLevel > 7 ? "HIGH STRESS RISK" : stressLevel > 4 ? "MODERATE STRESS" : "HEALTHY BASELINE", 316, 235, stressColor);
        renderMetricCard("Sleep Duration", `${sleepHours}`, "hrs", sleepHours < 6 ? "INSUFFICIENT" : "ADEQUATE REST", 40, 312, sleepColor);
        renderMetricCard("Digital Screen Time", `${screenTime}`, "hrs/day", screenTime > 8 ? "EXCESSIVE EXPOSURE" : "HEALTHY SCREEN LIMIT", 316, 312, screenColor);

        // --- 4. Clinical Insights Section ---
        doc.fillColor("#1A365D").fontSize(14).font("Helvetica-Bold").text("Clinical Evaluation & Recommendations", 40, 400);
        doc.moveTo(40, 417).lineTo(572, 417).stroke("#E2E8F0");

        // Background box for clinical interpretation
        doc.rect(40, 430, 532, 100).fill("#F7FAFC");
        doc.rect(40, 430, 532, 100).stroke("#E2E8F0");

        doc.fillColor("#2D3748").fontSize(10).font("Helvetica-Oblique").text(
            "This automated report aggregates physiological inputs and cognitive companion chat data to analyze patterns of acute stress, anxiety, sleep wellness, and device usage boundaries. Our clinical AI interpreter concludes the following:",
            55, 442, { width: 502, align: "justify", lineGap: 3 }
        );

        doc.fillColor("#1A202C").fontSize(11).font("Helvetica-Bold").text(
            conclusion,
            55, 492, { width: 502, align: "left", lineGap: 2 }
        );

        // --- 5. Next Steps Section ---
        doc.fillColor("#1A365D").fontSize(14).font("Helvetica-Bold").text("Recommended Wellness Pathway", 40, 550);
        doc.moveTo(40, 567).lineTo(572, 567).stroke("#E2E8F0");

        const bulletPoint = (num, text, y) => {
            doc.circle(50, y + 6, 3.5).fill("#1A365D");
            doc.fillColor("#2D3748").fontSize(10).font("Helvetica").text(text, 65, y, { width: 507 });
        };

        bulletPoint(1, "Engage in guided box-breathing exercises via the Sanctuary interface during periods of peak stress.", 580);
        bulletPoint(2, "Establish a strict screen-time boundary of maximum 6 hours foreground application usage per day.", 610);
        bulletPoint(3, "Use manual sleep logs daily to ensure an average restful state of 7-8 hours per night.", 640);
        bulletPoint(4, "Consult with your Caretaker or Medical Therapist if stress levels consistently score above 7/10.", 670);

        // --- 6. Footer Signature ---
        doc.moveTo(40, 715).lineTo(572, 715).stroke("#E2E8F0");
        doc.fillColor("#A0AEC0").fontSize(8).font("Helvetica").text("CONFIDENTIAL - AUTOMATED HEALTH RECORD", 40, 725);
        doc.fillColor("#A0AEC0").fontSize(8).font("Helvetica").text("MINDBUDDY AI COMPANION PLATFORM © 2026", 410, 725);

        doc.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getReportData, downloadReport };