const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Mongoose Schema and Model ---
const lessonPlanSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    keyConcepts: [{
        title: String,
        explanation: String,
    }],
    analogies: [{
        concept: String,
        analogy: String,
    }],
    quiz: [{
        question: String,
        options: [String],
        correctAnswer: Number,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const LessonPlan = mongoose.model('LessonPlan', lessonPlanSchema);

// --- API Endpoints ---

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all saved lesson plans
app.get('/api/lessons', async (req, res) => {
    try {
        const lessons = await LessonPlan.find({}, 'topic createdAt'); // Only get topic and date
        res.json(lessons);
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({ error: 'Failed to fetch lessons.' });
    }
});

// AI Generation endpoint (now with caching)
app.post('/api/generate', async (req, res) => {
    try {
        const { topic } = req.body;
        
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Check if a lesson for this topic already exists in the database
        const existingLesson = await LessonPlan.findOne({ topic: topic.toLowerCase() });
        if (existingLesson) {
            console.log(`📚 Found cached lesson for "${topic}"`);
            return res.json(existingLesson);
        }

        // If not in DB, generate a new lesson
        console.log(`✨ Generating new lesson for "${topic}"`);
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({ 
                error: 'Google API key not configured. Please add GOOGLE_API_KEY to your .env file.' 
            });
        }

        const newLessonPlan = await generateLessonPlan(topic);

        // Save the new lesson to the database
        const lessonToSave = new LessonPlan({
            topic: topic.toLowerCase(),
            ...newLessonPlan
        });
        await lessonToSave.save();
        console.log(`💾 Saved new lesson for "${topic}" to the database`);

        res.json(newLessonPlan);
        
    } catch (error) {
        console.error('Error generating lesson plan:', error);
        res.status(500).json({ 
            error: 'Failed to generate lesson plan. Please try again.' 
        });
    }
});


async function generateLessonPlan(topic) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    // Define the schema for structured output
    const schema = {
        type: "object",
        properties: {
            keyConcepts: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        explanation: { type: "string" }
                    },
                    required: ["title", "explanation"]
                },
                minItems: 2,
                maxItems: 3
            },
            analogies: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        concept: { type: "string" },
                        analogy: { type: "string" }
                    },
                    required: ["concept", "analogy"]
                },
                minItems: 2,
                maxItems: 3
            },
            quiz: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: { type: "string" },
                        options: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 4,
                            maxItems: 4
                        },
                        correctAnswer: { 
                            type: "integer",
                            minimum: 0,
                            maximum: 3
                        }
                    },
                    required: ["question", "options", "correctAnswer"]
                },
                minItems: 3,
                maxItems: 3
            }
        },
        required: ["keyConcepts", "analogies", "quiz"]
    };

    const prompt = `You are an expert instructional designer creating a 5-minute lesson plan for beginners on the topic: "${topic}".

Your task is to create a structured lesson plan with:

1. KEY CONCEPTS: Identify 2-3 fundamental concepts that a complete beginner must understand about this topic. Each concept should have a clear title and a simple, jargon-free explanation (2-3 sentences).

2. ANALOGIES: Create 2-3 simple, relatable analogies to explain complex aspects of the topic. Use everyday situations that anyone can understand.

3. QUIZ: Create exactly 3 multiple-choice questions to test understanding of the key concepts. Each question should have 4 options with exactly one correct answer. Provide the index (0-3) of the correct answer.

Guidelines:
- Keep language simple and accessible to beginners
- Avoid technical jargon unless absolutely necessary
- Make analogies relatable to everyday experiences
- Ensure quiz questions directly relate to the key concepts taught
- Be concise but comprehensive

Please respond with a valid JSON object that matches this exact structure:

{
  "keyConcepts": [
    {
      "title": "Concept Title",
      "explanation": "Clear, simple explanation of the concept"
    }
  ],
  "analogies": [
    {
      "concept": "Concept being explained",
      "analogy": "Simple analogy explanation"
    }
  ],
  "quiz": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0
    }
  ]
}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        }
    };

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response structure from Gemini API');
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Clean up the response to extract JSON
        let cleanedText = generatedText.trim();
        
        // Remove markdown code blocks if present
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
        }

        // Try to parse the JSON
        let lessonPlan;
        try {
            lessonPlan = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Generated text:', cleanedText);
            throw new Error('Failed to parse AI response as JSON');
        }

        // Validate the structure
        if (!lessonPlan.keyConcepts || !lessonPlan.analogies || !lessonPlan.quiz) {
            throw new Error('Invalid lesson plan structure');
        }

        return lessonPlan;

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: {
            hasApiKey: !!process.env.GOOGLE_API_KEY,
            port: PORT
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 LearnOS server running on port ${PORT}`);
    console.log(`📚 Visit http://localhost:${PORT} to access the application`);
    console.log(`🔑 API Key configured: ${!!process.env.GOOGLE_API_KEY}`);
});