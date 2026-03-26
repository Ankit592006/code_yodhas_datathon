const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

const Data = require("../models/DataModel");

// 🔥 Import utils
const makeCall = require("../utils/twilioService");
const calculateRisk = require("../utils/riskCalculator");


// ✅ POST route
router.post("/data", async (req, res) => {
    try {
        const jsonData = req.body;

        // ===========================
        // ✅ CASE 1: Data from frontend
        // ===========================
        if (jsonData && Object.keys(jsonData).length > 0) {

            const saved = await Data.create(jsonData);

            // 🔥 Calculate risk
            const risk = calculateRisk(jsonData);
            console.log("Risk Level:", risk);

            // 🚨 Trigger call if HIGH
            if (risk === "HIGH") {
                await makeCall({
                    userId: jsonData.userId,
                    username: jsonData.username,
                    mood: jsonData.mood,
                    stressLevel: jsonData.stressLevel
                });
            }

            return res.json({
                message: "Data saved from frontend",
                data: saved,
                risk: risk
            });
        }

        // ===========================
        // ✅ CASE 2: Fallback CSV
        // ===========================
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

                const savedData = await Data.insertMany(results);

                // 🔥 Check risk for each entry
                for (let item of results) {
                    const risk = calculateRisk(item);

                    if (risk === "HIGH") {
                        await makeCall({
                            userId: item.userId,
                            username: item.username,
                            mood: item.mood,
                            stressLevel: item.stressLevel
                        });
                    }
                }

                res.json({
                    message: "Dummy CSV data inserted",
                    data: savedData
                });
            });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;