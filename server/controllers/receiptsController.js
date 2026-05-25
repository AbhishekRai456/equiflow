const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseReceipt = async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64 || !mimeType) {
    return res
      .status(400)
      .json({ error: "Image data and mimeType are required" });
  }

  // Only allow image types
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(mimeType)) {
    return res
      .status(400)
      .json({ error: "Only JPEG, PNG and WebP images are supported" });
  }

  // base64 * 0.75 approximates the original file size in bytes
  const approximateFileSizeBytes = imageBase64.length * 0.75;
  if (approximateFileSizeBytes > 5 * 1024 * 1024) {
    return res.status(413).json({
      error: "Image too large. Maximum size is 5MB.",
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Look at this receipt image carefully.
Extract the following:
1. The TOTAL amount to be paid (final amount including tax, as a number only)
2. The merchant, restaurant, or store name (short, no address)
3. The best matching category from ONLY these options: Food, Travel, Entertainment, Utilities, Rent, Others

Respond with ONLY a valid JSON object in this exact format, no explanation, no markdown:
{"amount": 450.00, "merchant": "Punjab Grill", "category": "Food"}

If this is not a receipt or you cannot read it clearly, respond with:
{"error": "Cannot read receipt"}`;

    // Send image + prompt together to Gemini Vision
    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64, // raw base64 (no prefix)
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini adds them
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) {
      return res.status(422).json({ error: parsed.error });
    }

    // Validate the shape before sending back
    if (!parsed.amount || !parsed.merchant || !parsed.category) {
      return res
        .status(422)
        .json({ error: "Could not extract receipt details" });
    }

    res.status(200).json({
      amount: parseFloat(parseFloat(parsed.amount).toFixed(2)),
      merchant: parsed.merchant,
      category: parsed.category,
    });
  } catch (error) {
    console.error("Receipt parsing error:", error);
    res
      .status(500)
      .json({ error: "Failed to scan receipt. Please fill manually." });
  }
};;

module.exports = { parseReceipt };
