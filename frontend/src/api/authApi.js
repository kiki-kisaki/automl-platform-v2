import api from "./axiosConfig";
export const login = (email, password) => api.post("/auth/login", { email, password });
export const getMe = () => api.get("/auth/me");