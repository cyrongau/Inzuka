import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
