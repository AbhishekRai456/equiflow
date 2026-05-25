import api from "./axios";

export const parseReceiptImage = async (imageBase64, mimeType) => {
  const response = await api.post("/receipts/parse", { imageBase64, mimeType });
  return response.data; // { amount, merchant, category }
};