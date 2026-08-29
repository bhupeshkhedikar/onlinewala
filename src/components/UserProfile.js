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
            setUser({
              ...currentUser,
              ...userDocSnap.data(),
            });
          } else {
            setUser(currentUser);
          }
        } catch (error) {
          console.error(
            "Error fetching user data from database:",
            error
          );
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
    return (
      <div className="profile-page-state">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <h3>Loading dashboard</h3>
          <p>Please wait while we prepare your account.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page-state">
        <div className="empty-login-card">
          <div className="state-icon">🔐</div>
          <h3>Login Required</h3>
          <p>Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  const applications = [...(user?.applications || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const documents = user?.documents || [];

  const filteredDocuments = documents.filter((doc) => {
    const searchTerm = docSearchQuery.toLowerCase().trim();
    const title = (doc.title || doc.name || "").toLowerCase();

    return title.includes(searchTerm);
  });

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";

    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    }

    const d = new Date(dateVal);

    return isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const formatFileSize = (size) => {
    if (!size && size !== 0) return "Unknown size";

    const sizeStr = String(size).toUpperCase().trim();

    const numericValue = parseFloat(
      sizeStr.replace(/[^0-9.]/g, "")
    );

    if (isNaN(numericValue)) return "Unknown size";

    let bytes = numericValue;

    if (sizeStr.includes("KB")) {
      bytes = numericValue * 1024;
    } else if (sizeStr.includes("MB")) {
      bytes = numericValue * 1024 * 1024;
    } else if (sizeStr.includes("GB")) {
      bytes = numericValue * 1024 * 1024 * 1024;
    }

    if (bytes === 0) return "0 B";

    if (bytes < 1024) {
      return `${bytes.toFixed(0)} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalPaid = applications
    .filter(
      (app) =>
        app.paid === true ||
        app.paid === "true"
    )
    .reduce(
      (sum, app) => sum + Number(app.total || 0),
      0
    );

  const pendingApplications = applications.filter(
    (app) =>
      app.paid !== true &&
      app.paid !== "true"
  ).length;

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Smoothly move viewport to content on smaller devices
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        document
          .querySelector(".tab-content-wrapper")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 50);
    }
  };

  return (
    <div className="profile-container">

      {/* ========================================
          HERO HEADER
      ======================================== */}
      <header className="profile-header">

        <div className="profile-header-bg">
          <div className="header-orb orb-one"></div>
          <div className="header-orb orb-two"></div>
          <div className="header-grid"></div>
        </div>

        <div className="profile-header-inner">

          <div className="profile-user-card">

            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {userInitials}
              </div>

              <span
                className="profile-online-dot"
                title="Online"
              ></span>
            </div>

            <div className="profile-user-details">
              <span className="profile-welcome">
                Welcome back 👋
              </span>

              <h1>
                {user?.name || "Customer"}
              </h1>

              <p>
                <span className="phone-icon">📞</span>
                {user?.mobile || "No Mobile Added"}
              </p>
            </div>

          </div>

          <div className="profile-header-right">

            <div className="wallet-card">
              <div className="wallet-icon">
                ₹
              </div>

              <div>
                <span>Total Paid</span>
                <strong>₹{totalPaid}</strong>
              </div>
            </div>

            <button
              className="btn-primary main-action"
              onClick={() =>
                setIsBookingModalOpen(true)
              }
            >
              <span className="plus-icon">
                +
              </span>

              <span>
                Book New Service
              </span>
            </button>

          </div>

        </div>
      </header>

      {/* ========================================
          QUICK STATISTICS
      ======================================== */}
      <section className="profile-stats">

        <button
          className="stat-card stat-blue"
          onClick={() => handleTabChange("online")}
        >
          <div className="stat-icon">
            🌐
          </div>

          <div className="stat-content">
            <span>Online Services</span>
            <strong>View Bookings</strong>
          </div>

          <span className="stat-arrow">
            →
          </span>
        </button>

        <button
          className="stat-card stat-purple"
          onClick={() => handleTabChange("offline")}
        >
          <div className="stat-icon">
            📁
          </div>

          <div className="stat-content">
            <span>Applications</span>
            <strong>{applications.length}</strong>
          </div>

          <span className="stat-arrow">
            →
          </span>
        </button>

        <button
          className="stat-card stat-green"
          onClick={() => handleTabChange("docs")}
        >
          <div className="stat-icon">
            📄
          </div>

          <div className="stat-content">
            <span>Documents</span>
            <strong>{documents.length}</strong>
          </div>

          <span className="stat-arrow">
            →
          </span>
        </button>

        <div className="stat-card stat-orange">
          <div className="stat-icon">
            ⏳
          </div>

          <div className="stat-content">
            <span>Pending Payments</span>
            <strong>{pendingApplications}</strong>
          </div>
        </div>

      </section>

      {/* ========================================
          NAVIGATION
      ======================================== */}
      <nav className="icon-nav-grid">

        <button
          className={`nav-item ${
            activeTab === "online"
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleTabChange("online")
          }
        >
          <div className="nav-box nav-blue">
            🌐
          </div>

          <div className="nav-text">
            <strong>
              Online Bookings
            </strong>

            <span>
              Manage your bookings
            </span>
          </div>

          <span className="nav-arrow">
            →
          </span>
        </button>

        <button
          className={`nav-item ${
            activeTab === "offline"
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleTabChange("offline")
          }
        >
          <div className="nav-box nav-purple">
            📁
          </div>

          <div className="nav-text">
            <strong>
              Cyber Cafe Apps
            </strong>

            <span>
              Track applications
            </span>
          </div>

          <span className="nav-arrow">
            →
          </span>
        </button>

        <button
          className={`nav-item ${
            activeTab === "docs"
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleTabChange("docs")
          }
        >
          <div className="nav-box nav-green">
            📄
          </div>

          <div className="nav-text">
            <strong>
              My Documents
            </strong>

            <span>
              Access your files
            </span>
          </div>

          <span className="nav-arrow">
            →
          </span>
        </button>

      </nav>

      {/* ========================================
          CONTENT
      ======================================== */}
      <main className="tab-content-wrapper">

        {/* ONLINE BOOKINGS */}
        {activeTab === "online" && (
          <section className="tab-content fade-in">

            <div className="section-heading">

              <div>
                <span className="section-eyebrow">
                  SERVICES
                </span>

                <h2 className="section-title">
                  My Online Bookings
                </h2>

                <p className="section-description">
                  View and manage your online
                  service bookings.
                </p>
              </div>

              <button
                className="section-action"
                onClick={() =>
                  setIsBookingModalOpen(true)
                }
              >
                + New Booking
              </button>

            </div>

            <UserBookings user={user} />

          </section>
        )}

        {/* OFFLINE APPLICATIONS */}
        {activeTab === "offline" && (
          <section className="tab-content fade-in">

            <div className="section-header-flex">

              <div>
                <span className="section-eyebrow">
                  CYBER CAFE
                </span>

                <h2
                  className="section-title"
                  style={{ marginBottom: 0 }}
                >
                  Cyber Cafe Applications
                </h2>
              </div>

              <span className="count-pill">
                {applications.length}{" "}
                {applications.length === 1
                  ? "Application"
                  : "Applications"}
              </span>

            </div>

            {applications.length === 0 ? (
              <div className="empty-state">

                <div className="empty-icon">
                  📭
                </div>

                <h3>
                  No applications yet
                </h3>

                <p>
                  Your cyber cafe applications
                  will appear here.
                </p>

              </div>
            ) : (
              <div className="saas-cards-list">

                {applications.map(
                  (app, i) => {

                    const isPaid =
                      app.paid === true ||
                      app.paid === "true";

                    return (
                      <article
                        key={i}
                        className={`saas-form-card ${
                          isPaid
                            ? "application-paid"
                            : "application-pending"
                        }`}
                      >

                        <div className="saas-card-top">

                          <div className="saas-app-info">

                            <div className="app-title-row">

                              <div className="app-type-icon">
                                📋
                              </div>

                              <div>
                                <h3 className="saas-app-name">
                                  {app.name ||
                                    "Application"}
                                </h3>

                                <span className="saas-app-date">
                                  📅{" "}
                                  {formatDate(
                                    app.date
                                  )}
                                </span>
                              </div>

                            </div>

                          </div>

                          <span
                            className={`saas-badge ${
                              isPaid
                                ? "paid"
                                : "pending"
                            }`}
                          >
                            <span className="status-dot"></span>
                            {isPaid
                              ? "Paid"
                              : "Pending"}
                          </span>

                        </div>

                        <div className="saas-card-mid">

                          <div className="saas-fee-box">

                            <div className="fee-item">
                              <span className="fee-label">
                                Govt Fee
                              </span>

                              <span className="fee-val">
                                ₹
                                {app.govtFee ||
                                  0}
                              </span>
                            </div>

                            <div className="fee-divider"></div>

                            <div className="fee-item">
                              <span className="fee-label">
                                Service
                              </span>

                              <span className="fee-val">
                                ₹
                                {app.serviceCharge ||
                                  0}
                              </span>
                            </div>

                            {app.discountValue >
                              0 && (
                              <>
                                <div className="fee-divider"></div>

                                <div className="fee-item discount-row">
                                  <span className="fee-label">
                                    Discount
                                  </span>

                                  <span className="fee-val">
                                    -
                                    {app.discountType ===
                                    "percent"
                                      ? `${app.discountValue}%`
                                      : `₹${
                                          app.discountAmount ||
                                          0
                                        }`}
                                  </span>
                                </div>
                              </>
                            )}

                          </div>

                          {app.note && (
                            <div className="saas-note-box">
                              <span className="saas-note-icon">
                                ℹ
                              </span>

                              <span>
                                {app.note}
                              </span>
                            </div>
                          )}

                        </div>

                        <div className="saas-card-bottom">

                          <div className="saas-total">

                            {app.discountValue >
                              0 && (
                              <small>
                                Subtotal: ₹
                                {app.subTotal}
                              </small>
                            )}

                            <span>
                              Total

                              <strong>
                                ₹{app.total || 0}
                              </strong>
                            </span>

                          </div>

                          <div className="saas-action-btns">

                            <button
                              className={`saas-btn-outline ${
                                !app.formUrl
                                  ? "disabled"
                                  : ""
                              }`}
                              onClick={() =>
                                app.formUrl &&
                                setPreview({
                                  type: "pdf",
                                  url: app.formUrl,
                                })
                              }
                              disabled={
                                !app.formUrl
                              }
                            >
                              📄
                              <span>
                                Form
                              </span>
                            </button>

                            <button
                              className={`saas-btn-outline ${
                                !app.docsUrl
                                  ? "disabled"
                                  : ""
                              }`}
                              onClick={() =>
                                app.docsUrl &&
                                setPreview({
                                  type: "pdf",
                                  url: app.docsUrl,
                                })
                              }
                              disabled={
                                !app.docsUrl
                              }
                            >
                              📎
                              <span>
                                Docs
                              </span>
                            </button>

                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>
        )}

        {/* DOCUMENTS */}
        {activeTab === "docs" && (
          <section className="tab-content fade-in">

            <div className="docs-header-row">

              <div>
                <span className="section-eyebrow">
                  FILE MANAGER
                </span>

                <div className="docs-title-row">

                  <h2 className="section-title">
                    My Documents
                  </h2>

                  <span className="count-pill">
                    {documents.length} Files
                  </span>

                </div>

                <p className="section-description">
                  Securely access your uploaded
                  documents.
                </p>
              </div>

              {documents.length > 0 && (
                <div className="saas-search-wrapper">

                  <span className="search-icon">
                    🔍
                  </span>

                  <input
                    type="text"
                    placeholder="Search files..."
                    value={docSearchQuery}
                    onChange={(e) =>
                      setDocSearchQuery(
                        e.target.value
                      )
                    }
                    className="saas-search-input"
                  />

                  {docSearchQuery && (
                    <button
                      className="search-clear"
                      onClick={() =>
                        setDocSearchQuery("")
                      }
                    >
                      ×
                    </button>
                  )}

                </div>
              )}

            </div>

            {documents.length === 0 ? (
              <div className="empty-state">

                <div className="empty-icon">
                  📂
                </div>

                <h3>
                  No documents uploaded
                </h3>

                <p>
                  Your uploaded files will
                  appear here.
                </p>

              </div>
            ) : filteredDocuments.length ===
              0 ? (
              <div className="empty-state-search">

                <div className="empty-search-icon">
                  🔍
                </div>

                <h3>
                  No documents found
                </h3>

                <p>
                  No files match "
                  {docSearchQuery}"
                </p>

                <button
                  onClick={() =>
                    setDocSearchQuery("")
                  }
                  className="clear-search-btn"
                >
                  Clear Search
                </button>

              </div>
            ) : (
              <div className="saas-docs-grid">

                {filteredDocuments.map(
                  (document, i) => {

                    const fileExt = document.url
                      ? document.url
                          .split("?")[0]
                          .split(".")
                          .pop()
                          .toUpperCase()
                      : "FILE";

                    const displayType =
                      document.type
                        ? document.type
                            .split("/")
                            .pop()
                            .toUpperCase()
                        : fileExt;

                    const isImage =
                      document.type
                        ? document.type.includes(
                            "image"
                          )
                        : [
                            "JPG",
                            "JPEG",
                            "PNG",
                            "WEBP",
                            "GIF",
                          ].includes(
                            fileExt
                          );

                    return (
                      <article
                        key={i}
                        className="saas-doc-card"
                        onClick={() =>
                          document.url &&
                          setPreview({
                            type: isImage
                              ? "img"
                              : "pdf",
                            url: document.url,
                          })
                        }
                      >

                        <div className="saas-doc-preview">

                          {isImage ? (
                            <img
                              src={document.url}
                              alt={
                                document.title ||
                                document.name ||
                                "Document"
                              }
                              className="saas-doc-thumb"
                              loading="lazy"
                            />
                          ) : (
                            <div className="saas-doc-generic">
                              <span>
                                {displayType.substring(
                                  0,
                                  4
                                )}
                              </span>
                            </div>
                          )}

                          <div className="doc-view-overlay">
                            <span>
                              👁 View
                            </span>
                          </div>

                        </div>

                        <div className="saas-doc-info">

                          <p
                            className="saas-doc-title"
                            title={
                              document.title ||
                              document.name
                            }
                          >
                            {document.title ||
                              document.name ||
                              "Untitled File"}
                          </p>

                          <div className="saas-doc-meta">

                            <span className="saas-doc-badge">
                              {displayType.substring(
                                0,
                                4
                              )}
                            </span>

                            <span className="saas-doc-size">
                              {formatFileSize(
                                document.size
                              )}
                            </span>

                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>
        )}

      </main>

      {/* BOOKING MODAL */}
      {isBookingModalOpen && user && (
        <BookingModal
          user={user}
          onClose={() =>
            setIsBookingModalOpen(false)
          }
        />
      )}

      {/* DOCUMENT PREVIEW */}
      {preview && (
        <div
          className="preview-modal-overlay"
          onClick={() => setPreview(null)}
        >

          <div
            className="preview-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="preview-modal-header">

              <div>
                <span>
                  DOCUMENT PREVIEW
                </span>
              </div>

              <button
                className="close-btn"
                onClick={() =>
                  setPreview(null)
                }
                aria-label="Close preview"
              >
                ✕
              </button>

            </div>

            <div className="preview-modal-body">

              {preview.type === "pdf" ? (
                <iframe
                  src={preview.url}
                  title="Document Preview"
                />
              ) : (
                <img
                  src={preview.url}
                  alt="Document Preview"
                />
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}