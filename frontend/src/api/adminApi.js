import api from "./axiosConfig";

export const getUsers = () => api.get("/admin/users");
export const createUser = (payload) => api.post("/admin/users", payload);
export const updateUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);