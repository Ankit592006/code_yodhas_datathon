const User = require("../models/UserModel");

const getAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // =========================
        // 📅 LAST 30 DAYS DATA
        // =========================
        const moods = user.moods.slice(-30);
        const sleep = user.sleep.slice(-30);
        const screen = user.screenTime.slice(-30);
        const stress = user.stress.slice(-30);
        const activity = user.activity.slice(-30);

        // =========================
        // 📊 SCORE FUNCTION
        // =========================
        const calculateScore = (i) => {
            const s = sleep[i]?.hours || 0;
            const steps = activity[i]?.steps || 0;
            const scr = screen[i]?.hours || 0;
            const str = stress[i]?.value || 0;

            let score = 0;
            score += Math.min(s * 10, 30);
            score += Math.min(steps / 300, 30);
            score += scr < 6 ? 20 : 10;
            score += str < 5 ? 20 : 5;

            return Math.min(Math.round(score), 100);
        };

        // =========================
        // 📈 TREND
        // =========================
        const trend = moods.map((_, i) => ({
            day: `Day ${i + 1}`,
            score: calculateScore(i)
        }));

        // =========================
        // 📊 WEEKLY AVG
        // =========================
        const last7 = trend.slice(-7);
        const avgWeeklyScore =
            last7.reduce((sum, d) => sum + d.score, 0) / last7.length || 0;

        // =========================
        // 🏆 BEST DAY
        // =========================
        let bestDay = { score: 0, day: "" };

        trend.forEach((d, i) => {
            if (d.score > bestDay.score) {
                bestDay = {
                    score: d.score,
                    day: `Day ${i + 1}`
                };
            }
        });

        // =========================
        // 😊 MOOD CONSISTENCY
        // =========================
        const moodMap = {};
        moods.forEach(m => {
            const mood = m.value;
            moodMap[mood] = (moodMap[mood] || 0) + 1;
        });

        const maxMood = Math.max(...Object.values(moodMap || { 0: 0 }));
        const consistency = moods.length
            ? Math.round((maxMood / moods.length) * 100)
            : 0;

        // =========================
        // 📉 SCREEN VS STRESS
        // =========================
        const screenVsStress = screen.map((s, i) => ({
            screenTime: s.hours || 0,
            stress: stress[i]?.value || 0
        }));

        // =========================
        // 💤 SLEEP DISTRIBUTION
        // =========================
        let sleepDist = {
            poor: 0,
            fair: 0,
            good: 0,
            excellent: 0
        };

        sleep.forEach(s => {
            const h = s.hours || 0;

            if (h < 6) sleepDist.poor++;
            else if (h < 7) sleepDist.fair++;
            else if (h < 8) sleepDist.good++;
            else sleepDist.excellent++;
        });

        // =========================
        // 📜 TIMELINE
        // =========================
        const timeline = [];

        for (let i = 0; i < 4; i++) {
            const weekData = trend.slice(i * 7, (i + 1) * 7);

            const avg =
                weekData.reduce((s, d) => s + d.score, 0) / weekData.length || 0;

            let risk = "LOW";
            if (avg < 50) risk = "HIGH";
            else if (avg < 70) risk = "MODERATE";

            timeline.push({
                week: `Week ${i + 1}`,
                avgScore: Math.round(avg),
                risk
            });
        }

        // =========================
        // 📦 RESPONSE
        // =========================
        res.json({
            avgWeeklyScore: Math.round(avgWeeklyScore),
            bestDay,
            moodConsistency: consistency,
            trend,
            screenVsStress,
            sleepDistribution: sleepDist,
            timeline
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAnalytics };