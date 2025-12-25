import axios from "axios";

async function callLuxoraAI(question) {
    try {
        const response = await axios.post(
            "https://clinical-barbara-sherlock-ace-9a2f637d.koyeb.app/api/search",
            {
                query: question,
            },
            {
                timeout: 30000,
            }
        );

        return response.data;
    } catch (error) {
        console.error("Luxora AI error:", error.response?.data || error.message);
        throw new Error("AI service unavailable");
    }
}

export { callLuxoraAI };
