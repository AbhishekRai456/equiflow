import api from "./axios";

export const fetchSpendingInsights = async () => {
  const response = await api.get("/insights");
  return response.data.insights;
};