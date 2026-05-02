import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, where, increment } from "firebase/firestore";
import { db } from "../firebase"; 

export default function AllWinningsAdmin() {
  const [winnings, setWinnings] = useState([]);
  const [filteredWinnings, setFilteredWinnings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [filter, setFilter] = useState("all"); 
  const [searchQuery, setSearchQuery] = useState("");

  // 🔥 Add Ticket Modal States
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketMobile, setTicketMobile] = useState("");
  const [ticketAmount, setTicketAmount] = useState(1);
  const [ticketLoading, setTicketLoading] = useState(false);

  const fetchWinnings = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersDataMap = {};
      usersSnapshot.forEach((doc) => {
        usersDataMap[doc.id] = doc.data(); 
      });

      const q = query(collection(db, "winnings"), orderBy("wonAt", "desc"));
      const snapshot = await getDocs(q);
      
      const data = [];
      snapshot.forEach((document) => {
        const docData = document.data();
        const actualCustomer = usersDataMap[docData.userId] || {};

        data.push({
          id: document.id,
          ...docData,
          userName: actualCustomer.name || docData.userName || "Unknown",
          userMobile: actualCustomer.mobile || docData.userMobile || "N/A",
          wonAt: docData.wonAt?.toDate() || new Date(),
          expiresAt: docData.expiresAt?.toDate() || new Date()
        });
      });
      setWinnings(data);
    } catch (error) {
      console.error("Error fetching all winnings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinnings();
  }, []);

  useEffect(() => {
    const now = new Date();
    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(now.getDate() + 2); 

    let result = winnings;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(w => 
        (w.userMobile && w.userMobile.includes(lowerQuery)) || 
        (w.userName && w.userName.toLowerCase().includes(lowerQuery))
      );
    }

    if (filter === "active") {
      result = result.filter(w => w.status === "active" && w.expiresAt > now);
    } else if (filter === "expiring_soon") {
      result = result.filter(w => w.status === "active" && w.expiresAt > now && w.expiresAt <= nearExpiryDate);
    } else if (filter === "redeemed") {
      result = result.filter(w => w.status === "redeemed");
    } else if (filter === "expired") {
      result = result.filter(w => w.status === "expired" || (w.status === "active" && w.expiresAt < now));
    }

    setFilteredWinnings(result);
  }, [winnings, filter, searchQuery]);

  const handleRedeem = async (id) => {
    if (!window.confirm("Are you sure you want to redeem this prize?")) return;
    try {
      await updateDoc(doc(db, "winnings", id), {
        status: "redeemed",
        redeemedAt: new Date()
      });
      setWinnings(prev => prev.map(w => w.id === id ? { ...w, status: "redeemed" } : w));
      alert("Prize redeemed successfully!");
    } catch (error) {
      console.error("Error redeeming prize:", error);
    }
  };

  // 🔥 NAYA FUNCTION: User ko Ticket Bhejna
  const handleAddTicket = async () => {
    if (!ticketMobile || ticketAmount <= 0) {
      alert("Please enter a valid mobile number and ticket amount.");
      return;
    }
    
    setTicketLoading(true);
    try {
      // 1. Mobile number se user dhoondo
      const q = query(collection(db, "users"), where("mobile", "==", ticketMobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("No user found with this mobile number. Please check again.");
        setTicketLoading(false);
        return;
      }

      // 2. User mil gaya, toh uski ticket badha do
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, "users", userDoc.id), {
        tickets: increment(ticketAmount)
      });

      alert(`Success! Added ${ticketAmount} ticket(s) to ${userDoc.data().name || "Customer"}'s account.`);
      
      // Modal band kardo aur state reset kardo
      setShowTicketModal(false);
      setTicketMobile("");
      setTicketAmount(1);

    } catch (error) {
      console.error("Error adding tickets:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setTicketLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      
      {/* HEADER SECTION */}
      <div style={styles.headerRow}>
        <h2 style={styles.header}>🏆 Lucky Draw Management</h2>
        
        {/* 🔥 Bonus Ticket Button */}
        <button onClick={() => setShowTicketModal(true)} style={styles.addTicketBtn}>
          🎟️ Add Bonus Ticket
        </button>
      </div>

      {/* CONTROLS SECTION */}
      <div style={styles.controlsBar}>
        <input 
          type="text" 
          placeholder="Search by Name or Mobile..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.input}
        />

        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          style={styles.select}
        >
          <option value="all">Total All Prizes</option>
          <option value="active">🟢 Active (Valid)</option>
          <option value="expiring_soon">🟠 Expiring Soon (&lt; 2 Days)</option>
          <option value="redeemed">🔵 Redeemed (Used)</option>
          <option value="expired">🔴 Expired</option>
        </select>
        
        <button onClick={fetchWinnings} style={styles.refreshBtn}>🔄 Refresh</button>
      </div>

      {/* DATA TABLE SECTION */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <p style={{ textAlign: "center", padding: "20px", color: "white" }}>Loading Database...</p>
        ) : filteredWinnings.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>No prizes found for this filter.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Mobile</th>
                <th style={styles.th}>Prize Won</th>
                <th style={styles.th}>Won On</th>
                <th style={styles.th}>Expires On</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWinnings.map((win) => {
                const now = new Date();
                const isExpired = win.status === "expired" || (win.status === "active" && win.expiresAt < now);
                const isRedeemed = win.status === "redeemed";
                
                let badgeColor = "#10b981"; 
                let statusText = "Active";
                
                if (isRedeemed) {
                  badgeColor = "#3b82f6"; 
                  statusText = "Redeemed";
                } else if (isExpired) {
                  badgeColor = "#ef4444"; 
                  statusText = "Expired";
                } else {
                  const diffTime = Math.abs(win.expiresAt - now);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  if(diffDays <= 2) {
                    badgeColor = "#f97316"; 
                    statusText = "Expiring Soon";
                  }
                }

                return (
                  <tr key={win.id} style={styles.tr}>
                    <td style={{...styles.td, fontWeight: "bold"}}>{win.userName}</td>
                    <td style={styles.td}>{win.userMobile}</td>
                    <td style={{...styles.td, fontWeight: "bold", color: "#eab308"}}>{win.prizeName}</td>
                    <td style={styles.td}>{win.wonAt.toLocaleDateString()}</td>
                    <td style={styles.td}>{win.expiresAt.toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <span style={{...styles.statusBadge, backgroundColor: badgeColor}}>
                        {statusText}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {win.status === "active" && !isExpired && (
                        <button 
                          onClick={() => handleRedeem(win.id)}
                          style={styles.actionBtn}
                        >
                          Redeem
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 🔥 ADD TICKET MODAL */}
      {showTicketModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ margin: "0 0 15px 0", color: "#111827" }}>Send Bonus Spin Tickets</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "#4b5563" }}>
                Customer Mobile Number
              </label>
              <input 
                type="tel" 
                placeholder="e.g. 9876543210" 
                value={ticketMobile}
                onChange={(e) => setTicketMobile(e.target.value)}
                style={styles.modalInput}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "#4b5563" }}>
                Number of Tickets
              </label>
              <input 
                type="number" 
                min="1"
                max="10"
                value={ticketAmount}
                onChange={(e) => setTicketAmount(Number(e.target.value))}
                style={styles.modalInput}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowTicketModal(false)}
                style={styles.modalCancelBtn}
                disabled={ticketLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTicket}
                style={styles.modalSendBtn}
                disabled={ticketLoading}
              >
                {ticketLoading ? "Sending..." : "Send Tickets"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Styles
const styles = {
  container: { padding: "20px", color: "#090a0a", fontFamily: "'Inter', sans-serif" },
  
  // Header Row with Button
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "10px" },
  header: { margin: 0, color: "#131111" },
  addTicketBtn: { background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },

  controlsBar: { display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "200px", padding: "10px 15px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white" },
  select: { padding: "10px 15px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "white", cursor: "pointer" },
  refreshBtn: { padding: "10px 20px", borderRadius: "8px", border: "none", background: "#334155", color: "white", cursor: "pointer", fontWeight: "bold" },
  tableWrapper: { overflowX: "auto", background: "#1e293b", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" },
  tableHead: { background: "#0f172a" },
  th: { padding: "15px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #334155", transition: "background 0.2s" },
  td: { padding: "15px", color: "#cbd5e1" },
  statusBadge: { padding: "5px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", color: "#fff" },
  actionBtn: { padding: "8px 15px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },

  // 🔥 Modal Styles
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0, 0, 0, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "12px", width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  modalInput: { width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: "1rem" },
  modalCancelBtn: { padding: "10px 15px", background: "#e5e7eb", color: "#4b5563", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  modalSendBtn: { padding: "10px 15px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }
};