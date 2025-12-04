import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { combinedRetriever } from "../utils/Retriever.js";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-2.0-flash",
    maxOutputTokens: 1024,
    temperature: 0.7,
});

const standaloneQuestionPrompt = PromptTemplate.fromTemplate(`
Given some conversation history (if any) and a question, convert the question to a standalone question.
conversation history: {conv_history}
question: {question}
standalone question:
`);

const answerPrompt = PromptTemplate.fromTemplate(`
You are an intelligent and helpful shopping assistant for an e-commerce clothing website.

Your task is to recommend products based on the user's question and a list of matching product documents retrieved using vector search.

Use only the information provided in the context below to craft your response. DO NOT repeat or include the user's question in your answer.

If relevant products are found, summarize the top 2–3 in a friendly and persuasive manner that encourages the customer to make a purchase. Also give mongodb objectId of the relevant product.

Note - Respond with a greeting and introduce our site "Luxora" as a clothing brand.

If no relevant product is found, respond with:
“Sorry, we couldn’t find matching products for that. Please try searching with different words.”

If you truly don't know the answer, say:
"I'm sorry, I don't know the answer to that. Please contact support@luxora.com."


**Response Formate**

Return a single-line, valid JSON object with these fields:

**greeting**: greeting message,

**product1** :  an object with two fields: **productDetails** and **productId**

**Important JSON rules:**

- Return valid JSON on a single line
- Escape any double quotes or newlines inside values properly
- Always be concise, polite, and focused on increasing customer engagement and sales.

Context:
{context}
`);


const standaloneQuestionChain = standaloneQuestionPrompt.pipe(llm).pipe(new StringOutputParser());

const retrieverChain = RunnableSequence.from([
    (prevResult) => prevResult.standalone_question,
    async (standalone_question) => {
        const docs = await combinedRetriever(standalone_question);
        return combineDocuments(docs);
    },
]);

const answerChain = answerPrompt.pipe(llm).pipe(new JsonOutputParser());

const finalChain = RunnableSequence.from([
    {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough(),
    },
    {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history,
    },
    answerChain,
]);

const combineDocuments = (docs) => {
    return docs.map((doc) => doc.pageContent).join("\n\n");
};


export {finalChain}
