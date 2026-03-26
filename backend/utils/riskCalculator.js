const calculateRisk = (data) => {
    const { stressLevel, sleepHours, mood } = data;

    if (
        stressLevel >= 8 ||
        sleepHours < 4 ||
        mood === "Stressed" ||
        mood === "Anxious"
    ) {
        return "HIGH";
    }

    if (stressLevel >= 5) {
        return "MODERATE";
    }

    return "STABLE";
};

module.exports = calculateRisk;