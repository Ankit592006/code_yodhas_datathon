const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: String
}, { timestamps: true });

module.exports = mongoose.model("Summary", summarySchema);