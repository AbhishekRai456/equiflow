import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "../components/Skeleton";
import { fetchGroupAnalytics } from "../api/analytics";
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

// One color per category bar (cycles if more than 6 categories)
const BAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
];

// "YYYY-MM" → "Month 'YY"
const formatMonthLabel = (monthStr) => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

// Custom tooltip for both charts (shows ₹ symbol)
const RupeeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
        <p className="text-gray-600 mb-1">{label}</p>
        <p className="font-semibold text-gray-800">
          ₹{payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

function AnalyticsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // fetches group analytics (runs on initial mount, when groupId URL changes, AND on manual retry)
  const load = async () => {
    setLoading(true);   // reset loading so skeleton shows again on retry
    setError("");
    try {
      const data = await fetchGroupAnalytics(groupId);
      setAnalytics(data);
    } catch (err) {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          
          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>

          {/* Chart Area Skeleton */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <Skeleton className="h-6 w-48 mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
              <Skeleton className="h-8 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if(error) {
    return (
      <div className="text-center mt-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadGroups}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    )
  }

  // Format monthly data with readable labels for the chart
  const monthlyChartData = analytics.byMonth.map((item) => ({
    ...item,
    monthLabel: formatMonthLabel(item.month),
  }));

  const hasExpenses = analytics.expenseCount > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="text-blue-500 hover:text-blue-600 text-sm mb-6 flex items-center gap-1"
        >
          ← Back to {analytics.groupName}
        </button>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
          <p className="text-gray-500 mt-1">{analytics.groupName}</p>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-400">Total spent</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              ₹{analytics.totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-400">Expenses recorded</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {analytics.expenseCount}
            </p>
          </div>
        </div>

        {/* No expenses state */}
        {!hasExpenses && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-lg">No expenses yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Add expenses to the group to see analytics here.
            </p>
          </div>
        )}

        {/* Spending by category */}
        {hasExpenses && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              Spending by category
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Total group spend per category
            </p>

            {/* ResponsiveContainer makes the chart fill its parent width */}
            <ResponsiveContainer
              width="100%"
              height={analytics.byCategory.length * 52 + 20}
            >
              <BarChart
                data={analytics.byCategory}
                layout="vertical" // horizontal bars — better for category names
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
                  width={90}
                />
                <Tooltip
                  content={<RupeeTooltip />}
                  cursor={{ fill: "#f3f4f6" }}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={36}>
                  {/* Give each bar a different color */}
                  {analytics.byCategory.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly spending trend */}
        {hasExpenses && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              Monthly trend
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Total group spend per month
            </p>

            {monthlyChartData.length === 1 ? (
              // Single month — bar chart looks odd with one bar and no trend
              <div className="text-center py-6">
                <p className="text-2xl font-bold text-blue-600">
                  ₹{monthlyChartData[0].total.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  spent in {monthlyChartData[0].monthLabel}
                </p>
                <p className="text-xs text-gray-300 mt-3">
                  Trend chart appears when expenses span more than one month
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={monthlyChartData}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
