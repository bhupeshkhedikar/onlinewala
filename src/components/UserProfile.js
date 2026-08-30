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

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="profile-page-state">
        <div className="loading-card">
          <div className="loading-spinner"></div>

          <h3>
            डॅशबोर्ड लोड होत आहे
          </h3>

          <p>
            तुमचे खाते तयार केले जात आहे, कृपया प्रतीक्षा करा.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     LOGIN REQUIRED
  ========================================================= */

  if (!user) {
    return (
      <div className="profile-page-state">
        <div className="empty-login-card">

          <div className="state-icon">
            🔐
          </div>

          <h3>
            लॉगिन आवश्यक आहे
          </h3>

          <p>
            तुमचा डॅशबोर्ड पाहण्यासाठी कृपया लॉगिन करा.
          </p>

        </div>
      </div>
    );
  }

  /* =========================================================
     DATA
  ========================================================= */

  const applications = [...(user?.applications || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const documents = user?.documents || [];

  const filteredDocuments = documents.filter((doc) => {
    const searchTerm = docSearchQuery.toLowerCase().trim();

    const title = (
      doc.title ||
      doc.name ||
      ""
    ).toLowerCase();

    return title.includes(searchTerm);
  });

  /* =========================================================
     DATE FORMAT
  ========================================================= */

  const formatDate = (dateVal) => {
    if (!dateVal) return "उपलब्ध नाही";

    if (dateVal.seconds) {
      return new Date(
        dateVal.seconds * 1000
      ).toLocaleDateString(
        "mr-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    }

    const d = new Date(dateVal);

    return isNaN(d.getTime())
      ? "उपलब्ध नाही"
      : d.toLocaleDateString(
          "mr-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );
  };

  /* =========================================================
     FILE SIZE
  ========================================================= */

  const formatFileSize = (size) => {
    if (!size && size !== 0) {
      return "आकार उपलब्ध नाही";
    }

    const sizeStr = String(size)
      .toUpperCase()
      .trim();

    const numericValue = parseFloat(
      sizeStr.replace(/[^0-9.]/g, "")
    );

    if (isNaN(numericValue)) {
      return "आकार उपलब्ध नाही";
    }

    let bytes = numericValue;

    if (sizeStr.includes("KB")) {
      bytes = numericValue * 1024;
    } else if (sizeStr.includes("MB")) {
      bytes = numericValue * 1024 * 1024;
    } else if (sizeStr.includes("GB")) {
      bytes = numericValue * 1024 * 1024 * 1024;
    }

    if (bytes === 0) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes.toFixed(0)} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* =========================================================
     PAYMENT STATS
  ========================================================= */

  const totalPaid = applications
    .filter(
      (app) =>
        app.paid === true ||
        app.paid === "true"
    )
    .reduce(
      (sum, app) =>
        sum + Number(app.total || 0),
      0
    );

  const pendingApplications =
    applications.filter(
      (app) =>
        app.paid !== true &&
        app.paid !== "true"
    ).length;

  /* =========================================================
     INITIALS
  ========================================================= */

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((word) =>
          word.charAt(0)
        )
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  /* =========================================================
     TAB CHANGE
  ========================================================= */

  const handleTabChange = (tab) => {
    setActiveTab(tab);

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

      {/* =====================================================
          HERO HEADER
      ===================================================== */}

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
                title="ऑनलाईन"
              ></span>

            </div>

            <div className="profile-user-details">

              <span className="profile-welcome">
                पुन्हा स्वागत आहे 👋
              </span>

              <h1>
                {user?.name || "ग्राहक"}
              </h1>

              <p>
                <span className="phone-icon">
                  📞
                </span>

                {user?.mobile ||
                  "मोबाईल नंबर जोडलेला नाही"}
              </p>

            </div>

          </div>


          <div className="profile-header-right">

            <div className="wallet-card">

              <div className="wallet-iconn">
                ₹
              </div>

              <div>
                <span>
                  एकूण भरलेली रक्कम
                </span>

                <strong>
                  ₹{totalPaid}
                </strong>
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
                नवीन सेवा बुक करा
              </span>

            </button>

          </div>

        </div>

      </header>


      {/* =====================================================
          QUICK STATISTICS
      ===================================================== */}

      <section className="profile-stats">

        <button
          className="stat-card stat-blue"
          onClick={() =>
            handleTabChange("online")
          }
        >

          <div className="stat-icon">
            🌐
          </div>

          <div className="stat-content">

            <span>
              ऑनलाईन सेवा
            </span>

            <strong>
              बुकिंग पहा
            </strong>

          </div>

          <span className="stat-arrow">
            →
          </span>

        </button>


        <button
          className="stat-card stat-purple"
          onClick={() =>
            handleTabChange("offline")
          }
        >

          <div className="stat-icon">
            📁
          </div>

          <div className="stat-content">

            <span>
              अर्ज
            </span>

            <strong>
              {applications.length}
            </strong>

          </div>

          <span className="stat-arrow">
            →
          </span>

        </button>


        <button
          className="stat-card stat-green"
          onClick={() =>
            handleTabChange("docs")
          }
        >

          <div className="stat-icon">
            📄
          </div>

          <div className="stat-content">

            <span>
              कागदपत्रे
            </span>

            <strong>
              {documents.length}
            </strong>

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

            <span>
              प्रलंबित पेमेंट
            </span>

            <strong>
              {pendingApplications}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          NAVIGATION
      ===================================================== */}

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
              ऑनलाईन बुकिंग
            </strong>

            <span>
              तुमची बुकिंग व्यवस्थापित करा
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
              सायबर कॅफे अर्ज
            </strong>

            <span>
              अर्जांची माहिती पहा
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
              माझी कागदपत्रे
            </strong>

            <span>
              तुमच्या फाईल्स पहा
            </span>

          </div>

          <span className="nav-arrow">
            →
          </span>

        </button>

      </nav>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="tab-content-wrapper">

        {/* ===================================================
            ONLINE BOOKINGS
        =================================================== */}

        {activeTab === "online" && (

          <section className="tab-content fade-in">

            <div className="section-heading">

              <div>

                <span className="section-eyebrow">
                  सेवा
                </span>

                <h2 className="section-title">
                  माझी ऑनलाईन बुकिंग
                </h2>

                <p className="section-description">
                  तुमची ऑनलाईन सेवा बुकिंग पहा आणि व्यवस्थापित करा.
                </p>

              </div>


              <button
                className="section-action"
                onClick={() =>
                  setIsBookingModalOpen(true)
                }
              >
                + नवीन बुकिंग
              </button>

            </div>


            <UserBookings user={user} />

          </section>

        )}


        {/* ===================================================
            OFFLINE APPLICATIONS
        =================================================== */}

        {activeTab === "offline" && (

          <section className="tab-content fade-in">

            <div className="section-header-flex">

              <div>

                <span className="section-eyebrow">
                  सायबर कॅफे
                </span>

                <h2
                  className="section-title"
                  style={{
                    marginBottom: 0,
                  }}
                >
                  सायबर कॅफे अर्ज
                </h2>

              </div>


              <span className="count-pill">

                {applications.length}

                {" "}

                अर्ज

              </span>

            </div>


            {applications.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📭
                </div>

                <h3>
                  अजून कोणतेही अर्ज नाहीत
                </h3>

                <p>
                  तुमचे सायबर कॅफे अर्ज येथे दिसतील.
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
                                    "अर्ज"}
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
                              ? "पैसे भरले"
                              : "प्रलंबित"}

                          </span>

                        </div>


                        <div className="saas-card-mid">

                          <div className="saas-fee-box">

                            <div className="fee-item">

                              <span className="fee-label">
                                शासकीय शुल्क
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
                                सेवा शुल्क
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
                                    सवलत
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
                                उपएकूण: ₹
                                {app.subTotal}
                              </small>

                            )}

                            <span>

                              एकूण

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
                                अर्ज
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
                                कागदपत्रे
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


        {/* ===================================================
            DOCUMENTS
        =================================================== */}

        {activeTab === "docs" && (

          <section className="tab-content fade-in">

            <div className="docs-header-row">

              <div>

                <span className="section-eyebrow">
                  फाईल व्यवस्थापन
                </span>


                <div className="docs-title-row">

                  <h2 className="section-title">
                    माझी कागदपत्रे
                  </h2>

                  <span className="count-pill">
                    {documents.length} फाईल्स
                  </span>

                </div>


                <p className="section-description">
                  तुमची अपलोड केलेली कागदपत्रे सुरक्षितपणे पहा.
                </p>

              </div>


              {documents.length > 0 && (

                <div className="saas-search-wrapper">

                  <span className="search-icon">
                    🔍
                  </span>

                  <input
                    type="text"
                    placeholder="फाईल शोधा..."
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
                  कोणतीही कागदपत्रे अपलोड केलेली नाहीत
                </h3>

                <p>
                  तुमच्या अपलोड केलेल्या फाईल्स येथे दिसतील.
                </p>

              </div>

            ) : filteredDocuments.length === 0 ? (

              <div className="empty-state-search">

                <div className="empty-search-icon">
                  🔍
                </div>

                <h3>
                  कागदपत्रे सापडली नाहीत
                </h3>

                <p>
                  "{docSearchQuery}" या नावाची कोणतीही फाईल सापडली नाही.
                </p>

                <button
                  onClick={() =>
                    setDocSearchQuery("")
                  }
                  className="clear-search-btn"
                >
                  शोध साफ करा
                </button>

              </div>

            ) : (

              <div className="saas-docs-grid">

                {filteredDocuments.map(
                  (document, i) => {

                    const fileExt =
                      document.url
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
                                "कागदपत्र"
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
                              👁 पहा
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
                              "नाव नसलेली फाईल"}
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


      {/* =====================================================
          BOOKING MODAL
      ===================================================== */}

      {isBookingModalOpen && user && (

        <BookingModal
          user={user}
          onClose={() =>
            setIsBookingModalOpen(false)
          }
        />

      )}


      {/* =====================================================
          DOCUMENT PREVIEW
      ===================================================== */}

      {preview && (

        <div
          className="preview-modal-overlay"
          onClick={() =>
            setPreview(null)
          }
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
                  कागदपत्र पूर्वावलोकन
                </span>

              </div>


              <button
                className="close-btn"
                onClick={() =>
                  setPreview(null)
                }
                aria-label="पूर्वावलोकन बंद करा"
              >
                ✕
              </button>

            </div>


            <div className="preview-modal-body">

              {preview.type === "pdf" ? (

                <iframe
                  src={preview.url}
                  title="कागदपत्र पूर्वावलोकन"
                />

              ) : (

                <img
                  src={preview.url}
                  alt="कागदपत्र पूर्वावलोकन"
                />

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}