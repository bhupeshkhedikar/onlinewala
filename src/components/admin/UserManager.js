import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import AddApplication from "./AddApplication";

export default function UserManager({ users }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [liveUser, setLiveUser] = useState(null);

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

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
            {users.length}
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