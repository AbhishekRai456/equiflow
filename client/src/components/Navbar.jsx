import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // existing context
import NotificationBell from "./NotificationBell";

function Navbar() {
  const { user, logout } = useAuth(); // user is null if not logged in
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <span className="font-bold text-blue-500 text-lg">SplitEase</span>
      <div className="flex gap-4 items-center">
        {user ? (
          // logged in
          <>
            <span className="text-gray-500 text-sm">Hi, {user.name}</span>
            <Link to="/dashboard" className="text-gray-600 hover:text-blue-500 font-medium">
              Dashboard
            </Link>
            <Link
              to="/groups"
              className="text-gray-600 hover:text-blue-500 font-medium"
            >
              Groups
            </Link>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 font-medium"
            >
              Logout
            </button>
          </>
        ) : (
          // not logged in
          <>
            <Link to="/login" className="text-gray-600 hover:text-blue-500">
              Login
            </Link>
            <Link to="/register" className="text-gray-600 hover:text-blue-500">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
