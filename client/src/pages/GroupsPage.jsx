import { useState, useEffect } from "react";
import { fetchMyGroups } from "../api/groups";
import CreateGroupModal from "../components/CreateGroupModal";
import { useNavigate } from "react-router-dom";

function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true); // true while the first fetch is happening
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false); // controls modal visibility

  // runs once when the page loads (fetches user's groups)
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await fetchMyGroups();
        setGroups(data);
      } catch (err) {
        setError("Failed to load groups. Please try again.");
      } finally {
        setLoading(false); // hide the loading state either way
      }
    };

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
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            + New Group
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <p className="text-center text-gray-400 mt-20">Loading groups...</p>
        )}

        {/* Error state */}
        {error && <p className="text-center text-red-500 mt-20">{error}</p>}

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
