import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchDashboard } from "../api/dashboard";

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null); // holds the full API response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await fetchDashboard();
        setSummary(data);
      } catch (err) {
        setError("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const isNetPositive = summary.overallNet > 0.01;
  const isNetNegative = summary.overallNet < -0.01;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-gray-500 mt-1">Here's your expense summary</p>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Overall net */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:col-span-1">
            <p className="text-sm text-gray-400 mb-1">Overall balance</p>
            <p
              className={`text-2xl font-bold ${
                isNetPositive
                  ? "text-green-600"
                  : isNetNegative
                    ? "text-red-500"
                    : "text-gray-500"
              }`}
            >
              {isNetPositive && "+"}₹{Math.abs(summary.overallNet).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isNetPositive
                ? "You are owed overall"
                : isNetNegative
                  ? "You owe overall"
                  : "You are settled up"}
            </p>
          </div>

          {/* Total owed to me */}
          <div className="bg-green-50 rounded-2xl border border-green-100 p-5">
            <p className="text-sm text-green-700 mb-1">Owed to you</p>
            <p className="text-2xl font-bold text-green-700">
              ₹{summary.totalOwedToMe.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 mt-1">across all groups</p>
          </div>

          {/* Total I owe */}
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
            <p className="text-sm text-red-600 mb-1">You owe</p>
            <p className="text-2xl font-bold text-red-600">
              ₹{summary.totalIOwe.toFixed(2)}
            </p>
            <p className="text-xs text-red-500 mt-1">across all groups</p>
          </div>
        </div>

        {/* Per-group breakdown */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Your Groups</h2>
            <button
              onClick={() => navigate("/groups")}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Manage groups →
            </button>
          </div>

          {summary.groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-gray-400">You're not in any groups yet.</p>
              <button
                onClick={() => navigate("/groups")}
                className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                Create your first group
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.groups.map(({ group, net }) => {
                const isPositive = net > 0.01;
                const isNegative = net < -0.01;

                return (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                  >
                    {/* Group info */}
                    <div>
                      <p className="font-semibold text-gray-800">
                        {group.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isPositive && "You are owed in this group"}
                        {isNegative && "You owe in this group"}
                        {!isPositive && !isNegative && "Settled up"}
                      </p>
                    </div>

                    {/* Net balance for this group */}
                    <div className="text-right">
                      <p
                        className={`font-bold text-lg ${
                          isPositive
                            ? "text-green-600"
                            : isNegative
                              ? "text-red-500"
                              : "text-gray-400"
                        }`}
                      >
                        {isPositive && "+"}
                        {!isPositive && !isNegative
                          ? "₹0.00"
                          : `₹${Math.abs(net).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
