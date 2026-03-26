const twilio = require("twilio");

const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const makeCall = async (data) => {
    try {
        await client.calls.create({
            twiml: `
            <Response>
                <Say voice="alice">
                    Hello. This is an automated mental health alert system.
                </Say>
                <Pause length="1"/>
                <Say voice="alice">
                    Your relative ${data.username} is currently at high mental stress risk.
                </Say>
                <Pause length="1"/>
                <Say voice="alice">
                    We strongly recommend you check on them immediately.
                </Say>
            </Response>
            `,
            to: process.env.CARETAKER_PHONE,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        console.log("🚨 Call triggered");
    } catch (error) {
        console.error("❌ Twilio Error:", error.message);
    }
};

module.exports = makeCall;