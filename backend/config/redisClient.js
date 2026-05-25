const { createClient } = require("redis");

const realClient = createClient({
    url: process.env.REDIS_URL
});

let useMemoryFallback = false;
const memoryDb = new Map();

realClient.on("connect", () => {
    console.log("✅ Redis connected");
    useMemoryFallback = false;
});

realClient.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
    useMemoryFallback = true;
});

(async () => {
    try {
        await realClient.connect();
    } catch (err) {
        console.error("❌ Redis connection failed:", err.message);
        useMemoryFallback = true;
    }
})();

const redisClient = {
    get: async (key) => {
        if (useMemoryFallback) {
            return memoryDb.get(key) || null;
        }
        try {
            return await realClient.get(key);
        } catch (err) {
            console.error("⚠️ Redis GET failed, using memory fallback:", err.message);
            useMemoryFallback = true;
            return memoryDb.get(key) || null;
        }
    },
    set: async (key, value, options) => {
        if (useMemoryFallback) {
            memoryDb.set(key, value);
            return "OK";
        }
        try {
            return await realClient.set(key, value, options);
        } catch (err) {
            console.error("⚠️ Redis SET failed, using memory fallback:", err.message);
            useMemoryFallback = true;
            memoryDb.set(key, value);
            return "OK";
        }
    },
    del: async (key) => {
        if (useMemoryFallback) {
            return memoryDb.delete(key) ? 1 : 0;
        }
        try {
            return await realClient.del(key);
        } catch (err) {
            console.error("⚠️ Redis DEL failed, using memory fallback:", err.message);
            useMemoryFallback = true;
            return memoryDb.delete(key) ? 1 : 0;
        }
    },
    on: (event, handler) => {
        realClient.on(event, handler);
    }
};

module.exports = redisClient;