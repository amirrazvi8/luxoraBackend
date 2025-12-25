import { callLuxoraAI } from "../services/luxoraAI.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const productQuery = asyncHandler(async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: "No question provided." });

        try {
            const response = await callLuxoraAI(question);

            res.json(response);
        } catch (error) {
            console.log(error, "agent error");
        }
    } catch (error) {
        console.log(error, "ProductQuery error");
        res.status(500).json({ error: "Internal server error in Product_Query controller" });
    }
});

export { productQuery };
