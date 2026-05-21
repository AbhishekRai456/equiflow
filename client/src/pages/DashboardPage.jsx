import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome, {user?.name}!
          </h2>
          <p className="text-gray-500 mt-1">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
