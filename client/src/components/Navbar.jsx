import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // existing context
import NotificationBell from "./NotificationBell";

function Navbar() {
  const { user, logout } = useAuth(); // user is null if not logged in
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-white shadow-sm px-6 py-4">
      {/* Top bar */}
      <div className="flex justify-between items-center">
        <Link
          to={user ? "/dashboard" : "/"}
          className="font-bold text-blue-500 text-lg"
        >
          EquiFlow
        </Link>

        {user ? (
          <>
            {/* Desktop links (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                to="/dashboard"
                className={`hover:text-blue-500 text-sm ${location.pathname === "/dashboard" ? "font-bold text-black" : "font-medium text-gray-600"}`}
              >
                Dashboard
              </Link>
              <Link
                to="/groups"
                className={`hover:text-blue-500 text-sm ${location.pathname === "/groups" ? "font-bold text-black" : "font-medium text-gray-600"}`}
              >
                Groups
              </Link>
              <NotificationBell />
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 font-medium text-sm"
              >
                Logout
              </button>
            </div>

            {/* Mobile right side (bell + hamburger) */}
            <div className="flex items-center gap-2 sm:hidden">
              <NotificationBell />
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-600 hover:text-blue-500"
                aria-label="Toggle menu"
              >
                {/* Hamburger / close icon */}
                {menuOpen ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          // not logged in -> always show login/register
          <div className="flex gap-4">
            <Link
              to="/login"
              className={`hover:text-blue-500 text-sm ${location.pathname === "/login" ? "font-bold text-black" : "font-medium text-gray-600"}`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`hover:text-blue-500 text-sm ${location.pathname === "/register" ? "font-bold text-black" : "font-medium text-gray-600"}`}
            >
              Register
            </Link>
          </div>
        )}
      </div>
      {/* Mobile dropdown menu */}
      {user && menuOpen && (
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
          <Link
            to="/dashboard"
            onClick={closeMenu}
            className={`hover:bg-gray-50 px-2 py-2 rounded-lg text-sm ${location.pathname === "/dashboard" ? "font-bold text-black" : "font-medium text-gray-700"}`}
          >
            Dashboard
          </Link>
          <Link
            to="/groups"
            onClick={closeMenu}
            className={`hover:bg-gray-50 px-2 py-2 rounded-lg text-sm ${location.pathname === "/groups" ? "font-bold text-black" : "font-medium text-gray-700"}`}
          >
            Groups
          </Link>
          <button
            onClick={handleLogout}
            className="text-left text-red-500 hover:bg-red-50 px-2 py-2 rounded-lg text-sm font-medium"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
