const twilio = require("twilio");

let client;
const getTwilioClient = () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && !sid.startsWith("ACmock") && token && token !== "mocktoken") {
        if (!client) {
            client = new twilio(sid, token);
        }
        return client;
    }
    return null;
};

const makeCall = async (data) => {
    try {
        const User = require("../models/UserModel");
        const user = await User.findById(data.userId);

        let targetPhone = user?.emergencyContact || process.env.CARETAKER_PHONE;

        if (!targetPhone) {
            console.log("⚠️ No caretaker or emergency contact phone number configured.");
            return;
        }

        // Normalize to E.164 format (remove spaces, hyphens, parentheses)
        targetPhone = targetPhone.trim().replace(/[-\s()]/g, "");
        if (!targetPhone.startsWith("+")) {
            if (targetPhone.length === 10) {
                targetPhone = "+91" + targetPhone; // Default to India country code
            } else {
                targetPhone = "+" + targetPhone;
            }
        }

        // Build situation-specific message
        let alertMessage;
        if (data.situationType === "suicidal") {
            alertMessage = `Urgent alert. Your relative ${data.username} has expressed thoughts of suicide or self-harm during their mental health companion session. Please reach out to them immediately.`;
        } else if (data.situationType === "selfharm") {
            alertMessage = `Alert. Your relative ${data.username} has mentioned self-harm during their mental health companion session. Please check on them right away.`;
        } else if (data.situationType === "anxiety") {
            alertMessage = `Alert. Your relative ${data.username} appears to be experiencing severe anxiety or a panic attack during their mental health companion session. Please check on them.`;
        } else if (data.situationType === "highstress") {
            alertMessage = `Alert. Your relative ${data.username} is currently at a very high mental stress level. Their stress score is ${data.stressLevel} out of 10. We recommend checking on them soon.`;
        } else {
            alertMessage = `Alert. Your relative ${data.username} needs immediate mental health attention. Please reach out to them right away.`;
        }

        const twilioClient = getTwilioClient();
        if (!twilioClient) {
            console.log("\n==================================================");
            console.log("📱 [SIMULATED EMERGENCY CALL - DEMO MODE]");
            console.log("👉 To receive real calls, configure real Twilio credentials in backend/.env");
            console.log(`📞 Calling: ${targetPhone}`);
            console.log(`🗣️ Message: Hello. This is an automated mental health alert from MindBuddy.`);
            console.log(`   ${alertMessage}`);
            console.log(`   We strongly recommend you check on them immediately. Thank you.`);
            console.log("==================================================\n");
            return;
        }

        await twilioClient.calls.create({
            twiml: `
            <Response>
                <Say voice="alice">
                    Hello. This is an automated mental health alert from MindBuddy.
                </Say>
                <Pause length="1"/>
                <Say voice="alice">
                    ${alertMessage}
                </Say>
                <Pause length="1"/>
                <Say voice="alice">
                    We strongly recommend you check on them immediately. Thank you.
                </Say>
            </Response>
            `,
            to: targetPhone,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        console.log(`🚨 Real Twilio call triggered to: ${targetPhone} | Situation: ${data.situationType}`);
    } catch (error) {
        console.error("❌ Twilio Error:", error.message);
    }
};

module.exports = makeCall;