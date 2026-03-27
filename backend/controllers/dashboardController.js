const User = require("../models/UserModel");

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // =========================
        // 🔹 GET LAST ENTRIES
        // =========================
        const latestMood = user.moods.at(-1);
        const latestSleep = user.sleep.at(-1);
        const latestScreen = user.screenTime.at(-1);
        const latestActivity = user.activity.at(-1);
        const latestStress = user.stress.at(-1);

        // =========================
        // 📊 CALCULATE SCORE
        // =========================
        let score = 0;

        // const sleepScore = latestSleep?.hours || 0;
        // const steps = latestActivity?.steps || 0;
        // const screen = latestScreen?.hours || 0;
        // const stress = latestStress?.value || 0;
        const sleepScore = latestSleep?.avg_sleep || 0;
        const steps = latestActivity?.stepCount || 0;
        const screen = latestScreen?.screenTime || 0;
        const stress = latestStress?.stress_score || 0;
        const mood = latestMood?.emotion?.primary || "neutral";

        score += Math.min(sleepScore * 10, 30);
        score += Math.min(steps / 300, 30);
        score += screen < 6 ? 20 : 10;
        score += stress < 5 ? 20 : 5;

        score = Math.min(Math.round(score), 100);

        // =========================
        // 📈 MOOD TREND
        // =========================
       const moodTrend = user.moods.slice(-7).map(item => ({
            date: item.date,
            mood: item.emotion?.primary || "neutral"
}));

        // =========================
        // 📉 SLEEP VS STRESS
        // =========================
        const last7Sleep = user.sleep.slice(-7);
        const last7Stress = user.stress.slice(-7);

        const sleepVsStress = last7Sleep.map((s, i) => ({
            sleep: s.hours || 0,
            stress: last7Stress[i]?.value || 0
        }));

        // =========================
        // 🔥 STREAK
        // =========================
        let streak = 0;
        for (let i = user.moods.length - 1; i >= 0; i--) {
            if (user.moods[i]) streak++;
            else break;
        }

        // =========================
        // 🤖 INSIGHTS
        // =========================
        const insights = [];

        if (sleepScore < 6.5) {
            insights.push({
                title: "Sleep Pattern Alert",
                message: "Sleep is below recommended level"
            });
        }

        if (screen > 6) {
            insights.push({
                title: "Screen Time High",
                message: "Reduce screen time"
            });
        }

        if (stress > 7) {
            insights.push({
                title: "High Stress",
                message: "Consider meditation"
            });
        }

        // =========================
        // 📦 RESPONSE
        // =========================
        res.json({
            score,
            stats: {
                sleepHours: sleepScore,
                steps,
                screenTime: screen,
                mood: latestMood?.value || "neutral",
                stress
            },
            moodTrend,
            sleepVsStress,
            streak,
            insights
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getDashboard };