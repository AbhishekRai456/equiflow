import api from "./axios";

export const fetchNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data.notifications;
};

export const markAllNotificationsRead = async () => {
  await api.patch("/notifications/read");   // PATCH
};