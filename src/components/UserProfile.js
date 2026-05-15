import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import UserBookings from "./UserBookings";
import BookingModal from "./BookingModal";
import "./UserProfile.css";

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("online");

  const [docSearchQuery, setDocSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUser({ ...currentUser, ...userDocSnap.data() });
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Error fetching user data from database:", error);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p style={{ padding: "40px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>Loading your dashboard...</p>;
  }

  if (!user) {
    return <p style={{ padding: "40px", textAlign: "center", fontSize: "14px", color: "#ef4444" }}>Please log in to view your dashboard.</p>;
  }

const applications = [...(user?.applications || [])].sort(
  (a, b) => new Date(b.date) - new Date(a.date)
);
  const documents = user?.documents || [];

  const filteredDocuments = documents.filter((doc) => {
    const searchTerm = docSearchQuery.toLowerCase();
    const title = (doc.title || doc.name || "").toLowerCase();
    return title.includes(searchTerm);
  });

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatFileSize = (size) => {
    if (!size && size !== 0) return "Unknown size";
    const sizeStr = String(size).toUpperCase().trim();
    const numericValue = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numericValue)) return "Unknown size";

    let bytes = numericValue;
    if (sizeStr.includes("KB")) bytes = numericValue * 1024;
    else if (sizeStr.includes("MB")) bytes = numericValue * 1024 * 1024;
    else if (sizeStr.includes("GB")) bytes = numericValue * 1024 * 1024 * 1024;

    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalOldPaid = applications
    .filter((app) => app.paid === true || app.paid === "true")
    .reduce((sum, app) => sum + Number(app.total || 0), 0);

  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="profile-container">

      {/* 🌟 PREMIUM HEADER CARD */}
      <header className="profile-header">
        <div className="wallet-badge-corner" title="Total Offline Amount Paid">
          <span>Paid:</span> <strong>₹{totalOldPaid}</strong>
        </div>

        <div className="profile-user-card">
          <div className="profile-avatar">{userInitials}</div>
          <div className="profile-user-details">
            <h2>{user?.name || "Customer"}</h2>
            <p>📞 {user?.mobile || "No Mobile Added"}</p>
          </div>
        </div>

        <div className="profile-header-actions">
          <button
            className="btn-primary main-action"
            onClick={() => setIsBookingModalOpen(true)}
          >
            <span className="plus-icon">+</span> Book New Service
          </button>
        </div>
      </header>

      {/* 📱 NAVIGATION */}
      <nav className="icon-nav-grid">
        <button className={`nav-item ${activeTab === "online" ? "active" : ""}`} onClick={() => setActiveTab("online")}>
          <div className="nav-box" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>🌐</div>
          <span>Online Bookings</span>
        </button>

        <button className={`nav-item ${activeTab === "offline" ? "active" : ""}`} onClick={() => setActiveTab("offline")}>
          <div className="nav-box" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>📁</div>
          <span>Cyber Cafe Apps</span>
        </button>

        <button className={`nav-item ${activeTab === "docs" ? "active" : ""}`} onClick={() => setActiveTab("docs")}>
          <div className="nav-box" style={{ background: "linear-gradient(135deg, #14b8a6, #0d9488)" }}>📄</div>
          <span>My Documents</span>
        </button>
      </nav>

      {/* 📄 TAB CONTENT */}
      <main className="tab-content-wrapper">

        {/* TAB 1: ONLINE BOOKINGS */}
        {activeTab === "online" && (
          <section className="tab-content fade-in">
            <h3 className="section-title">My Online Bookings</h3>
            <UserBookings user={user} />
          </section>
        )}

        {/* TAB 2: OFFLINE APPLICATIONS */}
        {activeTab === "offline" && (
          <section className="tab-content fade-in">
            <div className="section-header-flex">
              <h3 className="section-title" style={{ margin: 0 }}>Cyber Cafe Applications</h3>
              <span className="count-pill">{applications.length} Apps</span>
            </div>

            {applications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No offline applications yet.</p>
              </div>
            ) : (
              <div className="saas-cards-list">
                {applications.map((app, i) => (
                  <article key={i} className="saas-form-card">
                    <div className="saas-card-top">
                      <div className="saas-app-info">
                        <h4 className="saas-app-name">{app.name}</h4>
                        <span className="saas-app-date">📅 {formatDate(app.date)}</span>
                      </div>
                      <span className={`saas-badge ${app.paid ? "paid" : "pending"}`}>
                        {app.paid ? "Paid" : "Pending"}
                      </span>
                    </div>

                    <div className="saas-card-mid">
                      <div className="saas-fee-box">

                        <div className="fee-item">
                          <span className="fee-label">Govt Fee</span>
                          <span className="fee-val">
                            ₹{app.govtFee || 0}
                          </span>
                        </div>

                        <div className="fee-divider"></div>

                        <div className="fee-item">
                          <span className="fee-label">Service</span>
                          <span className="fee-val">
                            ₹{app.serviceCharge || 0}
                          </span>
                        </div>

                        {/* 🔥 DISCOUNT DISPLAY */}
                        {app.discountValue > 0 && (
                          <>
                            <div className="fee-divider"></div>

                            <div className="fee-item">
                              <span
                                className="fee-label"
                                style={{ color: "#ef4444" }}
                              >
                                Discount
                              </span>

                              <span
                                className="fee-val"
                                style={{ color: "#ef4444" }}
                              >
                                -
                                {app.discountType === "percent"
                                  ? `${app.discountValue}%`
                                  : `₹${app.discountAmount}`}
                              </span>
                            </div>
                          </>
                        )}

                      </div>

                      {app.note && (
                        <div className="saas-note-box">
                          <span className="saas-note-icon">ℹ️</span> {app.note}
                        </div>
                      )}
                    </div>

                    <div className="saas-card-bottom">
                      <div className="saas-total">

                        <div style={{ display: "flex", flexDirection: "column" }}>

                          {app.discountValue > 0 && (
                            <small
                              style={{
                                color: "#64748b",
                                fontSize: "12px"
                              }}
                            >
                              Subtotal: ₹{app.subTotal}
                            </small>
                          )}

                          <span>
                            Total:
                            {" "}
                            <strong>₹{app.total}</strong>
                          </span>

                        </div>

                      </div>
                      <div className="saas-action-btns">
                        <button
                          className={`saas-btn-outline ${!app.formUrl ? "disabled" : ""}`}
                          onClick={() => app.formUrl && setPreview({ type: "pdf", url: app.formUrl })}
                          disabled={!app.formUrl}
                        >
                          📄 Form
                        </button>
                        <button
                          className={`saas-btn-outline ${!app.docsUrl ? "disabled" : ""}`}
                          onClick={() => app.docsUrl && setPreview({ type: "pdf", url: app.docsUrl })}
                          disabled={!app.docsUrl}
                        >
                          📎 Docs
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: MY DOCUMENTS */}
        {activeTab === "docs" && (
          <section className="tab-content fade-in">
            <div className="docs-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>My Documents</h3>
                <span className="count-pill">{documents.length} Files</span>
              </div>

              {documents.length > 0 && (
                <div className="saas-search-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    className="saas-search-input"
                  />
                </div>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <p>No documents uploaded yet.</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="empty-state-search">
                <p>No documents found matching "{docSearchQuery}".</p>
                <button onClick={() => setDocSearchQuery("")} className="clear-search-btn">Clear Search</button>
              </div>
            ) : (
              <div className="saas-docs-grid">
                {filteredDocuments.map((doc, i) => {
                  const fileExt = doc.url ? doc.url.split('?')[0].split('.').pop().toUpperCase() : "FILE";
                  const displayType = doc.type ? doc.type.split('/').pop().toUpperCase() : fileExt;
                  const isImage = doc.type ? doc.type.includes("image") : ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(fileExt);

                  return (
                    <div key={i} className="saas-doc-card" onClick={() => setPreview({ type: isImage ? "img" : "pdf", url: doc.url })}>
                      <div className="saas-doc-preview">
                        {isImage ? (
                          <img src={doc.url} alt={doc.title || doc.name} className="saas-doc-thumb" loading="lazy" />
                        ) : (
                          <div className="saas-doc-generic">{displayType.substring(0, 4)}</div>
                        )}
                      </div>

                      <div className="saas-doc-info">
                        <p className="saas-doc-title" title={doc.title || doc.name}>{doc.title || doc.name}</p>
                        <div className="saas-doc-meta">
                          <span className="saas-doc-badge">{displayType.substring(0, 4)}</span>
                          <span className="saas-doc-size">{formatFileSize(doc.size)}</span>
                        </div>
                      </div>

                      <div className="saas-doc-hover-action">
                        <span>View File</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* 🔥 BOOKING MODAL */}
      {isBookingModalOpen && user && (
        <BookingModal user={user} onClose={() => setIsBookingModalOpen(false)} />
      )}

      {/* 🔍 PREVIEW MODAL */}
      {preview && (
        <div className="preview-modal-overlay" onClick={() => setPreview(null)}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPreview(null)}>✕</button>
            {preview.type === "pdf" ? (
              <iframe src={preview.url} title="Document Preview" />
            ) : (
              <img src={preview.url} alt="Document Preview" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}