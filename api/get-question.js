// This is your secure backend function.
// It should be placed in a file at the path `/api/get-question.js` in your project.

console.log("Function cold start"); // Logs when the function starts up

export default async function handler(request, response) {
    console.log("Handler invoked. Method:", request.method);

    if (request.method !== 'POST') {
        console.log("Method not allowed:", request.method);
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        console.log("Attempting to access API key...");
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("GEMINI_API_KEY environment variable not found.");
            return response.status(500).json({ error: 'API key is not configured on the server.' });
        }
        console.log("API key found.");

        const { difficulty } = request.body;
        console.log("Received difficulty:", difficulty);
        if (!difficulty || (difficulty !== 'school' && difficulty !== 'college')) {
            console.error("Invalid difficulty received:", difficulty);
            return response.status(400).json({ error: 'Invalid difficulty level provided.' });
        }

        const schema = {
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
        };

        const systemPrompt = "You are an expert quiz master specializing in Environmental Education. Generate a single, interesting trivia question. Ensure the correct answer is one of the provided options. Your response must be in JSON format matching the provided schema.";
        const userQuery = `Generate a new trivia question on Environmental Education suitable for a ${difficulty}-level student.`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        };

        console.log("Calling Gemini API...");
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log("Received response from Gemini API with status:", geminiResponse.status);

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Error from Gemini API:", JSON.stringify(errorData, null, 2));
            return response.status(geminiResponse.status).json({ error: errorData.error?.message || 'Failed to fetch data from Gemini API.' });
        }

        const data = await geminiResponse.json();
        console.log("Successfully parsed Gemini response. Sending data to frontend.");
        
        return response.status(200).json(data);

    } catch (error) {
        console.error('Internal server error in handler:', error);
        return response.status(500).json({ error: 'An internal server error occurred.' });
    }
}

