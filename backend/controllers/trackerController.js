const axios = require("axios");
const User = require("../models/UserModel");

const addDailyData = async (req, res) => {
    try {
        //const userId = req.user.id;
        const userId = req.user.userId; // ✅ from auth middleware

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
                avg_sleep: sleepHours,                 // ✅ number
                screen_time: screenTime,               // ✅ number
                activity: String(stepCount),           // 🔥 MUST BE STRING
                aqi: aqi,                              // ✅ number
                mood: mood                             // ✅ string
            }
        );

        const { stress_score, risk_level } = mlRes.data;

        // =========================
        // 💾 SAVE DATA (MATCH YOUR SCHEMA)
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
            //risk_level: risk_level
            risk_level: risk_level.toLowerCase()
        });

        await user.save();

        // =========================
        // 📦 RESPONSE
        // =========================
        res.json({
            message: "Daily data + ML stored ✅",
            input: {
                avg_sleep: sleepHours,
                screen_time: screenTime,
                activity: stepCount,
                aqi,
                mood
            },
            output: {
                stress_score,
                risk_level
            }
        });

    } catch (err) {
        console.error("Tracker Error:", err.response?.data || err.message);

        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
};

module.exports = { addDailyData };