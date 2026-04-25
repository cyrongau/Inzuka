import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Gemini AI Setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

app.post('/api/ai/generate', async (req, res) => {
    try {
        const { model: modelName = "gemini-1.5-flash", contents, config } = req.body;
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured on the server');
        }

        // Using the same pattern as client-side for consistency
        const response = await genAI.models.generateContent({
          model: modelName,
          contents: contents,
          config: config
        });
        
        res.json({ text: response.text });
    } catch (error: any) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ error: 'AI request failed', details: error.message });
    }
});

app.post('/api/ai/extract-id', async (req, res) => {
    try {
        const { base64Image, mimeType } = req.body;
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured on the server');
        }

        const prompt = `You are an expert identity document verification assistant. 
        Analyze this identity document (ID Card, Passport, etc.).
        1. Extract the full name, ID/Passport number, and DATE OF BIRTH.
        2. For Date of Birth, carefully look for "Date of Birth", "DOB", or "Date de naissance". In many IDs, this is formatted as DD-MM-YYYY or DD.MM.YYYY.
        3. Calculate the age accurately. Today's date is April 25, 2026.
           - Extract the birth year from the DOB.
           - Subtract birth year from 2026.
           - Adjust if birth month/day hasn't occurred yet in 2026.
        4. Accuracy is mission-critical. If any field is unclear, mark it as "Unknown".
        5. The extracted age MUST be an integer.
        
        IMPORTANT: Do not default to 24. Calculate it based on the extracted DOB.
        Format the Date of Birth as DD-MM-YYYY.`;

        const response = await genAI.models.generateContent({
            model: "gemini-1.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        idNumber: { type: Type.STRING },
                        dateOfBirth: { type: Type.STRING },
                        age: { type: Type.NUMBER },
                        gender: { type: Type.STRING },
                        nationality: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                    },
                    required: ["fullName", "idNumber", "dateOfBirth", "age"]
                }
            }
        });

        res.json(JSON.parse(response.text.trim()));
    } catch (error: any) {
        console.error('AI Extraction Error:', error);
        res.status(500).json({ error: 'AI Extraction failed', details: error.message });
    }
});

// M-Pesa Integration Helpers
const getMpesaToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const env = process.env.MPESA_ENV || 'sandbox';
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const url = env === 'sandbox' 
        ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('M-Pesa Auth Error:', error);
        throw new Error('Failed to get M-Pesa token');
    }
};

app.post('/api/mpesa/stkpush', async (req, res) => {
    const { phoneNumber, amount, accountReference } = req.body;
    
    try {
        const token = await getMpesaToken();
        const shortCode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const env = process.env.MPESA_ENV || 'sandbox';
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
        
        const url = env === 'sandbox'
            ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const response = await axios.post(url, {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: shortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: `${process.env.APP_URL}/api/mpesa/callback`,
            AccountReference: accountReference || 'InzukaApp',
            TransactionDesc: 'Payment for Inzuka App Services'
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        res.json(response.data);
    } catch (error: any) {
        console.error('STK Push Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'STK Push failed', details: error.response?.data || error.message });
    }
});

app.post('/api/mpesa/callback', (req, res) => {
    console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

async function startServer() {
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}

startServer();
