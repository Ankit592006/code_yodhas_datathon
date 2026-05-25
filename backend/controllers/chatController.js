const redisClient = require("../config/redisClient");
const axios = require("axios");
const User = require("../models/UserModel");
const makeCall = require("../utils/twilioService");

// ==============================
// 🧠 IN-MEMORY FALLBACK WHEN REDIS IS DOWN
// ==============================
const inMemoryChatStore = new Map();

const getChatData = async (key) => {
    try {
        const raw = await redisClient.get(key);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    // Fall back to in-memory store
    return inMemoryChatStore.get(key) || { messages: [], stress: { stress_score: 0, risk_level: "low" }, summary: "" };
};

const setChatData = async (key, data) => {
    try {
        await redisClient.set(key, JSON.stringify(data), { EX: 3600 });
    } catch (_) {}
    // Always also set in-memory (acts as fallback)
    inMemoryChatStore.set(key, data);
};

const delChatData = async (key) => {
    try {
        await redisClient.del(key);
    } catch (_) {}
    inMemoryChatStore.delete(key);
};

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
        const chatData = await getChatData(key);

        // ==============================
        // 🔥 FETCH USER DATA
        // ==============================
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const avg_sleep = user.sleep?.slice(-1)[0]?.avg_sleep || 0;
        const screen_time = user.screenTime?.slice(-1)[0]?.screenTime || 0;
        const stepCount = user.activity?.slice(-1)[0]?.stepCount || 0;
        const aqi = user.activity?.slice(-1)[0]?.aqi || 0;
        const mood = user.moods?.slice(-1)[0]?.emotion?.primary || "neutral";

        // ==========================================
        // 🚨 IMMEDIATE CRISIS DETECTION (SAFETY FIRST)
        // ==========================================
        const detectSituation = (msg) => {
            if (!msg) return null;
            const lower = msg.toLowerCase();
            const suicidalKw = [
                "suicide", "suicidal", "sucidal", "kill myself", "end my life", "want to die",
                "commit suicide", "wanna die", "better off dead", "don't want to live",
                "ending my life", "killing myself"
            ];
            const selfharmKw = [
                "self harm", "self-harm", "selfharm", "hurt myself", "cut myself", "harming myself",
                "cutting myself", "burn myself"
            ];
            const anxietyKw = [
                "panic attack", "panick attack", "panicking", "can't breathe", "heart is racing",
                "anxiety attack", "severe anxiety", "hyperventilating", "freaking out",
                "losing my mind", "going crazy", "can't calm down", "shaking uncontrollably",
                "anxiety", "panic"
            ];
            if (suicidalKw.some(k => lower.includes(k))) return "suicidal";
            if (selfharmKw.some(k => lower.includes(k))) return "selfharm";
            if (anxietyKw.some(k => lower.includes(k))) return "anxiety";
            return null;
        };

        const situationFromMessage = detectSituation(message);
        let crisisTriggered = false;
        let forcedStressScore = 5;
        let forcedRiskLevel = "moderate";

        if (situationFromMessage) {
            console.log(`🚨 IMMEDIATE CRISIS DETECTED: ${situationFromMessage}. ALERTING CARER.`);
            crisisTriggered = true;
            forcedStressScore = 9;
            forcedRiskLevel = "high";

            // Trigger Twilio call immediately in background
            makeCall({ 
                userId, 
                username: user.username || "User", 
                stressLevel: 9, 
                situationType: situationFromMessage 
            }).catch((twilioErr) => {
                console.error("❌ Pre-ML Chat Twilio Call Failed:", twilioErr.message);
            });

            // Immediately save to DB User model so that the home page updates instantly
            try {
                await User.findByIdAndUpdate(userId, {
                    $push: {
                        stress: {
                            stress_score: 9,
                            risk_level: "high",
                            date: new Date()
                        }
                    }
                });
                console.log("💾 Immediate crisis stress levels saved to user profile database.");
            } catch (dbErr) {
                console.error("❌ Failed to save immediate crisis stress levels to DB:", dbErr.message);
            }
        }

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

        const payload = {
            message: message,
            stress_score: crisisTriggered ? 9 : (chatData.stress?.stress_score || 0),
            risk_level: crisisTriggered ? "high" : (chatData.stress?.risk_level || "low"),
            sleepHours: avg_sleep || 0,
            screenTime: screen_time || 0,
            stepCount: stepCount || 0,
            aqi: aqi || 0,
            mood: mood || "neutral",
            chat_history: formatChatHistory(chatData.messages),
            ...(isFirstMessage && { summary: chatData.summary || "" })
        };

        // ==============================
        // 🔥 CALL ML WITH DYNAMIC TIMEOUT (50s for first message cold-start, 25s for subsequent)
        // ==============================
        const timeoutMs = isFirstMessage ? 50000 : 25000;
        const mlTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ML_CHAT_TIMEOUT")), timeoutMs)
        );
        const mlCall = axios.post(endpoint, payload);
        const mlResponse = await Promise.race([mlCall, mlTimeout]);

        let { reply, stress_score, risk_level, summary } = mlResponse.data;

        // Force stress score to 9/10 and risk to high if any suicidal/self-harm/anxiety text was detected
        if (crisisTriggered) {
            stress_score = Math.max(stress_score || 0, 9);
            risk_level = "high";
        }

        // ==============================
        // STORE BOT RESPONSE
        // ==============================
        chatData.messages.push({
            role: "bot",
            text: reply,
            time: new Date()
        });

        chatData.stress.stress_score = stress_score ?? chatData.stress.stress_score;
        chatData.stress.risk_level = risk_level ?? chatData.stress.risk_level;
        if (summary) chatData.summary = summary;

        await setChatData(key, chatData);

        // =========================================================================
        // 🚨 EMERGENCY CALL ON ML RESPONSE (IF NOT ALREADY TRIGGERED BY KEYWORDS)
        // =========================================================================
        if (!crisisTriggered) {
            const isHighStress = (stress_score >= 9) || (risk_level === "high");
            if (isHighStress) {
                console.log("🚨 ML DETECTED HIGH STRESS. ALERTING CARER.");
                try {
                    await makeCall({ 
                        userId, 
                        username: user.username, 
                        stressLevel: stress_score || 9, 
                        situationType: "highstress" 
                    });
                } catch (twilioErr) {
                    console.error("❌ Post-ML Chat Twilio Call Failed:", twilioErr.message);
                }

                // Immediately save to DB User model so that the home page updates instantly
                try {
                    await User.findByIdAndUpdate(userId, {
                        $push: {
                            stress: {
                                stress_score: stress_score || 9,
                                risk_level: "high",
                                date: new Date()
                            }
                        }
                    });
                    console.log("💾 Post-ML crisis stress levels saved to user profile database immediately.");
                } catch (dbErr) {
                    console.error("❌ Failed to save Post-ML crisis stress levels to DB:", dbErr.message);
                }
            }
        }

        res.json({ reply, stress_score, risk_level });

    } catch (err) {
        if (err.message === "ML_CHAT_TIMEOUT") {
            return res.status(504).json({ error: "AI therapist is taking too long to respond. Please try again." });
        }
        console.log("ML ERROR FULL:", err.response?.data || err.message);
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

        const chatData = await getChatData(key);

        if (!chatData.messages || chatData.messages.length === 0) {
            return res.json({ msg: "No active chat to end" });
        }

        // ==============================
        // 🔥 CALL END-CHAT API (with timeout)
        // ==============================
        let summary = chatData.summary || "";
        let stress_score = chatData.stress?.stress_score || 0;
        let risk_level = chatData.stress?.risk_level || "low";

        try {
            const mlTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("ML_TIMEOUT")), 12000)
            );
            const mlCall = axios.post("https://ai-chat-service-w2yg.onrender.com/end-chat", {
                chat_history: formatChatHistory(chatData.messages),
                stress_score,
                risk_level
            });
            const mlResponse = await Promise.race([mlCall, mlTimeout]);
            summary = mlResponse.data.summary || summary;
            stress_score = mlResponse.data.stress_score ?? stress_score;
            risk_level = mlResponse.data.risk_level ?? risk_level;
        } catch (mlErr) {
            console.warn("⚠️ end-chat ML call skipped:", mlErr.message, "— saving session stress anyway");
        }

        // ==============================
        // SAVE TO DB (always runs, even if ML timed out)
        // ==============================
        const updateOp = {
            $push: {
                stress: { stress_score, risk_level, date: new Date() }
            }
        };
        if (summary) {
            updateOp.$push.summary = { text: summary, date: new Date() };
        }
        await User.findByIdAndUpdate(userId, updateOp);

        await delChatData(key);

        res.json({ msg: "Chat ended & saved", stress_score, risk_level });

    } catch (err) {
        console.log("END CHAT ERROR:", err.response?.data);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    handleChat,
    endChat
};