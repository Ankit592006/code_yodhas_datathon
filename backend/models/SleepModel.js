const mongoose = require("mongoose");

const sleepSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    avg_sleep: Number
}, { timestamps: true });

module.exports = mongoose.model("Sleep", sleepSchema);