import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { fetchDashboard } from "../api/dashboard";
import { fetchSpendingInsights } from "../api/insights";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// color palette for the chart bars
const BAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

// YYYY-MM => Month YY
const formatMonthLabel = (monthStr) => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

// custom recharts tooltip
const RupeeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-semibold text-gray-800">
          ₹{payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null); // holds the full API response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);

  // Loads dashboard data (runs on initial page load AND when retrying after an error)
  const loadDashboard = async () => {
    try {
      setLoading(true); // reset loading so skeleton shows again on retry
      setError("");
      const data = await fetchDashboard();
      setSummary(data);
    } catch (err) {
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadDashboard();
  }, []);

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    try {
      const data = await fetchSpendingInsights();
      setInsights(data);
      setInsightsFetched(true);
    } catch (err) {
      setInsights(["Could not generate insights right now."]);
      setInsightsFetched(true);
    } finally {
      setInsightsLoading(false);
    }
  };

  // loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-8 w-2/3 mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
          {/* Group rows skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex justify-between"
              >
                <div className="flex-1">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Try again
        </button>
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

        {/* AI Spending Insights */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Smart Insights
              </h2>
              <p className="text-sm text-gray-500">
                AI-powered insights based on your spending patterns
              </p>
            </div>
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {insightsLoading ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                  Analysing...
                </>
              ) : insightsFetched ? (
                "Refresh"
              ) : (
                "Generate Insights"
              )}
            </button>
          </div>

          {/* Before first generate */}
          {!insightsFetched && !insightsLoading && (
            <p className="text-sm text-gray-400 text-center py-4">
              Click above to analyse your spending patterns
            </p>
          )}

          {/* Insights list */}
          {insightsFetched && insights.length > 0 && (
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
                >
                  <span className="text-blue-500 mt-0.5">✦</span>
                  <span className="text-sm text-gray-700">{insight}</span>
                </li>
              ))}
            </ul>
          )}
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
        {/* Analytics charts */}
        {summary.byCategory.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-5">
              Your spending overview
            </h2>

            {/* Spending by category */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <p className="font-medium text-gray-700 mb-1">By category</p>
              <p className="text-sm text-gray-400 mb-5">
                Total across all your groups
              </p>

              <ResponsiveContainer
                width="100%"
                height={summary.byCategory.length * 52 + 20}
              >
                <BarChart
                  data={summary.byCategory}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${v}`}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 13, fill: "#374151" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    content={<RupeeTooltip />}
                    cursor={{ fill: "#f3f4f6" }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={36}>
                    {summary.byCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly trend */}
            {summary.byMonth.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="font-medium text-gray-700 mb-1">Monthly trend</p>
                <p className="text-sm text-gray-400 mb-5">
                  Total spend per month across all groups
                </p>

                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={summary.byMonth.map((item) => ({
                      ...item,
                      monthLabel: formatMonthLabel(item.month),
                    }))}
                    margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${v}`}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      content={<RupeeTooltip />}
                      cursor={{ fill: "#f3f4f6" }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
