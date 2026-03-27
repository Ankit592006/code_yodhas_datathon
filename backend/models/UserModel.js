const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    // 🔐 AUTH
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    // 😊 MOOD
    moods: [{
        emotion: {
            primary: {
                type: String,
                required: true,
                enum: ["stressed","sad","happy","excited","neutral","celebrating","anxious"]
            }
        },
        refId: { type: mongoose.Schema.Types.ObjectId, ref: "Mood" },
        date: { type: Date, default: Date.now }
    }],

    // 😴 SLEEP
    sleep: [{
        //sleepHours: { type: Number, default: 0 },
        avg_sleep: { type: Number, default: 0 },
        refId: { type: mongoose.Schema.Types.ObjectId, ref: "Sleep" },
        date: { type: Date, default: Date.now }
    }],

    // 📱 SCREEN TIME
    screenTime: [{
        screenTime: { type: Number, default: 0 },
        avg_screen_time: { type: Number, default: 0 },
        refId: { type: mongoose.Schema.Types.ObjectId, ref: "ScreenTime" },
        date: { type: Date, default: Date.now }
    }],

    // 😵 STRESS
    stress: [{
        stress_score: Number,
        // risk_level: {
        //     type: String,
        //     enum: ["low", "moderate", "medium", "high"],
        // },
        risk_level: {
            type: String,
            enum: ["low", "moderate", "medium", "high"], // ✅ FIX
},
        refId: { type: mongoose.Schema.Types.ObjectId, ref: "Stress" },
        date: { type: Date, default: Date.now }
    }],

    // 🏃 ACTIVITY
    activity: [{
        stepCount: Number,
        aqi: Number,
        refId: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
        date: { type: Date, default: Date.now }
    }],

    // 📝 SUMMARY
    summary: [{
        text: String,
        refId: { type: mongoose.Schema.Types.ObjectId, ref: "Summary" },
        date: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);