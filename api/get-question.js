// This is your secure backend function.
// It should be placed in a file at the path `/api/get-question.js` in your project.

console.log("Function cold start");

export default async function handler(request, response) {
    console.log("Handler invoked. Method:", request.method);

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY environment variable not found.");
            return response.status(500).json({ error: 'API key is not configured on the server.' });
        }

        const { difficulty } = request.body;
        console.log("Received request for difficulty:", difficulty);
        if (!['easy', 'normal', 'hard'].includes(difficulty)) {
            return response.status(400).json({ error: 'Invalid difficulty level provided.' });
        }

        // Updated Schema: Expects an array of 5 question objects.
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    "question": { "type": "STRING" },
                    "options": {
                        "type": "ARRAY",
                        "items": { "type": "STRING" }
                    },
                    "correctAnswer": { "type": "STRING" }
                },
                required: ["question", "options", "correctAnswer"]
            }
        };

        const systemPrompt = "You are an expert quiz master specializing in Environmental Education. You must generate a complete quiz of 5 unique questions. The user will provide a difficulty level. Your response must be a JSON array of 5 objects, matching the provided schema. Do not wrap the array in any other object.";
        const userQuery = `Generate an array of 5 unique trivia questions on Environmental Education suitable for a ${difficulty} difficulty level.`;

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        };

        console.log("Calling Gemini API for a 5-question quiz...");
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error("Error from Gemini API:", errorData);
            return response.status(geminiResponse.status).json({ error: 'Failed to fetch data from Gemini API.' });
        }
        
        const data = await geminiResponse.json();
        console.log("Successfully received and parsed Gemini response.");

        // The response from the API is now directly the array of questions
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) {
            throw new Error("Invalid response structure from API.");
        }
        const questionsArray = JSON.parse(jsonText);

        return response.status(200).json(questionsArray);

    } catch (error) {
        console.error('Internal server error in handler:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}

