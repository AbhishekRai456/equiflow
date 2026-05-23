import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchGroupById, addGroupMember } from "../api/groups";
import { fetchGroupExpenses } from "../api/expenses";
import AddExpenseModal from "../components/AddExpenseModal";

function GroupDetailPage() {
  const { groupId } = useParams(); // reads :groupId from the URL
  const navigate = useNavigate();
  const { user } = useAuth(); // logged-in user

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // add member form state
  const [memberEmail, setMemberEmail] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberSuccess, setAddMemberSuccess] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // fetch group details when page loads
  useEffect(() => {
    const loadGroup = async () => {
      try {
        const [groupData, expensesData] = await Promise.all([
          fetchGroupById(groupId),
          fetchGroupExpenses(groupId),
        ]);
        setGroup(groupData);
        setExpenses(expensesData);
      } catch (err) {
        setError("Failed to load group details.");
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId]); // re-run if groupId in the URL ever changes

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddMemberError("");
    setAddMemberSuccess("");

    if (!memberEmail.trim()) {
      setAddMemberError("Please enter an email address");
      return;
    }

    setAddingMember(true);
    try {
      const result = await addGroupMember(groupId, memberEmail.trim());

      // build a new member object in the same shape as what the backend returns
      // so we can add it to the list without re-fetching everything
      const newMember = {
        id: result.user.id + "-member", // temporary local id for the key prop
        user: result.user,
      };

      setGroup((prev) => ({
        ...prev,
        members: [...prev.members, newMember],
      }));

      setAddMemberSuccess(`${result.user.name} was added to the group`);
      setMemberEmail(""); // clear the input
    } catch (err) {
      setAddMemberError(err.response?.data?.error || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleExpenseAdded = (newExpense) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  // loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading group...</p>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // main render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate("/groups")}
          className="text-blue-500 hover:text-blue-600 text-sm mb-6 flex items-center gap-1"
        >
          ← Back to Groups
        </button>

        {/* Group header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
              <p className="text-sm text-gray-400 mt-1">
                Created by {group.creator.name} ·{" "}
                {new Date(group.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {/* Members list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Members ({group.members.length})
          </h2>

          <ul className="divide-y divide-gray-100">
            {group.members.map((member) => (
              <li
                key={member.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {member.user.name}
                    {/* Show "You" badge next to the logged-in user */}
                    {member.user.id === user.id && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                    {/* Show "Admin" badge next to the group creator */}
                    {member.user.id === group.creator.id && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400">{member.user.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Add member form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Add a Member
          </h2>

          {addMemberError && (
            <p className="text-red-500 text-sm mb-3">{addMemberError}</p>
          )}
          {addMemberSuccess && (
            <p className="text-green-500 text-sm mb-3">{addMemberSuccess}</p>
          )}

          <form onSubmit={handleAddMember} className="flex gap-3">
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="Enter their email address"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              disabled={addingMember}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {addingMember ? "Adding..." : "Add"}
            </button>
          </form>
        </div>

        {/* Expenses list */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Expenses ({expenses.length})
          </h2>

          {expenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-gray-400">No expenses yet.</p>
              <p className="text-gray-400 text-sm mt-1">
                Add the first one with the button above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
                >
                  {/* Expense header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {expense.description}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {expense.category.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          Paid by{" "}
                          {expense.paidBy.id === user.id
                            ? "you"
                            : expense.paidBy.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-800">
                      ₹{expense.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Splits breakdown */}
                  <div className="border-t border-gray-100 pt-3 space-y-1">
                    {expense.splits.map((split) => {
                      const isCurrentUser = split.user.id === user.id;
                      return (
                        <div
                          key={split.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span
                            className={
                              isCurrentUser
                                ? "font-medium text-blue-600"
                                : "text-gray-600"
                            }
                          >
                            {isCurrentUser ? "You" : split.user.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">
                              ₹{split.amount.toFixed(2)}
                            </span>
                            {split.isPaid ? (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                Settled
                              </span>
                            ) : (
                              <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showExpenseModal && (
        <AddExpenseModal
          groupId={groupId}
          onClose={() => setShowExpenseModal(false)}
          onExpenseAdded={handleExpenseAdded}
        />
      )}
    </div>
  );
}

export default GroupDetailPage;
