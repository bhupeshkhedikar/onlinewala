import React, { useState } from "react";
import "./UserDashboard.css";

export default function UserDashboard({ user }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState("image");

  // तारीख व्यवस्थित दाखवण्यासाठी
  const formatDate = (dateVal) => {
    if (!dateVal) return "उपलब्ध नाही";

    const d = dateVal.seconds
      ? new Date(dateVal.seconds * 1000)
      : new Date(dateVal.date || dateVal);

    return d.toLocaleDateString("mr-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openPreview = (url, type = "image") => {
    setPreviewUrl(url);
    setPreviewType(type || "image");
  };

  // प्रोफाइलसाठी पहिले अक्षर
  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : "U";

  return (
    <div className="ud-container">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="ud-header">
        <div className="ud-header-profile">

          <div className="ud-avatar">
            {userInitial}
          </div>

          <div className="ud-greeting">
            <h1>
              पुन्हा स्वागत आहे, {user?.name || "ग्राहक"}!
            </h1>

            <p>
              तुमचे अर्ज आणि जतन केलेली कागदपत्रे येथे व्यवस्थापित करा.
            </p>
          </div>

        </div>
      </header>


      <div className="ud-grid">

        {/* =====================================================
            MY APPLICATIONS
        ===================================================== */}

        <section className="ud-section">

          <div className="ud-section-header">

            <h2 className="ud-section-title">
              माझे अर्ज
            </h2>

            <span className="ud-count">
              {user?.applications?.length || 0} अर्ज
            </span>

          </div>


          {!user?.applications?.length ? (

            <div className="ud-empty-state">

              <span className="ud-empty-icon">
                📭
              </span>

              <p>
                कोणतेही अर्ज सापडले नाहीत.
              </p>

            </div>

          ) : (

            <div className="ud-app-list">

              {user.applications.map((app, i) => (

                <div
                  key={i}
                  className="ud-app-card"
                >

                  <div className="ud-app-info">

                    <div className="ud-app-main">

                      <h3>
                        {app.name}
                      </h3>

                      <span
                        className={`ud-badge ${
                          app.paid
                            ? "paid"
                            : "pending"
                        }`}
                      >
                        {app.paid
                          ? "पैसे भरले"
                          : "प्रलंबित"}
                      </span>

                    </div>


                    <p className="ud-app-date">
                      अर्जाची तारीख: {formatDate(app.date)}
                    </p>


                    {app.note && (
                      <p className="ud-app-note">
                        "{app.note}"
                      </p>
                    )}

                  </div>


                  <div className="ud-app-actions">

                    <button
                      className={`ud-btn-view ${
                        !app.formUrl
                          ? "disabled"
                          : ""
                      }`}
                      onClick={() =>
                        app.formUrl &&
                        openPreview(app.formUrl)
                      }
                      disabled={!app.formUrl}
                    >
                      📄 अर्ज पाहा
                    </button>


                    <button
                      className={`ud-btn-view secondary ${
                        !app.docsUrl
                          ? "disabled"
                          : ""
                      }`}
                      onClick={() =>
                        app.docsUrl &&
                        openPreview(app.docsUrl)
                      }
                      disabled={!app.docsUrl}
                    >
                      📎 कागदपत्रे
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>


        {/* =====================================================
            SAVED DOCUMENTS
        ===================================================== */}

        <section className="ud-section">

          <div className="ud-section-header">

            <h2 className="ud-section-title">
              जतन केलेली कागदपत्रे
            </h2>

            <span className="ud-count">
              {user?.documents?.length || 0} फाईल
            </span>

          </div>


          {!user?.documents?.length ? (

            <div className="ud-empty-state">

              <span className="ud-empty-icon">
                📂
              </span>

              <p>
                कोणतीही कागदपत्रे जतन केलेली नाहीत.
              </p>

            </div>

          ) : (

            <div className="ud-doc-grid">

              {user.documents.map((doc, i) => {

                const isImage =
                  doc.type?.includes("image");

                return (

                  <div
                    key={i}
                    className="ud-doc-item"
                    onClick={() =>
                      openPreview(
                        doc.url,
                        doc.type
                      )
                    }
                  >

                    <div className="ud-doc-icon-wrapper">

                      <span className="ud-doc-icon">
                        {isImage
                          ? "🖼️"
                          : "📄"}
                      </span>

                    </div>


                    <div className="ud-doc-meta">

                      <span className="ud-doc-name">
                        {doc.title || doc.name}
                      </span>

                      <span className="ud-doc-size">
                        {doc.size || "आकार उपलब्ध नाही"}
                      </span>

                    </div>


                    <button
                      className="ud-doc-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();

                        openPreview(
                          doc.url,
                          doc.type
                        );
                      }}
                    >
                      पहा
                    </button>

                  </div>

                );

              })}

            </div>

          )}

        </section>

      </div>


      {/* =====================================================
          PREVIEW MODAL
      ===================================================== */}

      {previewUrl && (

        <div
          className="ud-modal"
          onClick={() =>
            setPreviewUrl(null)
          }
        >

          <div
            className="ud-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="ud-modal-close"
              onClick={() =>
                setPreviewUrl(null)
              }
            >
              ✕
            </button>


            <div className="ud-viewer">

              {previewType?.includes("image") ? (

                <img
                  src={previewUrl}
                  alt="कागदपत्र पूर्वावलोकन"
                />

              ) : (

                <iframe
                  src={previewUrl}
                  title="कागदपत्र पूर्वावलोकन"
                />

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}