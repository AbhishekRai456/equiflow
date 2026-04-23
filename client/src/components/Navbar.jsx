import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <span className="font-bold text-blue-500 text-lg">SplitEase</span>
      <div className="flex gap-4">
        <Link to="/login" className="text-gray-600 hover:text-blue-500">
          Login
        </Link>
        <Link to="/register" className="text-gray-600 hover:text-blue-500">
          Register
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;