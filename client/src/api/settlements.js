import api from "./axios";

export const recordSettlement = async (groupId, data) => {
  const response = await api.post(`/groups/${groupId}/settlements`, data);
  return response.data;
};

export const fetchSettlements = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/settlements`);
  return response.data.settlements;
};
