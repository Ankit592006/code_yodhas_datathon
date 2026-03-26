const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    username: {   // ✅ NEW FIELD
        type: String,
        required: true
    },
    mood: {
        type: String,
        required: true
    },
    stressLevel: {
        type: Number,
        required: true
    },
    sleepHours: {
        type: Number,
        required: true
    },
    screenTime: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("HealthData", dataSchema);