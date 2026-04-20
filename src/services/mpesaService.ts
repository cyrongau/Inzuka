import axios from 'axios';

// In native app, this would be set to your production API domain
const API_BASE_URL = typeof window !== 'undefined' ? '' : 'https://your-production-domain.com';

export const initiateStkPush = async (phoneNumber: string, amount: number, accountReference: string) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/mpesa/stkpush`, {
            phoneNumber,
            amount,
            accountReference
        });
        return response.data;
    } catch (error: any) {
        console.error('STK Push Error:', error.response?.data || error.message);
        throw error;
    }
};
