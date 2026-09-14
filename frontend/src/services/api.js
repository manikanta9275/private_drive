import axios from "axios";

// Fallback to http://localhost:5000 if VITE_API_URL is not set in frontend/.env
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        "Content-Type": "application/json"
    }
});

// Request interceptor: attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor: handle unauthorized (expired or invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }

        return Promise.reject(error);
    }
);

export default api;
