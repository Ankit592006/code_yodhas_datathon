// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const csv = require("csv-parser");
// const path = require("path");

// const Data = require("../models/DataModel");

// // 🔥 Import utils
// const makeCall = require("../utils/twilioService");
// const calculateRisk = require("../utils/riskCalculator");


// // ✅ POST route
// router.post("/data", async (req, res) => {
//     try {
//         const jsonData = req.body;

//         // ===========================
//         // ✅ CASE 1: Data from frontend
//         // ===========================
//         if (jsonData && Object.keys(jsonData).length > 0) {

//             const saved = await Data.create(jsonData);

//             // 🔥 Calculate risk
//             const risk = calculateRisk(jsonData);
//             console.log("Risk Level:", risk);

//             // 🚨 Trigger call if HIGH
//             if (risk === "HIGH") {
//                 await makeCall({
//                     userId: jsonData.userId,
//                     username: jsonData.username,
//                     mood: jsonData.mood,
//                     stressLevel: jsonData.stressLevel
//                 });
//             }

//             return res.json({
//                 message: "Data saved from frontend",
//                 data: saved,
//                 risk: risk
//             });
//         }

//         // ===========================
//         // ✅ CASE 2: Fallback CSV
//         // ===========================
//         const results = [];

//         fs.createReadStream(path.join(__dirname, "../dummy.csv"))
//             .pipe(csv())
//             .on("data", (data) => {
//                 results.push({
//                     userId: data.userId,
//                     username: data.username,
//                     mood: data.mood,
//                     stressLevel: parseInt(data.stressLevel),
//                     sleepHours: parseFloat(data.sleepHours),
//                     screenTime: parseFloat(data.screenTime)
//                 });
//             })
//             .on("end", async () => {

//                 const savedData = await Data.insertMany(results);

//                 // 🔥 Check risk for each entry
//                 for (let item of results) {
//                     const risk = calculateRisk(item);

//                     if (risk === "HIGH") {
//                         await makeCall({
//                             userId: item.userId,
//                             username: item.username,
//                             mood: item.mood,
//                             stressLevel: item.stressLevel
//                         });
//                     }
//                 }

//                 res.json({
//                     message: "Dummy CSV data inserted",
//                     data: savedData
//                 });
//             });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// ✅ Models
const User = require("../models/UserModel");
const Mood = require("../models/MoodModel");
const Sleep = require("../models/SleepModel");
const ScreenTime = require("../models/ScreenTimeModel");
const Stress = require("../models/StressModel");
const Activity = require("../models/ActivityModel");
const Summary = require("../models/SummaryModel");

// 🔐 JWT middleware
const authMiddleware = require("../middleware/authMiddleware");

// 🔥 Utils
const makeCall = require("../utils/twilioService");
const calculateRisk = require("../utils/riskCalculator");


// =====================================
// ✅ POST: SAVE ALL DATA
// =====================================
router.post("/data", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const jsonData = req.body;

        const {
            mood,
            sleepHours,
            screenTime,
            stressLevel,
            stepCount,
            aqi,
            summary
        } = jsonData;

        const risk = calculateRisk(jsonData);

        // =========================
        // 1️⃣ CREATE DOCUMENTS
        // =========================

        let moodDoc, sleepDoc, screenDoc, stressDoc, activityDoc, summaryDoc;

        if (mood) {
            moodDoc = await Mood.create({
                user: userId,
                emotion: { primary: mood }
            });
        }

        if (sleepHours) {
            sleepDoc = await Sleep.create({
                user: userId,
                sleepHours
            });
        }

        if (screenTime) {
            screenDoc = await ScreenTime.create({
                user: userId,
                screenTime
            });
        }

        if (stressLevel) {
            stressDoc = await Stress.create({
                user: userId,
                stress_score: stressLevel,
                risk_level: risk
            });
        }

        if (stepCount || aqi) {
            activityDoc = await Activity.create({
                user: userId,
                stepCount,
                aqi
            });
        }

        if (summary) {
            summaryDoc = await Summary.create({
                user: userId,
                text: summary
            });
        }

        // =========================
        // 2️⃣ PREPARE UPDATE OBJECT
        // =========================

        const updateFields = { $push: {} };

        if (moodDoc) {
            updateFields.$push.moods = {
                emotion: { primary: mood },
                refId: moodDoc._id
            };
        }

        if (sleepDoc) {
            updateFields.$push.sleep = {
                sleepHours,
                refId: sleepDoc._id
            };
        }

        if (screenDoc) {
            updateFields.$push.screenTime = {
                screenTime,
                refId: screenDoc._id
            };
        }

        if (stressDoc) {
            updateFields.$push.stress = {
                stress_score: stressLevel,
                risk_level: risk,
                refId: stressDoc._id
            };
        }

        if (activityDoc) {
            updateFields.$push.activity = {
                stepCount,
                aqi,
                refId: activityDoc._id
            };
        }

        if (summaryDoc) {
            updateFields.$push.summary = {
                text: summary,
                refId: summaryDoc._id
            };
        }

        // =========================
        // 3️⃣ UPDATE USER
        // =========================

        if (Object.keys(updateFields.$push).length > 0) {
            await User.findByIdAndUpdate(userId, updateFields);
        }

        // =========================
        // 🚨 CALL IF HIGH RISK
        // =========================

        if (risk === "HIGH") {
            const user = await User.findById(userId);

            await makeCall({
                userId,
                username: user.username,
                mood,
                stressLevel
            });
        }

        return res.json({
            message: "Data saved successfully",
            risk
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// ✅ OPTIONAL: CSV FALLBACK (NO JWT)
// =====================================
router.post("/data/csv", async (req, res) => {
    try {
        const results = [];

        fs.createReadStream(path.join(__dirname, "../dummy.csv"))
            .pipe(csv())
            .on("data", (data) => {
                results.push({
                    userId: data.userId,
                    username: data.username,
                    mood: data.mood,
                    stressLevel: parseInt(data.stressLevel),
                    sleepHours: parseFloat(data.sleepHours),
                    screenTime: parseFloat(data.screenTime)
                });
            })
            .on("end", async () => {
                res.json({
                    message: "CSV processed",
                    data: results
                });
            });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;