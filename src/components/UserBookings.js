import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import "./UserBookings.css"; // 🔥 Nayi CSS file link kar di

export default function UserBookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(""); 
    
    try {
      const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const fetchedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort newest bookings first
     // 🔥 SORT NEWEST BOOKINGS FIRST
fetchedBookings.sort((a, b) => {

  const dateA = a.createdAt?.seconds
    ? a.createdAt.seconds * 1000
    : new Date(a.createdAt || a.date || 0).getTime();

  const dateB = b.createdAt?.seconds
    ? b.createdAt.seconds * 1000
    : new Date(b.createdAt || b.date || 0).getTime();

  return dateB - dateA;
});
      setBookings(fetchedBookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to fetch bookings. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  if (loading) {
    return <div className="ub-loading">Loading your online bookings...</div>;
  }

  if (error) {
    return <div className="ub-error">{error}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="ub-empty-state">
        <span className="ub-empty-icon">🗓️</span>
        <p>You haven't booked any online services yet.</p>
      </div>
    );
  }

  return (
    <div className="ub-list">
      {bookings.map((booking) => {
        // Status colors logic
        const isPaid = booking.paymentStatus === "Paid";
        const isCompleted = booking.status === "Completed";

        return (
          <div key={booking.id} className="ub-card">
            
            {/* Left Side: Booking Details */}
            <div className="ub-info">
              <h4 className="ub-title">{booking.service}</h4>
              <div className="ub-meta">
                <span>📅 {booking.date}</span>
                <span>⏰ {booking.time}</span>
              </div>

              {/* Uploaded Documents */}
              {booking.documents && booking.documents.length > 0 && (
                <div className="ub-docs-section">
                  <span className="ub-docs-label">Attached Documents</span>
                  <div className="ub-docs-list">
                    {booking.documents.map((doc, idx) => (
                      <a 
                        key={idx} 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="ub-doc-link"
                      >
                        📄 {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Pricing and Status */}
            <div className="ub-status-col">
              <div className="ub-price">₹{booking.total}</div>
              
              <div className="ub-badges-wrapper">
                {/* Payment Badge */}
                <div className="ub-badge-group">
                  <span className="ub-badge-label">Payment</span>
                  <span className={`ub-badge ${isPaid ? "ub-success" : "ub-warning"}`}>
                    {booking.paymentStatus || "Pending"}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="ub-badge-group">
                  <span className="ub-badge-label">Status</span>
                  <span className={`ub-badge ${isCompleted ? "ub-success" : "ub-neutral"}`}>
                    {booking.status || "Pending"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}