const calculateRisk = (data) => {
    const { stressLevel, sleepHours, mood } = data;
    const normalizedMood = mood ? mood.toLowerCase() : "";

    if (
        stressLevel >= 8 ||
        sleepHours < 4 ||
        normalizedMood === "stressed" ||
        normalizedMood === "anxious"
    ) {
        return "HIGH";
    }

    if (stressLevel >= 5) {
        return "MODERATE";
    }

    return "STABLE";
};

module.exports = calculateRisk;