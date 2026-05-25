const User = require("../models/UserModel");
const axios = require("axios");

let lastWakeup = 0;
const wakeupRenderServices = () => {
    const now = Date.now();
    if (now - lastWakeup < 3 * 60 * 1000) return; // limit to once every 3 minutes
    lastWakeup = now;
    console.log("⚡ Ping Render services to keep them warm...");
    axios.get("https://ai-chat-service-w2yg.onrender.com/").catch(() => {});
    axios.get("https://ai-stress-service.onrender.com/").catch(() => {});
};

const getDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Non-blocking ping to Render services to wake them up
        wakeupRenderServices();

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Helper to check if a date is today
        const isToday = (date) => {
            if (!date) return false;
            const d1 = new Date(date);
            const d2 = new Date();
            return d1.getFullYear() === d2.getFullYear() &&
                   d1.getMonth() === d2.getMonth() &&
                   d1.getDate() === d2.getDate();
        };

        // =========================
        // 🔹 GET LAST ENTRIES (FILTERS FOR TODAY ONLY, ELSE RESET TO NEUTRAL)
        // =========================
        const latestMood = user.moods.at(-1);
        const latestSleep = user.sleep.at(-1);
        const latestScreen = user.screenTime.at(-1);
        const latestActivity = user.activity.at(-1);
        const latestStress = user.stress.at(-1);

        const mood = (latestMood && isToday(latestMood.date)) ? latestMood.emotion?.primary : "neutral";
        const sleepScore = (latestSleep && isToday(latestSleep.date)) ? latestSleep.avg_sleep : 0;
        const screen = (latestScreen && isToday(latestScreen.date)) ? latestScreen.screenTime : 0;
        const steps = (latestActivity && isToday(latestActivity.date)) ? latestActivity.stepCount : 0;
        const stress = (latestStress && isToday(latestStress.date)) ? latestStress.stress_score : 5;

        // =========================
        // 📊 CALCULATE SCORE
        // =========================
        let score = 0;

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
        // 📉 SLEEP VS STRESS & TREND
        // =========================
        // Deduplicate sleep entries — keep only the latest per calendar day, then take last 7 days
        const sleepByDay = new Map();
        for (const s of user.sleep) {
            if (!s.date) continue;
            const d = new Date(s.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            sleepByDay.set(key, s); // overwrites earlier entries — Map preserves insertion order, last wins
        }
        const uniqueSleepEntries = Array.from(sleepByDay.values()).slice(-7);

        const last7Sleep = uniqueSleepEntries;
        const last7Stress = user.stress.slice(-7);

        const sleepVsStress = last7Sleep.map((s, i) => ({
            sleep: s.avg_sleep || 0,
            stress: last7Stress[i]?.stress_score || 0
        }));

        const sleepTrend = last7Sleep.map(s => {
            const dateStr = s.date
                ? new Date(s.date).toLocaleDateString("en-US", { weekday: 'short' })
                : "Day";
            return {
                day: dateStr,
                hours: s.avg_sleep || 0
            };
        });

        // =========================
        // 🔥 STREAK
        // =========================
        let streak = 0;
        if (user.moods && user.moods.length > 0) {
            // Convert to YYYY-MM-DD local calendar strings
            const dates = user.moods.map(m => {
                const d = new Date(m.date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            });

            // Remove duplicates and sort descending (most recent first)
            const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));

            if (uniqueDates.length > 0) {
                const formatDate = (d) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                const todayStr = formatDate(new Date());
                
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = formatDate(yesterday);

                const mostRecentDateStr = uniqueDates[0];

                // Only calculate streak if the user checked in today or yesterday
                if (mostRecentDateStr === todayStr || mostRecentDateStr === yesterdayStr) {
                    streak = 1;
                    let current = new Date(mostRecentDateStr);

                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prev = new Date(uniqueDates[i]);
                        const diffTime = Math.abs(current - prev);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 1) {
                            streak++;
                            current = prev;
                        } else if (diffDays > 1) {
                            break;
                        }
                    }
                }
            }
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
                mood: mood,
                stress
            },
            moodTrend,
            sleepVsStress,
            sleepTrend,
            streak,
            insights,
            emergencyContact: user.emergencyContact || ""
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getDashboard };