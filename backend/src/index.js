import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { DatabaseSync } from 'node:sqlite';

// Initialize SQLite Database
const db = new DatabaseSync('configs.sqlite');
db.exec(`
  CREATE TABLE IF NOT EXISTS scene_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatarId TEXT,
    backgroundId TEXT,
    avatarX REAL,
    avatarY REAL,
    avatarZ REAL,
    avatarRotY REAL,
    cameraX REAL,
    cameraY REAL,
    cameraZ REAL,
    targetX REAL,
    targetY REAL,
    targetZ REAL
  )
`);

// Ignore self-signed certificate errors for local dev/proxies
axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const VIENEU_URL = process.env.VIENEU_URL || 'http://localhost:8000/v1';

// Base API URL for OpenAI compatible endpoints (default to Groq for now)
const API_BASE = process.env.OPENAI_API_BASE || 'https://api.groq.com/openai/v1';
const API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Speech to Text (Whisper via OpenAI Compatible API)
app.post('/api/stt', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const formData = new FormData();
        // Append buffer with a filename so the API recognizes it as a file
        formData.append('file', req.file.buffer, { filename: 'audio.webm', contentType: req.file.mimetype });
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');
        formData.append('language', 'vi');
        formData.append('temperature', '0.0');

        const response = await axios.post(`${API_BASE}/audio/transcriptions`, formData, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                ...formData.getHeaders()
            }
        });

        res.json({ text: response.data.text });
    } catch (error) {
        console.error("STT Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

// Chat (LLM via OpenAI Compatible API)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model = "qwen/qwen3.8-27b" } = req.body;

        const systemPrompt = {
            role: "system",
            content: "You are a helpful, concise AI virtual assistant. Your responses will be spoken aloud, so keep them natural and conversational. Avoid markdown formatting. You can optionally start your response with an emotion/action tag in brackets, for example: [happy], [sad], [nod], [shake], [think], or [neutral]. Example: '[happy] Xin chào, tôi có thể giúp gì cho bạn?'"
        };

        const response = await axios.post(`${API_BASE}/chat/completions`, {
            messages: [systemPrompt, ...messages],
            model: model,
            temperature: 0.7,
            max_tokens: 512,
            stream: true,
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        response.data.pipe(res);
    } catch (error) {
        console.error("Chat Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

// TTS Routing (VieNeu for VI, fallback handled on frontend)
app.post('/api/tts', async (req, res) => {
    try {
        const { text, lang, voice } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (lang === 'vi') {
            const ttsResponse = await axios.post(`${VIENEU_URL}/audio/speech`, {
                model: "vieneu-v3-turbo",
                input: text,
                voice: voice || "Minh Quân",
                response_format: "wav"
            }, {
                responseType: 'stream'
            });

            res.setHeader('Content-Type', 'application/octet-stream'); // Prevent IDM interception
            ttsResponse.data.pipe(res);
        } else {
            return res.status(501).json({ error: 'TTS for non-VI not fully implemented on backend yet.' });
        }

    } catch (error) {
        console.error("TTS Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.error?.message || error.message });
    }
});

// Scene Config API endpoints
app.get('/api/configs', (req, res) => {
    try {
        const query = db.prepare('SELECT * FROM scene_configs');
        const rows = query.all();
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/configs', (req, res) => {
    try {
        const { id, name, avatarId, backgroundId, avatarX, avatarY, avatarZ, avatarRotY, cameraX, cameraY, cameraZ, targetX, targetY, targetZ } = req.body;
        if (id) {
            const stmt = db.prepare(`
                UPDATE scene_configs SET 
                    name=?, avatarId=?, backgroundId=?, avatarX=?, avatarY=?, avatarZ=?, avatarRotY=?, 
                    cameraX=?, cameraY=?, cameraZ=?, targetX=?, targetY=?, targetZ=?
                WHERE id=?
            `);
            stmt.run(name, avatarId, backgroundId, avatarX, avatarY, avatarZ, avatarRotY, cameraX, cameraY, cameraZ, targetX, targetY, targetZ, id);
            res.json({ success: true, id });
        } else {
            const stmt = db.prepare(`
                INSERT INTO scene_configs (
                    name, avatarId, backgroundId, avatarX, avatarY, avatarZ, avatarRotY, 
                    cameraX, cameraY, cameraZ, targetX, targetY, targetZ
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const info = stmt.run(name, avatarId, backgroundId, avatarX, avatarY, avatarZ, avatarRotY, cameraX, cameraY, cameraZ, targetX, targetY, targetZ);
            res.json({ success: true, id: info.lastInsertRowid });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/configs/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM scene_configs WHERE id=?');
        stmt.run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
});
