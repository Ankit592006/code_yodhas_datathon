// const mongoose = require("mongoose");

// const moodSchema = new mongoose.Schema({
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     mood: String
// }, { timestamps: true });

// module.exports = mongoose.model("Mood", moodSchema);

const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    emotion: {
        primary: {
            type: String,
            required: true,
            enum: [
                "stressed",
                "sad",
                "happy",
                "excited",
                "neutral",
                "celebrating",
                "anxious"
            ]
        }
    }

}, { timestamps: true });

module.exports = mongoose.model("Mood", moodSchema);