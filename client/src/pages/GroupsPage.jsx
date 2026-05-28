import { useState, useEffect } from "react";
import Skeleton from "../components/Skeleton";
import { fetchMyGroups } from "../api/groups";
import CreateGroupModal from "../components/CreateGroupModal";
import { useNavigate } from "react-router-dom";

function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true); // true while the first fetch is happening
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false); // controls modal visibility

  // Fetches user's groups (runs on initial page load AND when retrying after an error)
  const loadGroups = async () => {
    setLoading(true); // reset loading so skeleton shows again on retry
    setError("");
    try {
      const data = await fetchMyGroups();
      setGroups(data);
    } catch {
      setError("Failed to load groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // called by CreateGroupModal after a group is sucessfully created
  // Instead of re-fetching everything, just add the new group to the existing list
  const handleGroupCreated = (newGroup) => {
    setGroups((prevGroups) => [...prevGroups, { ...newGroup, memberCount: 1 }]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Groups</h1>
            <p className="text-gray-500 mt-1">
              Manage your shared expense groups
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            + New Group
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-gray-100"
              >
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center mt-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadGroups}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state (only shown when done loading, there is no error, and no groups exist) */}
        {!loading && !error && groups.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-gray-400 text-lg">No groups yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Create one to start splitting expenses!
            </p>
          </div>
        )}

        {/* Groups grid */}
        {!loading && groups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                  {group.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal (only rendered when showModal is true) */}
      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}

export default GroupsPage;
