import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the View Details Modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Status Options
  const statusOptions = ["Pending", "Accepted", "In Progress", "Completed", "Rejected"];
  const paymentOptions = ["Pending", "Paid", "Failed", "Refunded"];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "bookings"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by newest first
      data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAppliedOn = (timestamp) => {
    if (!timestamp) return "N/A";
    const d = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-IN", { 
      day: "2-digit", month: "short", year: "numeric", 
      hour: "2-digit", minute: "2-digit", hour12: true 
    });
  };

  // Multi-Status Update Handlers
  const handlePaymentChange = async (id, newStatus) => {
    await updateDoc(doc(db, "bookings", id), { paymentStatus: newStatus });
    fetchBookings(); 
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({ ...selectedBooking, paymentStatus: newStatus });
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    await updateDoc(doc(db, "bookings", id), { status: newStatus });
    fetchBookings(); 
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({ ...selectedBooking, status: newStatus });
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading Bookings...</div>;

  return (
    <div style={{ marginTop: '30px', background: '#fff', padding: '20px', borderRadius: '8px', position: 'relative' }}>
      <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>Recent Service Bookings</h3>
      
      {bookings.length === 0 ? <p>No bookings found.</p> : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left', fontSize: '14px' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Mobile</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Service</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Appt Slot</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Total (₹)</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Payment</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #e5e7eb', fontSize: '13px', background: '#fff' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#111827' }}>{b.userName || "N/A"}</td>
                  <td style={{ padding: '12px', color: '#4b5563' }}>{b.userMobile || "N/A"}</td>
                  <td style={{ padding: '12px', color: '#2563eb', fontWeight: '600' }}>{b.service}</td>
                  <td style={{ padding: '12px', color: '#374151' }}>
                    {b.date || "N/A"} <br/>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{b.time}</span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#111827' }}>₹{b.total || 0}</td>

                  {/* Payment Status Dropdown */}
                  <td style={{ padding: '12px' }}>
                    <select 
                      value={b.paymentStatus || "Pending"} 
                      onChange={(e) => handlePaymentChange(b.id, e.target.value)}
                      style={{
                        padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db',
                        background: b.paymentStatus === 'Paid' ? '#dcfce7' : b.paymentStatus === 'Failed' ? '#fee2e2' : '#fef3c7',
                        color: b.paymentStatus === 'Paid' ? '#166534' : b.paymentStatus === 'Failed' ? '#991b1b' : '#92400e',
                        fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      {paymentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>

                  {/* Work Status Dropdown */}
                  <td style={{ padding: '12px' }}>
                    <select 
                      value={b.status || "Pending"} 
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      style={{
                        padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db',
                        background: b.status === 'Completed' ? '#dcfce7' : b.status === 'In Progress' ? '#dbeafe' : b.status === 'Rejected' ? '#fee2e2' : '#f3f4f6',
                        color: '#1f2937', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>

                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedBooking(b)}
                      style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔥 DETAILED POPUP MODAL (100% RESPONSIVE) */}
      {selectedBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '10px' }}>
          
          <div style={{ background: '#fff', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '95vh' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Booking Details</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Applied on: {formatAppliedOn(selectedBooking.createdAt)}</p>
              </div>
              <button onClick={closeModal} style={{ background: '#e2e8f0', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', color: '#475569', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>✕</button>
            </div>

            {/* Modal Body (Smooth Scrollable inside) */}
            <div style={{ padding: '15px 20px', overflowY: 'auto', flexGrow: 1, WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Row: Customer & Service Info (Fluid Flexbox) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                
                {/* Customer Box */}
                <div style={{ flex: '1 1 250px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>👤 Customer Info</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Name:</span> <strong style={{ fontSize: '13px', color: '#0f172a', textAlign: 'right' }}>{selectedBooking.userName || "N/A"}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Mobile:</span> <strong style={{ fontSize: '13px', color: '#0f172a', textAlign: 'right' }}>{selectedBooking.userMobile || "N/A"}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Email:</span> <strong style={{ fontSize: '13px', color: '#0f172a', wordBreak: 'break-all', textAlign: 'right' }}>{selectedBooking.userEmail || "N/A"}</strong></div>
                  </div>
                </div>

                {/* Service Box */}
                <div style={{ flex: '1 1 250px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>⚙️ Service Info</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Service:</span> <strong style={{ fontSize: '13px', color: '#2563eb', textAlign: 'right' }}>{selectedBooking.service}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Date:</span> <strong style={{ fontSize: '13px', color: '#0f172a', textAlign: 'right' }}>{selectedBooking.date}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px' }}><span style={{ color: '#64748b', fontSize: '13px' }}>Time:</span> <strong style={{ fontSize: '13px', color: '#0f172a', textAlign: 'right' }}>{selectedBooking.time}</strong></div>
                  </div>
                </div>

              </div>

              {/* 🔥 FIXED: Form Details (Bulletproof CSS for long text/arrays) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: '' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 15px', borderBottom: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: 0, color: '#334155', fontSize: '14px' }}>📝 Form Details (Entered by User)</h4>
                </div>
                <div style={{ padding: '15px', background: '#fff'}}>
                  {selectedBooking.customDetails && Object.keys(selectedBooking.customDetails).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {Object.entries(selectedBooking.customDetails).map(([key, value]) => {
                        // Handle cases where user data might be an object/array
                        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                        
                        return (
                          <div key={key} style={{ flex: '1 1 200px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{key}</span>
                            {/* Inner Scroll for extremely long texts */}
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                              {displayValue || "Not Provided"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px 0' }}>
                      No additional form details provided for this booking.
                    </p>
                  )}
                </div>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', fontSize: '14px' }}>📂 Uploaded Documents</h4>
                {selectedBooking.documents?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {selectedBooking.documents.map((doc, i) => (
                      <a 
                        key={i} 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#e0e7ff', color: '#3730a3', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '600', border: '1px solid #c7d2fe', transition: '0.2s', maxWidth: '100%', wordBreak: 'break-word' }}
                      >
                        <span style={{ fontSize: '16px' }}>{doc.type?.includes("pdf") ? "📄" : "🖼️"}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {doc.name}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', fontSize: '13px' }}>
                    No documents were uploaded.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer: Financials & Status Updates (Fluid for Mobile) */}
            <div style={{ padding: '15px 20px', borderTop: '1px solid #e5e7eb', background: '#fefce8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', flexShrink: 0 }}>
              
              {/* Pricing */}
              <div style={{ flex: '1 1 100%' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#854d0e', fontWeight: '500' }}>
                  Govt: ₹{selectedBooking.govtFee || 0} &nbsp;|&nbsp; Service: ₹{selectedBooking.serviceCharge || 0}
                </p>
                <h3 style={{ margin: 0, color: '#713f12', fontSize: '18px' }}>Total: ₹{selectedBooking.total || 0}</h3>
              </div>
              
              {/* Update Controls (Full width on small phones) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', fontSize: '10px', marginBottom: '4px', color: '#a16207', fontWeight: 'bold', textTransform: 'uppercase' }}>Payment</label>
                  <select 
                    value={selectedBooking.paymentStatus || "Pending"} 
                    onChange={(e) => handlePaymentChange(selectedBooking.id, e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #fde047', background: '#fff', fontWeight: 'bold', color: '#3f6212', cursor: 'pointer', outline: 'none' }}
                  >
                    {paymentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', fontSize: '10px', marginBottom: '4px', color: '#a16207', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</label>
                  <select 
                    value={selectedBooking.status || "Pending"} 
                    onChange={(e) => handleStatusChange(selectedBooking.id, e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #fde047', background: '#fff', fontWeight: 'bold', color: '#3f6212', cursor: 'pointer', outline: 'none' }}
                  >
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}