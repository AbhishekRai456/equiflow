import api from "./axios";

export const fetchGroupExpenses = async (groupId) => {
  const response = await api.get(`/groups/${groupId}/expenses`);
  return response.data.expenses;
};

export const createExpense = async (groupId, data) => {
  const response = await api.post(`/groups/${groupId}/expenses`, data);
  return response.data.expense;
};