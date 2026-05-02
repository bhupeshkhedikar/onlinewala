import { useState, useEffect } from "react";
import { db } from "./firebase"; 
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import "./Jobs.css";

export default function Jobs() {
  const [jobsList, setJobsList] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(true);
  
  // 🔥 New State for Top Categories
  const [jobCategory, setJobCategory] = useState("latest"); 

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJobsList(jobsData);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        const snap = await getDocs(collection(db, "jobs"));
        setJobsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const openModal = (job) => {
    setSelectedJob(job);
    setActiveTab("info");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setSelectedJob(null);
    document.body.style.overflow = "auto";
  };

  // 🔥 Filter Jobs based on selected category tab
  const filteredJobs = jobsList.filter(job => {
    const cat = job.category || "latest"; 
    return cat === jobCategory;
  });

  return (
    <div className="jobs-widget">
      <div className="jobs-header">
        <div>
          <h2 className="jobs-title">नवीनतम अपडेट्स</h2>
          <p className="jobs-subtitle">नवीन भरती आणि सूचना</p>
        </div>
        <span className="jobs-count-pill">{loading ? "..." : filteredJobs.length} सक्रिय</span>
      </div>

      {/* 🔥 NEW: Small Tablet-style Category Tabs */}
      <div className="jobs-category-tabs">
        <button 
          className={`job-cat-btn ${jobCategory === "latest" ? "active" : ""}`} 
          onClick={() => setJobCategory("latest")}
        >
          💼 नवीन नोकरी
        </button>
        <button 
          className={`job-cat-btn ${jobCategory === "result" ? "active" : ""}`} 
          onClick={() => setJobCategory("result")}
        >
          🏆 निकाल
        </button>
        <button 
          className={`job-cat-btn ${jobCategory === "admit_card" ? "active" : ""}`} 
          onClick={() => setJobCategory("admit_card")}
        >
          🎟️ प्रवेशपत्र
        </button>
      </div>

      <div className="jobs-list">
        {loading ? (
          <p className="jobs-loading">अपडेट्स तपासत आहे...</p>
        ) : filteredJobs.length === 0 ? (
          <div className="jobs-empty-container">
             <p className="jobs-empty">या विभागात कोणतेही अपडेट्स आढळले नाहीत.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="saas-job-card" onClick={() => openModal(job)}>
              
              {/* NEW Badge at Top Right Corner */}
              {job.isNew && <span className="job-badge-new">नवीन</span>}

              <div className="job-left-content">
                <div className="job-icon-box">
                  {jobCategory === 'latest' ? '💼' : jobCategory === 'result' ? '🏆' : '🎟️'}
                </div>
                <div className="job-info">
                  <span className="job-name">{job.title || "शीर्षक नाही"}</span>
                  {/* 🔥 NEW: Last Date Displayed Below Title */}
                  <span className="job-last-date">
                    ⏳ शेवटची तारीख: <span className="highlight-date-small">{job.lastDate || "माहिती नाही"}</span>
                  </span>
                </div>
              </div>
              
              <button className="job-detail-btn">पाहा</button>
            </div>
          ))
        )}
      </div>

      {/* MODAL (Remains mostly unchanged) */}
      {selectedJob && (
        <div className="job-modal-overlay" onClick={closeModal}>
          <div className="job-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="job-modal-header">
              <div className="job-modal-title-box">
                <h3 className="job-modal-title">{selectedJob.title}</h3>
                <div className="job-modal-tags">
                  <span className="modal-tag-pill">{selectedJob.tag || "अपडेट"}</span>
                  <span className="modal-tag-pill">सरकारी नोकरी</span>
                </div>
              </div>
              <button className="job-modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="job-modal-tabs">
              <button className={`job-tab-btn ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>
                📋 संपूर्ण माहिती 
              </button>
              <button className={`job-tab-btn ${activeTab === "links" ? "active" : ""}`} onClick={() => setActiveTab("links")}>
                🔗 नोटिफिकेशन PDF 
              </button>
            </div>

            {activeTab === "info" && (
              <div className="job-modal-body fade-in">
                <table className="premium-info-table">
                  <tbody>
                    <tr><td>जाहिरात क्र.</td><td><strong>{selectedJob.advtNo || "माहिती नाही"}</strong></td></tr>
                    <tr><td>एकूण पदे</td><td><strong>{selectedJob.totalPosts || "माहिती नाही"}</strong></td></tr>
                    <tr><td>पदाचे नाव</td><td>{selectedJob.postDetails || "माहिती नाही"}</td></tr>
                    <tr><td>शैक्षणिक पात्रता</td><td>{selectedJob.education || "माहिती नाही"}</td></tr>
                    <tr><td>वयाची अट</td><td>{selectedJob.ageLimit || "माहिती नाही"}</td></tr>
                    <tr><td>नोकरी ठिकाण</td><td>{selectedJob.location || "माहिती नाही"}</td></tr>
                    <tr><td>अर्ज पद्धत</td><td>{selectedJob.applyMethod || "माहिती नाही"}</td></tr>
                    <tr><td>शेवटची तारीख</td><td><span className="highlight-red">{selectedJob.lastDate || "माहिती नाही"}</span></td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "links" && (
              <div className="job-modal-body fade-in link-tab-body">
                <div className="action-box pdf-box">
                  <div className="action-text">
                    <h4>अधिकृत जाहिरात</h4>
                    <p>PDF जाहिरात डाउनलोड करा</p>
                  </div>
                  <a href={selectedJob.pdfLink} target="_blank" rel="noreferrer" className="action-btn pdf-btn">📄 PDF पाहा</a>
                </div>
                <div className="action-box apply-box">
                  <div className="action-text">
                    <h4>ऑनलाइन अर्ज</h4>
                    <p>येथून थेट ऑनलाईन अर्ज करा</p>
                  </div>
                  <a href={selectedJob.applyLink} target="_blank" rel="noreferrer" className="action-btn apply-btn">🌐 अर्ज करा</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}