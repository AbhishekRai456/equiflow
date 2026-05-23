import api from "./axios";

export const fetchCategories = async () => {
  const response = await api.get("/categories");
  return response.data.categories;
};