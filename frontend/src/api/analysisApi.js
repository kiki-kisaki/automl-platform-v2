import api from "./axiosConfig";

export const getAvailableModels = () => api.get("/analysis/models");
export const generateAnalysis = (data) => api.post("/analysis/generate", data);
export const getAnalyses = () => api.get("/analysis");
export const getAnalysisById = (id) => api.get(`/analysis/${id}`);
export const getAnalysisStatus = (id) => api.get(`/analysis/${id}/status`);