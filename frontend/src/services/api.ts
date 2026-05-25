import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Set base URL: 10.112.150.40 is the laptop's IP on the current Wi-Fi network
const API_BASE_URL = Platform.select({
  android: 'http://10.112.150.40:5000/api',
  default: 'http://10.112.150.40:5000/api',
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically add JWT token to headers
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error fetching token from storage', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// 🔐 AUTHENTICATION ENDPOINTS
// ==========================================

export const authApi = {
  signup: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/signup', { name, email, password });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

// ==========================================
// 📊 DASHBOARD & PROFILE ENDPOINTS
// ==========================================

export const dashboardApi = {
  getDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};

export const profileApi = {
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
  updateEmergencyContact: async (emergencyContact: string) => {
    const response = await api.put('/profile/emergency-contact', { emergencyContact });
    return response.data;
  },
};

// ==========================================
// 📈 ANALYTICS & REPORT ENDPOINTS
// ==========================================

export const analyticsApi = {
  getAnalytics: async () => {
    const response = await api.get('/analytics');
    return response.data;
  },
  getReportData: async () => {
    const response = await api.get('/report-data'); // Wait: checking if the route was app.use("/api", reportRoutes)
    return response.data;
  },
  getDownloadReportUrl: (token: string) => {
    return `${API_BASE_URL}/report?token=${token}`;
  }
};

// ==========================================
// 📝 DATA TRACKER ENDPOINTS
// ==========================================

export const trackerApi = {
  // Uses /api/tracker (which invokes the ML pipeline on the server)
  submitDailyTracker: async (data: {
    mood?: string;
    sleepHours?: number;
    screenTime?: number;
    stepCount?: number;
    aqi?: number;
    isPassive?: boolean;
  }) => {
    const response = await api.post('/tracker', data);
    return response.data;
  },
  // Uses /api/data (which calculates risk locally and saves individual schemas)
  submitRawData: async (data: {
    mood?: string;
    sleepHours?: number;
    screenTime?: number;
    stressLevel?: number;
    stepCount?: number;
    aqi?: number;
    summary?: string;
  }) => {
    const response = await api.post('/data', data);
    return response.data;
  },
};

// ==========================================
// 💬 AI COMPANION CHAT ENDPOINTS
// ==========================================

export const chatApi = {
  sendMessage: async (message: string) => {
    const response = await api.post('/chat/chat', { message }); // Mount path in server.js: app.use("/api/chat", chatRoutes) -> router.post("/chat", handleChat) -> full path: /api/chat/chat
    return response.data;
  },
  endChat: async () => {
    const response = await api.post('/chat/end-chat'); // Mount path: /api/chat/end-chat
    return response.data;
  },
};
