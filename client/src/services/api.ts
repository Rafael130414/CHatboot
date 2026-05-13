import axios from "axios";

const getBaseURL = () => {
    if (typeof window !== "undefined") {
        // Se estiver usando o túnel publico, usa o link do túnel da API
        if (window.location.hostname.includes("lhr.life")) {
            return "https://9ca3260b99866f.lhr.life";
        }
        return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return "https://4deb90f57b41f8.lhr.life";
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
