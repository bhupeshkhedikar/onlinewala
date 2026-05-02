import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "bookings"));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort by newest first
    data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    setBookings(data);
    setLoading(false);
  };

  // 🔥 Helper to format the exact time the user submitted the form
  const formatAppliedOn = (timestamp) => {
    if (!timestamp) return "N/A";
    const d = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", { 
      day: "2-digit", month: "short", year: "numeric", 
      hour: "2-digit", minute: "2-digit", hour12: true 
    });
  };

  // Toggle Payment Status
  const togglePayment = async (id, currentStatus) => {
    const newStatus = currentStatus === "Paid" ? "Pending" : "Paid";
    await updateDoc(doc(db, "bookings", id), { paymentStatus: newStatus });
    fetchBookings(); // Refresh
  };

  // Toggle App Status
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
    fetchBookings(); // Refresh
  };

  if (loading) return <div>Loading Bookings...</div>;

  return (
    <div style={{ marginTop: '30px', background: '#fff', padding: '20px', borderRadius: '8px' }}>
      <h3>Recent Service Bookings</h3>
      
      {bookings.length === 0 ? <p>No bookings found.</p> : (
        <div style={{ overflowX: 'auto' }}>
          {/* Increased minWidth to 1200px to accommodate Name and Mobile nicely */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left', fontSize: '14px' }}>
                {/* 🔥 NEW COLUMNS FOR CONTACT DETAILS */}
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Mobile</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Email</th>
                
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Service</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Appt Date</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Appt Time</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Applied On</th>
                
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Docs</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Govt Fee</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Service</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Total</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Payment</th>
                <th style={{ padding: '10px', borderBottom: '2px solid #e5e7eb' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #ddd', fontSize: '13px' }}>
                  {/* 🔥 ADDED NAME AND MOBILE DATA CELLS */}
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{b.userName || "N/A"}</td>
                  <td style={{ padding: '10px' }}>{b.userMobile || "N/A"}</td>
                  <td style={{ padding: '10px' }}>{b.userEmail || "N/A"}</td>
                  
                  <td style={{ padding: '10px' }}><strong>{b.service}</strong></td>
                  <td style={{ padding: '10px', color: '#374151', whiteSpace: 'nowrap' }}>{b.date || "N/A"}</td>
                  <td style={{ padding: '10px', color: '#374151', whiteSpace: 'nowrap' }}>{b.time || "N/A"}</td>
                  <td style={{ padding: '10px', color: '#6b7280', fontSize: '12px' }}>{formatAppliedOn(b.createdAt)}</td>
                  
                  <td style={{ padding: '10px' }}>
                    {b.documents?.map((doc, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                          📥 {doc.name?.substring(0, 10)}...
                        </a>
                      </div>
                    ))}
                  </td>

                  <td style={{ padding: '10px', color: '#4b5563' }}>₹{b.govtFee || 0}</td>
                  <td style={{ padding: '10px', color: '#4b5563' }}>₹{b.serviceCharge || 0}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#111827' }}>₹{b.total || 0}</td>

                  <td style={{ padding: '10px' }}>
                    <button 
                      onClick={() => togglePayment(b.id, b.paymentStatus)}
                      style={{ background: b.paymentStatus === "Paid" ? '#10b981' : '#f59e0b', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      {b.paymentStatus || "Pending"}
                    </button>
                  </td>

                  <td style={{ padding: '10px' }}>
                     <button 
                      onClick={() => toggleStatus(b.id, b.status)}
                      style={{ background: b.status === "Completed" ? '#10b981' : '#6b7280', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      {b.status || "Pending"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}