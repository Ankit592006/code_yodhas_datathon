const mongoose = require("mongoose");

const screenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    screenTime: Number,
    avg_screen_time: Number
}, { timestamps: true });

module.exports = mongoose.model("ScreenTime", screenSchema);