require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '')));

// Rate limiting for the Gemini API call
const combineLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: { error: 'Too many combinations from this IP, please try again after a minute.' }
});

// API Routes (for Infinite Craft)
app.post('/api/combine', combineLimiter, async (req, res) => {
    try {
        const { word1, word2 } = req.body;

        if (!word1 || !word2) {
            return res.status(400).json({ error: 'Both word1 and word2 are required' });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY missing' });
        }

        const prompt = `You are a core game logic engine for an "Infinite Craft" style game. Combine the two given elements to create a new, logical or slightly creative element. 
Element 1: "${word1}"
Element 2: "${word2}"

Respond ONLY with a valid JSON document (no markdown formatting, no comments).
Format: {"emoji": "single Unicode emoji fitting the word", "word": "the combined word, usually 1-2 words"}
Example: {"emoji": "💨", "word": "Steam"} if the inputs were Water and Fire.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            console.error('Gemini API Error:', await response.text());
            return res.status(response.status).json({ error: 'Error communicating with AI service' });
        }

        const data = await response.json();
        let jsonString = data.candidates[0].content.parts[0].text.trim();

        // Clean up markdown code block if present
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const result = JSON.parse(jsonString);
        res.json(result);

    } catch (error) {
        console.error('Server error during combination:', error);
        res.status(500).json({ error: 'Internal server error while combining items' });
    }
});

// For any other route, serve the root index.html (optional but good for SPA, 
// though here we have multiple HTML files, so express.static usually handles it)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving all games in the toybox.`);
});
