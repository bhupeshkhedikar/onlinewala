import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import AddApplication from "./AddApplication";

export default function UserManager({ users }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [liveUser, setLiveUser] = useState(null);

  // Registration date filters
  // "all" = all registrations
  // "today" = today's registrations
  // "yesterday" = yesterday's registrations
  // "date" = the date selected in the date picker
  const [dateFilter, setDateFilter] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");

  const getUserDate = (user) => {
    const value = user?.createdAt || user?.created_at || user?.registeredAt;

    if (!value) return null;

    // Firestore Timestamp
    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    // Firestore timestamp-like object
    if (typeof value?.seconds === "number") {
      return new Date(value.seconds * 1000);
    }

    if (value instanceof Date) {
      return value;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const dateKey = (date) => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const todayKey = dateKey(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = dateKey(yesterdayDate);

  const matchesDateFilter = (user) => {
    if (dateFilter === "all") return true;

    const userDate = getUserDate(user);
    if (!userDate) return false;

    const userKey = dateKey(userDate);

    if (dateFilter === "today") {
      return userKey === todayKey;
    }

    if (dateFilter === "yesterday") {
      return userKey === yesterdayKey;
    }

    if (dateFilter === "date") {
      return selectedDate ? userKey === selectedDate : false;
    }

    return true;
  };

  const filtered = users
    .filter(matchesDateFilter)
    .filter((u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile?.includes(search)
    )
    .sort((a, b) => {
      const aDate = getUserDate(a)?.getTime() || 0;
      const bDate = getUserDate(b)?.getTime() || 0;
      return bDate - aDate;
    });

  const todayCount = users.filter((u) => {
    const d = getUserDate(u);
    return d && dateKey(d) === todayKey;
  }).length;

  const yesterdayCount = users.filter((u) => {
    const d = getUserDate(u);
    return d && dateKey(d) === yesterdayKey;
  }).length;

  useEffect(() => {
    if (!selectedUser?.id) return;

    const unsub = onSnapshot(
      doc(db, "users", selectedUser.id),
      (docSnap) => {
        if (docSnap.exists()) {
          setLiveUser({
            id: docSnap.id,
            ...docSnap.data()
          });
        }
      }
    );

    return () => unsub();
  }, [selectedUser]);

  const openUser = (user) => {
    setSelectedUser(user);
    setLiveUser(user);
  };

  const closeUser = () => {
    setSelectedUser(null);
    setLiveUser(null);
  };

  return (
    <div
      style={{
        width: "100%",
        marginTop: "18px",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        color: "#0f172a"
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg,#ffffff,#f8fbff)",
          border: "1px solid #e2e8f0",
          borderRadius: "17px",
          padding: "16px",
          boxShadow:
            "0 5px 20px rgba(15,23,42,.04)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "13px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <div
              style={{
                width: "43px",
                height: "43px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg,#eff6ff,#dbeafe)",
                border: "1px solid #bfdbfe",
                fontSize: "19px"
              }}
            >
              👥
            </div>

            <div>
              <span
                style={{
                  display: "block",
                  color: "#005ce6",
                  fontSize: "7px",
                  fontWeight: 900,
                  letterSpacing: "1px",
                  marginBottom: "3px"
                }}
              >
                USER MANAGEMENT
              </span>

              <h3
                style={{
                  margin: 0,
                  fontSize: "18px",
                  lineHeight: "1.1",
                  fontWeight: 900,
                  color: "#0f172a"
                }}
              >
                Registered Users
              </h3>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "9px"
                }}
              >
                Manage customer applications and
                services
              </p>
            </div>
          </div>

          <div
            style={{
              minWidth: "48px",
              height: "34px",
              padding: "0 9px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              fontSize: "11px",
              fontWeight: 900
            }}
          >
            {filtered.length}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginBottom: "12px"
          }}
        >
          <span
            style={{
              position: "absolute",
              left: "11px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "14px",
              pointerEvents: "none"
            }}
          >
            🔍
          </span>

          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              width: "100%",
              height: "39px",
              boxSizing: "border-box",
              padding: "0 12px 0 34px",
              border: "1px solid #dbe2ea",
              borderRadius: "10px",
              outline: "none",
              background: "#fff",
              color: "#0f172a",
              fontSize: "10px",
              fontWeight: 600,
              transition: ".15s ease"
            }}
          />
        </div>

        {/* =========================================================
            REGISTRATION DATE FILTER
        ========================================================= */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "7px",
            marginBottom: "13px"
          }}
        >
          <button
            type="button"
            onClick={() => {
              setDateFilter("today");
              setSelectedDate("");
            }}
            style={{
              height: "32px",
              padding: "0 11px",
              borderRadius: "9px",
              border: dateFilter === "today"
                ? "1px solid #2563eb"
                : "1px solid #dbe2ea",
              background: dateFilter === "today"
                ? "#eff6ff"
                : "#fff",
              color: dateFilter === "today"
                ? "#2563eb"
                : "#64748b",
              fontSize: "9px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Today ({todayCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFilter("yesterday");
              setSelectedDate("");
            }}
            style={{
              height: "32px",
              padding: "0 11px",
              borderRadius: "9px",
              border: dateFilter === "yesterday"
                ? "1px solid #2563eb"
                : "1px solid #dbe2ea",
              background: dateFilter === "yesterday"
                ? "#eff6ff"
                : "#fff",
              color: dateFilter === "yesterday"
                ? "#2563eb"
                : "#64748b",
              fontSize: "9px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Yesterday ({yesterdayCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFilter("all");
              setSelectedDate("");
            }}
            style={{
              height: "32px",
              padding: "0 11px",
              borderRadius: "9px",
              border: dateFilter === "all"
                ? "1px solid #2563eb"
                : "1px solid #dbe2ea",
              background: dateFilter === "all"
                ? "#eff6ff"
                : "#fff",
              color: dateFilter === "all"
                ? "#2563eb"
                : "#64748b",
              fontSize: "9px",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            All Registrations ({users.length})
          </button>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              height: "32px",
              padding: "0 8px",
              border: dateFilter === "date"
                ? "1px solid #2563eb"
                : "1px solid #dbe2ea",
              borderRadius: "9px",
              background: dateFilter === "date"
                ? "#eff6ff"
                : "#fff"
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                color: "#64748b",
                whiteSpace: "nowrap"
              }}
            >
              Select Date
            </span>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilter("date");
              }}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#0f172a",
                fontSize: "9px",
                fontWeight: 700,
                cursor: "pointer"
              }}
            />
          </label>
        </div>

        {/* CURRENT FILTER SUMMARY */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "8px 10px",
            marginBottom: "10px",
            borderRadius: "9px",
            background: "#f8fafc",
            border: "1px solid #eef2f7"
          }}
        >
          <span
            style={{
              fontSize: "9px",
              color: "#64748b",
              fontWeight: 700
            }}
          >
            {dateFilter === "today"
              ? "Today's Registrations"
              : dateFilter === "yesterday"
              ? "Yesterday's Registrations"
              : dateFilter === "date"
              ? selectedDate
                ? `Registrations on ${selectedDate}`
                : "Select a registration date"
              : "All Registrations"}
          </span>

          <strong
            style={{
              fontSize: "11px",
              color: "#2563eb"
            }}
          >
            {filtered.length} Users
          </strong>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: "35px 20px",
              textAlign: "center",
              border: "1px dashed #cbd5e1",
              borderRadius: "13px",
              background: "#fcfdff"
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                margin: "0 auto 9px",
                borderRadius: "15px",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px"
              }}
            >
              🔍
            </div>

            <strong
              style={{
                display: "block",
                fontSize: "12px",
                color: "#475569"
              }}
            >
              No users found
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "4px",
                color: "#94a3b8",
                fontSize: "9px"
              }}
            >
              Try another name or email
            </span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(260px,1fr))",
              gap: "8px"
            }}
          >
            {filtered.map((u) => (
              <div
                key={u.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "13px",
                  padding: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  transition: ".15s ease",
                  boxShadow:
                    "0 4px 14px rgba(15,23,42,.035)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    minWidth: 0
                  }}
                >
                  <div
                    style={{
                      width: "39px",
                      height: "39px",
                      flexShrink: 0,
                      borderRadius: "11px",
                      background:
                        "linear-gradient(135deg,#dbeafe,#e0e7ff)",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 900
                    }}
                  >
                    {(u.name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div
                    style={{
                      minWidth: 0
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: "#0f172a",
                        fontSize: "11px",
                        fontWeight: 900,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {u.name || "Unnamed User"}
                    </strong>

                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#64748b",
                        fontSize: "8px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "150px"
                      }}
                    >
                      {u.email || "No email"}
                    </p>

                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#94a3b8",
                        fontSize: "7px"
                      }}
                    >
                      Registered:{" "}
                      {(() => {
                        const d = getUserDate(u);
                        return d
                          ? d.toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "Date unavailable";
                      })()}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "5px",
                        marginTop: "4px"
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 6px",
                          borderRadius: "20px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          fontSize: "6px",
                          fontWeight: 800
                        }}
                      >
                        {u.role || "user"}
                      </span>

                      {u.gender && (
                        <span
                          style={{
                            padding: "3px 6px",
                            borderRadius: "20px",
                            background:
                              u.gender === "female"
                                ? "#fdf2f8"
                                : "#f1f5f9",
                            color:
                              u.gender === "female"
                                ? "#db2777"
                                : "#64748b",
                            fontSize: "6px",
                            fontWeight: 800
                          }}
                        >
                          {u.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openUser(u)}
                  style={{
                    flexShrink: 0,
                    height: "31px",
                    padding: "0 10px",
                    border: "none",
                    borderRadius: "8px",
                    background:
                      "linear-gradient(135deg,#005ce6,#2563eb)",
                    color: "#fff",
                    fontSize: "8px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow:
                      "0 4px 10px rgba(0,92,230,.16)"
                  }}
                >
                  Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div
          onClick={closeUser}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            padding: "15px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,.68)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "650px",
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px",
              boxShadow:
                "0 30px 80px rgba(15,23,42,.3)"
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                borderBottom:
                  "1px solid #e2e8f0",
                background:
                  "linear-gradient(135deg,#f8fbff,#fff)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px"
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "11px",
                    background:
                      "linear-gradient(135deg,#dbeafe,#e0e7ff)",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                    fontWeight: 900
                  }}
                >
                  {(selectedUser.name || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#005ce6",
                      fontSize: "6px",
                      fontWeight: 900,
                      letterSpacing: "1px"
                    }}
                  >
                    USER MANAGEMENT
                  </span>

                  <h3
                    style={{
                      margin: "2px 0",
                      fontSize: "15px",
                      fontWeight: 900,
                      color: "#0f172a"
                    }}
                  >
                    {selectedUser.name}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#94a3b8",
                      fontSize: "7px"
                    }}
                  >
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={closeUser}
                style={{
                  width: "30px",
                  height: "30px",
                  border: "none",
                  borderRadius: "9px",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontSize: "18px",
                  cursor: "pointer"
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "14px 16px"
              }}
            >
              <AddApplication
                userId={selectedUser.id}
                user={liveUser}
              />
            </div>

            <div
              style={{
                padding: "10px 16px 13px",
                borderTop:
                  "1px solid #eef2f7",
                background: "#fcfdff",
                display: "flex",
                justifyContent: "flex-end"
              }}
            >
              <button
                onClick={closeUser}
                style={{
                  minWidth: "75px",
                  height: "31px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontSize: "8px",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}