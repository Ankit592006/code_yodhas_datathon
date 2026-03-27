const mongoose = require("mongoose");

const stressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stress_score: Number,
    risk_level: String
}, { timestamps: true });

module.exports = mongoose.model("Stress", stressSchema);