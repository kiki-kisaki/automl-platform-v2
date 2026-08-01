import api from "./axiosConfig";

export const startPreprocessing = (payload) => api.post("/preprocessing", payload);
export const getPreprocessings = (dataset_id) => api.get("/preprocessing", { params: { dataset_id } });
export const getPreprocessingById = (id) => api.get(`/preprocessing/${id}`);
export const togglePreprocessingTrained = (id) => api.patch(`/preprocessing/${id}/toggle-trained`);