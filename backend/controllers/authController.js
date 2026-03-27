const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==============================
// 📝 SIGNUP
// ==============================
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // check if exists
        const exist = await User.findOne({ email });
        if (exist) {
            return res.status(400).json({ msg: "User already exists" });
        }

        // hash password
        const hashed = await bcrypt.hash(password, 10);

        // create user
        const user = await User.create({
            username: name,   // 🔥 FIX
            email,
            password: hashed
        });

        res.status(201).json({
            msg: "User created",
            userId: user._id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ==============================
// 🔑 LOGIN
// ==============================
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ msg: "Wrong password" });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET, // ✅ FIXED
            { expiresIn: "1d" }
        );

        res.json({
            msg: "Login success",
            token,
            userId: user._id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    registerUser,
    loginUser
};