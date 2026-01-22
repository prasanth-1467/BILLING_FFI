import api from "../api/api";

export const login = async (username, password) => {
    const response = await api.post("/auth/login", { username, password });
    if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("user"));
};

export const getToken = () => {
    return localStorage.getItem("token");
};

export const isAuthenticated = () => {
    return !!localStorage.getItem("token");
};

export const verifyToken = async () => {
    try {
        const response = await api.get("/auth/me");
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logout();
        }
        throw error;
    }
};
