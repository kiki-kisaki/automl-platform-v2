import api from "./axiosConfig";

export const uploadTabular = (file, name) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    return api.post("/datasets/upload/tabular", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const uploadImage = (file, name) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    return api.post("/datasets/upload/image", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const uploadText = (file, name) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    return api.post("/datasets/upload/text", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const getDatasets = (status) => api.get("/datasets", { params: { status } });
export const getDatasetById = (id) => api.get(`/datasets/${id}`);
export const getImagePreview = (id) => api.get(`/datasets/${id}/preview-images`);
export const toggleDatasetStatus = (id) => api.patch(`/datasets/${id}/status`);
export const deleteDatasetApi = (id) => api.delete(`/datasets/${id}`);
export const getDocuments = (id) => api.get(`/datasets/${id}/documents`);