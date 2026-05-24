import api from "./axios";

export const fetchGroupAnalytics = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/analytics`);
  return response.data;
};