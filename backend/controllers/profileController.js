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
                    currentStreak = 1;
                    let current = new Date(mostRecentDateStr);

                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prev = new Date(uniqueDates[i]);
                        const diffTime = Math.abs(current - prev);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 1) {
                            currentStreak++;
                            current = prev;
                        } else if (diffDays > 1) {
                            break;
                        }
                    }
                }
            }
        }

        // 🔥 score
        const latestSleep = user.sleep.at(-1)?.avg_sleep || 0;
        const latestStress = user.stress.at(-1)?.stress_score || 0;
        const latestMood = user.moods.at(-1)?.emotion?.primary || "neutral";

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
            emergencyContact: user.emergencyContact || "",
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

const updateEmergencyContact = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { emergencyContact } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { emergencyContact },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            message: "Emergency contact updated successfully",
            emergencyContact: user.emergencyContact
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getProfile, updateEmergencyContact };