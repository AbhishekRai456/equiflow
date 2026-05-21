import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// wrapper for guest-only pages
function GuestRoute({ children }) {
  const { user } = useAuth();

  if (user) {
    // if user is already logged in, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default GuestRoute;
