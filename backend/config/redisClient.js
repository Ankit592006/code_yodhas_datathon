const { createClient } = require("redis");

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("connect", () => {
    console.log("✅ Redis connected");
});

redisClient.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
});

(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error("❌ Redis connection failed:", err.message);
    }
})();

module.exports = redisClient;