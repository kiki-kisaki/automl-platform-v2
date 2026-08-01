import api from "./axiosConfig";

export const startExperiment = (payload) => api.post("/experiments", payload);
export const getExperiments = (data_type) => api.get("/experiments", { params: { data_type } });
export const getExperimentStatus = (id) => api.get(`/experiments/${id}/status`);
export const getExperimentResult = (id) => api.get(`/experiments/${id}/result`);
export const downloadModel = (id) => api.get(`/experiments/${id}/model/download`, { responseType: "blob" });