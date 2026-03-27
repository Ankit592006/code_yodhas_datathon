const User = require("../models/UserModel");

const chatWithAI = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { message } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // =========================
        // 📊 USER CONTEXT
        // =========================
        const latestMood = user.moods.at(-1)?.value || "neutral";
        const latestSleep = user.sleep.at(-1)?.hours || 0;
        const latestStress = user.stress.at(-1)?.value || 0;

        // =========================
        // 🤖 AI RESPONSE LOGIC
        // =========================
        let reply = "";

        if (latestStress > 7) {
            reply = "I sense you're feeling quite stressed. Try taking a few deep breaths or a short break. I'm here for you 💙";
        } 
        else if (latestSleep < 6) {
            reply = "It looks like you haven’t been getting enough sleep. Proper rest can really improve how you feel.";
        } 
        else if (latestMood === "sad") {
            reply = "I'm really sorry you're feeling this way. Do you want to talk about what's bothering you?";
        } 
        else {
            reply = "I'm here to listen. Tell me more about how you're feeling 😊";
        }

        // =========================
        // 📦 RESPONSE
        // =========================
        res.json({
            userMessage: message,
            botReply: reply
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { chatWithAI };