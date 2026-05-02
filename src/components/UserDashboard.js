import React, { useState } from "react";
import "./UserDashboard.css";

export default function UserDashboard({ user }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState("image");

  // Helper to format dates consistently
  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    const d = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal.date || dateVal);
    return d.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const openPreview = (url, type = "image") => {
    setPreviewUrl(url);
    setPreviewType(type || "image");
  };

  // Get initial for Avatar
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="ud-container">
      
      {/* ✨ PREMIUM HEADER */}
      <header className="ud-header">
        <div className="ud-header-profile">
          <div className="ud-avatar">{userInitial}</div>
          <div className="ud-greeting">
            <h1>Welcome back, {user?.name || "Customer"}</h1>
            <p>Manage your active applications and stored documents.</p>
          </div>
        </div>
      </header>

      <div className="ud-grid">
        
        {/* --- SECTION: MY APPLICATIONS --- */}
        <section className="ud-section">
          <div className="ud-section-header">
            <h2 className="ud-section-title">My Applications</h2>
            <span className="ud-count">{user?.applications?.length || 0} Total</span>
          </div>

          {!user?.applications?.length ? (
            <div className="ud-empty-state">
              <span className="ud-empty-icon">📭</span>
              <p>No applications found.</p>
            </div>
          ) : (
            <div className="ud-app-list">
              {user.applications.map((app, i) => (
                <div key={i} className="ud-app-card">
                  
                  <div className="ud-app-info">
                    <div className="ud-app-main">
                      <h3>{app.name}</h3>
                      <span className={`ud-badge ${app.paid ? "paid" : "pending"}`}>
                        {app.paid ? "Paid" : "Pending"}
                      </span>
                    </div>
                    <p className="ud-app-date">Filed on {formatDate(app.date)}</p>
                    {app.note && <p className="ud-app-note">"{app.note}"</p>}
                  </div>

                  <div className="ud-app-actions">
                    <button 
                      className={`ud-btn-view ${!app.formUrl ? "disabled" : ""}`} 
                      onClick={() => app.formUrl && openPreview(app.formUrl)}
                      disabled={!app.formUrl}
                    >
                      📄 Form
                    </button>

                    <button 
                      className={`ud-btn-view secondary ${!app.docsUrl ? "disabled" : ""}`} 
                      onClick={() => app.docsUrl && openPreview(app.docsUrl)}
                      disabled={!app.docsUrl}
                    >
                      📎 Docs
                    </button>
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- SECTION: MY DOCUMENTS --- */}
        <section className="ud-section">
          <div className="ud-section-header">
            <h2 className="ud-section-title">Saved Documents</h2>
            <span className="ud-count">{user?.documents?.length || 0} Files</span>
          </div>

          {!user?.documents?.length ? (
            <div className="ud-empty-state">
              <span className="ud-empty-icon">📂</span>
              <p>No saved documents.</p>
            </div>
          ) : (
            <div className="ud-doc-grid">
              {user.documents.map((doc, i) => {
                const isImage = doc.type?.includes("image");
                return (
                  <div key={i} className="ud-doc-item" onClick={() => openPreview(doc.url, doc.type)}>
                    <div className="ud-doc-icon-wrapper">
                      <span className="ud-doc-icon">{isImage ? "🖼️" : "📄"}</span>
                    </div>
                    <div className="ud-doc-meta">
                      <span className="ud-doc-name">{doc.title || doc.name}</span>
                      <span className="ud-doc-size">{doc.size || "Unknown size"}</span>
                    </div>
                    <button className="ud-doc-view-btn">View</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* --- QUICK VIEW MODAL --- */}
      {previewUrl && (
        <div className="ud-modal" onClick={() => setPreviewUrl(null)}>
          <div className="ud-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="ud-modal-close" onClick={() => setPreviewUrl(null)}>✕</button>
            <div className="ud-viewer">
              {previewType.includes("image") ? (
                <img src={previewUrl} alt="Preview" />
              ) : (
                <iframe src={previewUrl} title="Document Viewer" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}