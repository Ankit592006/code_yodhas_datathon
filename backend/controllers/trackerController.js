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
        // 🔄 RESOLVE VALUES (PARTIAL SYNC)
        // =========================
        const isToday = (date) => {
            if (!date) return false;
            const d1 = new Date(date);
            const d2 = new Date();
            return d1.getFullYear() === d2.getFullYear() &&
                   d1.getMonth() === d2.getMonth() &&
                   d1.getDate() === d2.getDate();
        };

        const hasTodayEntry = user.moods.length > 0 && isToday(user.moods.at(-1).date);

        const getValidMood = (val) => {
            const validMoods = ["stressed","sad","happy","excited","neutral","celebrating","anxious"];
            if (val && validMoods.includes(val)) return val;
            return null;
        };

        const getValidNumber = (val) => {
            if (val !== undefined && val !== null && !isNaN(Number(val))) return Number(val);
            return null;
        };

        // 1. Resolve Mood
        let resolvedMood = getValidMood(mood);
        if (resolvedMood === null) {
            resolvedMood = (hasTodayEntry && user.moods.length > 0)
                ? getValidMood(user.moods.at(-1).emotion?.primary)
                : "neutral";
        }
        if (resolvedMood === null) {
            resolvedMood = "neutral";
        }

        // 2. Resolve Sleep
        let resolvedSleep = getValidNumber(sleepHours);
        if (resolvedSleep === null) {
            resolvedSleep = (hasTodayEntry && user.sleep.length > 0)
                ? getValidNumber(user.sleep.at(-1).avg_sleep)
                : 8;
        }
        if (resolvedSleep === null) {
            resolvedSleep = 8;
        }

        // 3. Resolve Screen Time
        let resolvedScreen = getValidNumber(screenTime);
        if (resolvedScreen === null) {
            resolvedScreen = (hasTodayEntry && user.screenTime.length > 0)
                ? getValidNumber(user.screenTime.at(-1).screenTime)
                : 0;
        }
        if (resolvedScreen === null) {
            resolvedScreen = 0;
        }

        // 4. Resolve Steps
        let resolvedSteps = getValidNumber(stepCount);
        if (resolvedSteps === null) {
            resolvedSteps = (hasTodayEntry && user.activity.length > 0)
                ? getValidNumber(user.activity.at(-1).stepCount)
                : 0;
        }
        if (resolvedSteps === null) {
            resolvedSteps = 0;
        }

        // 5. Resolve AQI
        let resolvedAqi = getValidNumber(aqi);
        if (resolvedAqi === null) {
            resolvedAqi = user.activity.length > 0 ? getValidNumber(user.activity.at(-1).aqi) : 50;
        }
        if (resolvedAqi === null) {
            resolvedAqi = 50;
        }

        // =========================
        // 🤖 CALL ML MODEL (WITH TIMEOUT)
        // =========================
        let stress_score = 5;
        let risk_level = "moderate";

        try {
            const mlTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("ML_TIMEOUT")), 10000)
            );
            const mlCall = axios.post(
                "https://ai-stress-service.onrender.com/predict-stress",
                {
                    sleepHours: resolvedSleep,
                    screenTime: resolvedScreen,
                    stepCount: resolvedSteps,
                    aqi: resolvedAqi,
                    mood: resolvedMood
                }
            );
            const mlRes = await Promise.race([mlCall, mlTimeout]);
            stress_score = mlRes.data.stress_score ?? stress_score;
            risk_level = mlRes.data.risk_level ?? risk_level;
            console.log("🧠 ML OUTPUT:", stress_score, risk_level);
        } catch (mlErr) {
            console.warn("⚠️ ML call skipped:", mlErr.message, "— using fallback stress score");
        }

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
            try {
                await makeCall({
                    userId,
                    username: user.username,
                    stressLevel: stress_score,
                    situationType: "highstress"
                });
                console.log("📞 CALL TRIGGERED");
            } catch (twilioErr) {
                console.error("❌ Twilio Call Failed:", twilioErr.message);
            }
        }

        // =========================
        // 💾 SAVE OR UPDATE DATA (CONCURRENCY-SAFE updateOne)
        // =========================
        if (hasTodayEntry) {
            // Update today's entry — only touch the fields explicitly passed in req.body
            const moodIndex = user.moods.length - 1;
            const sleepIndex = user.sleep.length - 1;
            const screenIndex = user.screenTime.length - 1;
            const activityIndex = user.activity.length - 1;
            const stressIndex = user.stress.length - 1;

            const updateFields = {};
            // ONLY update mood if it was explicitly sent
            if (mood !== undefined && moodIndex >= 0) {
                updateFields[`moods.${moodIndex}.emotion.primary`] = resolvedMood;
            }
            // ONLY update sleep if it was explicitly sent
            if (sleepHours !== undefined && sleepIndex >= 0) {
                updateFields[`sleep.${sleepIndex}.avg_sleep`] = resolvedSleep;
            }
            // ONLY update screen time if explicitly sent
            if (screenTime !== undefined && screenIndex >= 0) {
                updateFields[`screenTime.${screenIndex}.screenTime`] = resolvedScreen;
            }
            // ONLY update steps if explicitly sent
            if (stepCount !== undefined && activityIndex >= 0) {
                updateFields[`activity.${activityIndex}.stepCount`] = resolvedSteps;
            }
            // Always update stress (recalculated from resolved values)
            if (stressIndex >= 0) {
                const existingStress = user.stress[stressIndex];
                const finalStressScore = Math.max(existingStress?.stress_score || 0, stress_score);
                const finalRiskLevel = finalStressScore >= 9 ? "high" : (finalStressScore >= 7 ? "medium" : normalizedRisk);

                updateFields[`stress.${stressIndex}.stress_score`] = finalStressScore;
                updateFields[`stress.${stressIndex}.risk_level`] = finalRiskLevel;
            } else {
                await User.updateOne({ _id: userId }, {
                    $push: {
                        stress: { stress_score: stress_score, risk_level: normalizedRisk, date: new Date() }
                    }
                });
            }

            if (Object.keys(updateFields).length > 0) {
                await User.updateOne({ _id: userId }, { $set: updateFields });
            }
        } else {
            // Create new entry for today
            await User.updateOne({ _id: userId }, {
                $push: {
                    sleep: { avg_sleep: resolvedSleep, date: new Date() },
                    screenTime: { screenTime: resolvedScreen, date: new Date() },
                    activity: { stepCount: resolvedSteps, aqi: resolvedAqi, date: new Date() },
                    moods: { emotion: { primary: resolvedMood }, date: new Date() },
                    stress: { stress_score: stress_score, risk_level: normalizedRisk, date: new Date() }
                }
            });
        }

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
