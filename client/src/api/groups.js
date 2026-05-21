import api from "./axios";

// fetch all groups the logged-in user belongs to
export const fetchMyGroups = async () => {
  const response = await api.get("/groups");
  return response.data.groups;
};

// create a new group
export const createGroup = async (name) => {
  const response = await api.post("/groups", { name });
  return response.data.group;
};

// add a member to a group by email
export const addGroupMember = async (groupId, email) => {
  const response = await api.post(`/groups/${groupId}/members`, { email });
  return response.data;
};
