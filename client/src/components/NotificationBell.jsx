import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
} from "../api/notifications";

// converts a date string to a readable "X ago" format
const timeAgo = (dateStr) => {
  const diffMs = new Date() - new Date(dateStr);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Derived (no useState needed)
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load notifications on mount (only if logged in)
  useEffect(() => {
    if (user) {
      fetchNotifications()
        .then(setNotifications)
        .catch(() => {}); // fail silently becacause bell is non-critical
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick); // cleanup function
  }, []);

  const handleBellClick = async () => {
    const opening = !isOpen;
    setIsOpen(opening);

    // Mark all as read when opening if there are unread ones
    if (opening && unreadCount > 0) {
      try {
        await markAllNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // Non-critical (don't show error to user)
      }
    }
  };

  const handleNotificationClick = (notification) => {
    setIsOpen(false);
    if (notification.groupId) {
      navigate(`/groups/${notification.groupId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
        aria-label="Notifications"
      >
        {/* Bell icon SVG — no emoji, looks cleaner */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 bg-red-500 text-white
            text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl
          border border-gray-100 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-800 text-sm">Notifications</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">
                No notifications yet
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 border-b border-gray-50 last:border-0
                      cursor-pointer hover:bg-gray-50 transition-colors ${
                        !n.read ? "bg-blue-50" : ""
                      }`}
                  >
                    {/* Unread dot */}
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span
                          className="mt-1.5 w-2 h-2 rounded-full bg-blue-500
                          flex-shrink-0"
                        />
                      )}
                      <div className={!n.read ? "" : "ml-4"}>
                        <p className="text-sm text-gray-700 leading-snug">
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
