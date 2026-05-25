import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCategories } from "../api/categories";
import { createExpense } from "../api/expenses";

// dictionary of keywords for rule-based auto-categorization
const CATEGORY_KEYWORDS = {
  Food: [
    "dinner",
    "lunch",
    "breakfast",
    "food",
    "eat",
    "pizza",
    "burger",
    "cafe",
    "restaurant",
    "swiggy",
    "zomato",
    "biryani",
    "chai",
    "coffee",
    "snack",
    "groceries",
  ],
  Travel: [
    "uber",
    "ola",
    "auto",
    "cab",
    "taxi",
    "flight",
    "train",
    "bus",
    "fuel",
    "petrol",
    "metro",
    "rapido",
    "toll",
    "parking",
    "ferry",
  ],
  Entertainment: [
    "movie",
    "netflix",
    "spotify",
    "game",
    "concert",
    "party",
    "bar",
    "pub",
    "show",
    "event",
    "ticket",
    "bowling",
  ],
  Utilities: [
    "rent",
    "electric",
    "electricity",
    "wifi",
    "internet",
    "water",
    "bill",
    "maintenance",
    "recharge",
    "gas",
  ],
  Others: [],
};

// scans a description string to suggest a matching category
// TC = O(N * K) ~ O(N * 50) ~ O(N)
// - N is the length of the description string.
// - K is the total number of keywords across all categories.
const suggestCategory = (description) => {
  const lower = description.toLowerCase();
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return catName;
    }
  }
  return null;
};

function AddExpenseModal({ groupId, members, onClose, onExpenseAdded }) {
  const { user } = useAuth();

  // Form fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");
  const [customAmounts, setCustomAmounts] = useState({});
  const [percentages, setPercentages] = useState({});

  // UI state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialise per-member input maps when members list arrives
  useEffect(() => {
    const initialAmounts = {};
    const initialPcts = {};
    members.forEach((m) => {
      initialAmounts[m.user.id] = "";
      initialPcts[m.user.id] = "";
    });
    setCustomAmounts(initialAmounts);
    setPercentages(initialPcts);
  }, [members]);

  // fetch categories as soon as the modal opens
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);

        // pre-select the first category so the dropdown isn't blank
        if (data.length > 0) {
          setCategoryId(data[0].id);
        }
      } catch (err) {
        setError("Failed to load categories");
      }
    };

    loadCategories();
  }, []); // run once when modal mounts

  // Derived State => no useState needed for customRemaining/pctRemaining
  const parsedTotal = parseFloat(amount) || 0;

  const totalCustomEntered = Object.values(customAmounts).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0,
  );
  const customRemaining = parseFloat(
    (parsedTotal - totalCustomEntered).toFixed(2),
  );

  const totalPctEntered = Object.values(percentages).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0,
  );
  const pctRemaining = parseFloat((100 - totalPctEntered).toFixed(1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // frontend validation before hitting the API
    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    if (splitType == "CUSTOM" && Math.abs(customRemaining) > 0.01) {
      return setError(
        `Amounts must add up to ₹${parsedTotal.toFixed(2)}. (₹${customRemaining.toFixed(2)} remaining)`,
      );
    }
    if (splitType === "PERCENTAGE" && Math.abs(pctRemaining) > 0.01) {
      return setError(
        `Percentages must add up to 100% (${pctRemaining.toFixed(1)}% remaining)`,
      );
    }

    // build splits payload for non-equal types
    let splitsPayload = undefined;
    if (splitType === "CUSTOM") {
      splitsPayload = members.map((m) => ({
        userId: m.user.id,
        amount: parseFloat(customAmounts[m.user.id] || 0),
      }));
    } else if (splitType === "PERCENTAGE") {
      splitsPayload = members.map((m) => ({
        userId: m.user.id,
        percentage: parseFloat(percentages[m.user.id] || 0),
      }));
    }

    setLoading(true);
    try {
      const newExpense = await createExpense(groupId, {
        description: description.trim(),
        amount: parsedTotal,
        categoryId,
        splitType,
        splits: splitsPayload,
      });

      onExpenseAdded(newExpense); // tell parent to add this to its list
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Expense</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Paid by */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid by
            </label>
            <div className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 text-gray-500 text-sm">
              {user.name} (you)
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                const value = e.target.value;
                setDescription(value);

                // suggest a category based on what user is typing
                const suggested = suggestCategory(value);
                if (suggested && categories.length > 0) {
                  const match = categories.find((c) => c.name === suggested);
                  if (match) setCategoryId(match.id);
                }
              }}
              placeholder="e.g. Dinner, Groceries, Auto fare"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Split type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split type
            </label>
            <div className="flex gap-2">
              {["EQUAL", "CUSTOM", "PERCENTAGE"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    splitType === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {type === "EQUAL"
                    ? "Equal"
                    : type === "CUSTOM"
                      ? "Custom ₹"
                      : "Percentage %"}
                </button>
              ))}
            </div>
          </div>

          {/* EQUAL*/}
          {splitType === "EQUAL" && (
            <p className="text-xs text-gray-400">
              ✦ Split equally among all {members.length} members
            </p>
          )}

          {/* CUSTOM */}
          {splitType === "CUSTOM" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-medium text-gray-600">
                  Enter each person's share
                </p>
                <p
                  className={`text-xs font-semibold ${
                    Math.abs(customRemaining) < 0.01
                      ? "text-green-600"
                      : "text-orange-500"
                  }`}
                >
                  {Math.abs(customRemaining) < 0.01
                    ? "✓ Balanced"
                    : `₹${customRemaining.toFixed(2)} remaining`}
                </p>
              </div>
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-24 truncate">
                    {m.user.id === user.id ? "You" : m.user.name}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-gray-400 text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={customAmounts[m.user.id] || ""}
                      onChange={(e) =>
                        setCustomAmounts((prev) => ({
                          ...prev,
                          [m.user.id]: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PERCENTAGE */}
          {splitType === "PERCENTAGE" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-medium text-gray-600">
                  Enter each person's percentage
                </p>
                <p
                  className={`text-xs font-semibold ${
                    Math.abs(pctRemaining) < 0.01
                      ? "text-green-600"
                      : "text-orange-500"
                  }`}
                >
                  {Math.abs(pctRemaining) < 0.01
                    ? "✓ Balanced"
                    : `${pctRemaining.toFixed(1)}% remaining`}
                </p>
              </div>
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-24 truncate">
                    {m.user.id === user.id ? "You" : m.user.name}
                  </span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={percentages[m.user.id] || ""}
                      onChange={(e) =>
                        setPercentages((prev) => ({
                          ...prev,
                          [m.user.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || categories.length === 0}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddExpenseModal;
