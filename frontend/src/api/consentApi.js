import api from "./axiosConfig";

export const uploadConsentPdf = (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/consent/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

export const getConsent = (datasetId) => api.get(`/consent/${datasetId}`);
export const downloadConsentPdf = (datasetId, subjectIndex) =>
    api.get(`/consent/${datasetId}/download-pdf/${subjectIndex}`, { responseType: "blob" });