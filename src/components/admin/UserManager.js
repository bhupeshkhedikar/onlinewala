import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import AddApplication from "./AddApplication";

export default function UserManager({ users }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [liveUser, setLiveUser] = useState(null);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // 🔥 REAL-TIME LISTENER
  useEffect(() => {
    if (!selectedUser?.id) return;

    const unsub = onSnapshot(
      doc(db, "users", selectedUser.id),
      (docSnap) => {
        if (docSnap.exists()) {
          setLiveUser({ id: docSnap.id, ...docSnap.data() });
        }
      }
    );

    return () => unsub();
  }, [selectedUser]);

  return (
    <div className="userManager">

      <h3>Registered Users ({users.length})</h3>

      <input
        placeholder="Search..."
        className="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.map(u => (
        <div key={u.id} className="user-card">
          <div>
            <b>{u.name}</b>
            <p>{u.email}</p>
          </div>

          <button onClick={() => setSelectedUser(u)}>
            Manage
          </button>
        </div>
      ))}

      {/* MODAL */}
      {selectedUser && (
        <div className="modal">
          <div className="modal-content">

            <h3>{selectedUser.name}</h3>

            {/* 🔥 LIVE USER */}
            <AddApplication
              userId={selectedUser.id}
              user={liveUser}
            />

            <button onClick={() => setSelectedUser(null)}>
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}