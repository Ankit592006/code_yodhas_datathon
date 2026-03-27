const User = require("../models/UserModel");

const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // ==============================
        // 📊 CALCULATIONS
        // ==============================
        const totalCheckins = user.moods?.length || 0;

        // 🔥 streak
        let currentStreak = 0;

        if (user.moods && user.moods.length > 0) {
            const sorted = [...user.moods].sort(
                (a, b) => new Date(b.date) - new Date(a.date)
            );

            let prevDate = new Date(sorted[0].date);

            for (let i = 0; i < sorted.length; i++) {
                const currDate = new Date(sorted[i].date);

                const diff =
                    (prevDate - currDate) / (1000 * 60 * 60 * 24);

                if (i === 0 || diff <= 1) {
                    currentStreak++;
                    prevDate = currDate;
                } else break;
            }
        }

        // 🔥 score
        const latestSleep = user.sleep.at(-1)?.hours || 0;
        const latestStress = user.stress.at(-1)?.value || 0;
        const latestMood = user.moods.at(-1)?.value || "neutral";

        let score = 50;
        if (latestSleep >= 7) score += 15;
        if (latestStress <= 4) score += 15;
        if (latestMood === "happy") score += 20;

        if (score > 100) score = 100;

        const bestScore = score;

        // initials
        const initials = user.email
            ? user.email.substring(0, 2).toUpperCase()
            : "U";

        // member since
        const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric"
        });

        // ==============================
        // 📦 RESPONSE
        // ==============================
        res.json({
            username: user.email,
            initials,
            memberSince,
            stats: {
                totalCheckins,
                currentStreak,
                bestScore,
                aiChats: 23
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProfile };