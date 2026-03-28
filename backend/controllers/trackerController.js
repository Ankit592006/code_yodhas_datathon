const axios = require("axios");
const User = require("../models/UserModel");
const makeCall = require("../utils/twilioService"); // ✅ ADD

const addDailyData = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            mood,
            sleepHours,
            screenTime,
            stepCount,
            aqi
        } = req.body;

        // =========================
        // 🔍 CHECK USER
        // =========================
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // =========================
        // 🤖 CALL ML MODEL (FIXED)
        // =========================
        const mlRes = await axios.post(
            "https://ai-stress-service.onrender.com/predict-stress",
            {
                sleepHours: sleepHours,
                screenTime: screenTime,
                stepCount: stepCount,
                aqi: aqi,
                mood: mood
            }
        );

        const { stress_score, risk_level } = mlRes.data;

        console.log("🧠 ML OUTPUT:", stress_score, risk_level);

        // =========================
        // 🔥 NORMALIZE RISK LEVEL
        // =========================
        let normalizedRisk = (risk_level || "").toLowerCase();

        // 🔥 FIX: handle ML "critical"
        if (normalizedRisk === "critical") {
            normalizedRisk = "high";
        }

        // =========================
        // 🚨 TRIGGER CALL
        // =========================
        if (stress_score >= 9 || normalizedRisk === "high") {
            console.log("🚨 HIGH STRESS DETECTED");

            await makeCall({
                userId,
                username: user.username,
                stressLevel: stress_score
            });

            console.log("📞 CALL TRIGGERED");
        }

        // =========================
        // 💾 SAVE DATA
        // =========================
        user.sleep.push({
            avg_sleep: sleepHours
        });

        user.screenTime.push({
            screenTime: screenTime
        });

        user.activity.push({
            stepCount: stepCount,
            aqi: aqi
        });

        user.moods.push({
            emotion: { primary: mood }
        });

        user.stress.push({
            stress_score: stress_score,
            risk_level: normalizedRisk // ✅ FIXED
        });

        await user.save();

        // =========================
        // 📦 RESPONSE
        // =========================
        res.json({
            message: "Daily data + ML stored ✅",
            output: {
                stress_score,
                risk_level
            }
        });

    } catch (err) {
        console.error("❌ Tracker Error:", err.response?.data || err.message);

        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
};

module.exports = { addDailyData };
