const redisClient = require("../config/redisClient");
const axios = require("axios");
const User = require("../models/UserModel");

// ==============================
// 🔥 FORMAT CHAT HISTORY
// ==============================
const formatChatHistory = (messages) => {
    return messages.map(msg => msg.text).join(". ");
};

// ==============================
// 💬 CHAT MESSAGE
// ==============================
const handleChat = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { message } = req.body;

        const key = `chat:${userId}`;

        let chatData = await redisClient.get(key);

        chatData = chatData ? JSON.parse(chatData) : {
            messages: [],
            stress: {
                stress_score: 0,
                risk_level: "low"
            },
            summary: ""
        };

        // ==============================
        // 🔥 FETCH USER DATA
        // ==============================
        const user = await User.findById(userId);

        const avg_sleep = user.sleep?.slice(-1)[0]?.avg_sleep || 0;
        const screen_time = user.screenTime?.slice(-1)[0]?.screenTime || 0;
        const stepCount = user.activity?.slice(-1)[0]?.stepCount || 0;
        const aqi = user.activity?.slice(-1)[0]?.aqi || 0;
        const mood = user.moods?.slice(-1)[0]?.emotion?.primary || "neutral";

        // ==============================
        // STORE USER MESSAGE
        // ==============================
        chatData.messages.push({
            role: "user",
            text: message,
            time: new Date()
        });

        // ==============================
        // 🔥 DECIDE ENDPOINT
        // ==============================
        const isFirstMessage = chatData.messages.length === 1;

        const endpoint = isFirstMessage
            ? "https://ai-chat-service-w2yg.onrender.com/startchat"
            : "https://ai-chat-service-w2yg.onrender.com/chat";

        // ==============================
        // 🔥 SAFE PAYLOAD
        // ==============================
        let payload = {
            message: message,
            stress_score: chatData.stress?.stress_score || 0,
            risk_level: chatData.stress?.risk_level || "low",
            sleepHours: avg_sleep || 0,
            screenTime: screen_time || 0,
            stepCount: stepCount || 0,
            aqi: aqi || 0,
            mood: mood || "neutral",
            chat_history: formatChatHistory(chatData.messages)
        };

        // only for startchat
        if (isFirstMessage) {
            payload.summary = chatData.summary || "";
        }

        const mlResponse = await axios.post(endpoint, payload);

        const { reply, stress_score, risk_level, summary } = mlResponse.data;

        // ==============================
        // STORE BOT RESPONSE
        // ==============================
        chatData.messages.push({
            role: "bot",
            text: reply,
            time: new Date()
        });

        // ==============================
        // UPDATE STATE
        // ==============================
        chatData.stress.stress_score = stress_score ?? chatData.stress.stress_score;
        chatData.stress.risk_level = risk_level ?? chatData.stress.risk_level;

        if (summary) {
            chatData.summary = summary;
        }

        // ==============================
        // SAVE TO REDIS
        // ==============================
        await redisClient.set(key, JSON.stringify(chatData), {
            EX: 3600
        });

        res.json({
            reply,
            stress_score,
            risk_level
        });

    } catch (err) {
        console.log("ML ERROR FULL:", err.response?.data);
        res.status(500).json({ error: err.message });
    }
};


// ==============================
// 🛑 END CHAT
// ==============================
const endChat = async (req, res) => {
    try {
        const userId = req.user.userId;
        const key = `chat:${userId}`;

        const chatDataRaw = await redisClient.get(key);

        if (!chatDataRaw) {
            return res.status(400).json({ msg: "No active chat" });
        }

        const chatData = JSON.parse(chatDataRaw);

        // ==============================
        // 🔥 CALL END-CHAT API
        // ==============================
        const mlResponse = await axios.post(
            "https://ai-chat-service-w2yg.onrender.com/end-chat",
            {
                chat_history: formatChatHistory(chatData.messages),
                stress_score: chatData.stress?.stress_score || 0,
                risk_level: chatData.stress?.risk_level || "low"
            }
        );

        const { summary, stress_score, risk_level } = mlResponse.data;

        // ==============================
        // SAVE TO DB
        // ==============================
        await User.findByIdAndUpdate(userId, {
            $push: {
                stress: {
                    stress_score: stress_score,
                    risk_level: risk_level,
                    date: new Date()
                },
                summary: [
  {
    text: summary,
    date: new Date()
  }
]
            }
        });

        await redisClient.del(key);

        res.json({
            msg: "Chat ended & saved"
        });

    } catch (err) {
        console.log("END CHAT ERROR:", err.response?.data);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    handleChat,
    endChat
};