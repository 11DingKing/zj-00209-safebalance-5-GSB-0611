import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

export const vehiclesAPI = {
  getAll: (params = {}) => api.get("/vehicles", { params }),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post("/vehicles", data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  calculate: (id) => api.post(`/vehicles/${id}/calculate`),
  calculateAll: () => api.post("/vehicles/calculate-all"),
  publish: (id) => api.post(`/vehicles/${id}/publish`),
  unpublish: (id) => api.post(`/vehicles/${id}/unpublish`),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getWeightClasses: () => api.get("/vehicles/classes"),
  getStatistics: () => api.get("/vehicles/statistics"),
  getTradeoff: () => api.get("/vehicles/tradeoff"),
  getVehicleClasses: () => api.get("/vehicles/vehicle-classes"),

  getDefaultWeights: () => api.get("/vehicles/weights/default"),
  recalculateWithWeights: (weights) =>
    api.post("/vehicles/recalculate-with-weights", weights),
  getTradeoffWithWeights: (weights) =>
    api.post("/vehicles/tradeoff-with-weights", weights),

  batchImport: (vehicles) => api.post("/vehicles/batch-import", { vehicles }),
  getPendingReview: () => api.get("/vehicles/pending-review"),
  getImportBatches: () => api.get("/vehicles/import-batches"),
  reviewVehicle: (id, action, reviewNote) =>
    api.post(`/vehicles/${id}/review`, { action, review_note: reviewNote }),
  batchReview: (ids, action, reviewNote) =>
    api.post("/vehicles/batch-review", {
      ids,
      action,
      review_note: reviewNote,
    }),

  getMultiCompare: (ids, weights = {}) =>
    api.get("/vehicles/compare/multi", {
      params: { ids: ids.join(","), ...weights },
    }),

  getWeightPresets: () => api.get("/vehicles/weight-presets"),
  createWeightPreset: (data) => api.post("/vehicles/weight-presets", data),
  deleteWeightPreset: (id) => api.delete(`/vehicles/weight-presets/${id}`),
  getTradeoffByPreset: (id) =>
    api.get(`/vehicles/weight-presets/${id}/tradeoff`),
};

export default api;
