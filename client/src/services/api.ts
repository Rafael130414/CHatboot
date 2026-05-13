import axios from "axios";

const getBaseURL = () => {
    if (typeof window !== "undefined") {
        return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return "http://37.148.134.48:4000";
};


const api = axios.create({
    baseURL: getBaseURL(),
});

// Interceptor para adicionar o token automaticamente em todas as requisições
api.interceptors.request.use((config) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
