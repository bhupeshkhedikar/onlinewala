import { useState, useEffect } from "react";
import { db } from "./firebase"; // Path check kar lena
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import "./AdminJobs.css";

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 🔥 ADDED 'category' in default state
  const [formData, setFormData] = useState({
    title: "", category: "latest", salary: "", tag: "", advtNo: "", totalPosts: "",
    postDetails: "", education: "", ageLimit: "", location: "",
    fee: "", applyMethod: "Online", lastDate: "", examDate: "",
    pdfLink: "", applyLink: "", isNew: true
  });

  // 1. Fetch Jobs from Firestore (Real-time)
  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // 2. Add Job to Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("Title is required!");

    setLoading(true);
    try {
      await addDoc(collection(db, "jobs"), {
        ...formData,
        createdAt: serverTimestamp() // Sorting ke liye zaroori hai
      });

      alert("Update Published Successfully! 🚀");
      
      // Reset form (Keep category as 'latest' default)
      setFormData({
        title: "", category: "latest", salary: "", tag: "", advtNo: "", totalPosts: "",
        postDetails: "", education: "", ageLimit: "", location: "",
        fee: "", applyMethod: "Online", lastDate: "", examDate: "",
        pdfLink: "", applyLink: "", isNew: true
      });
    } catch (error) {
      console.error("Error adding job:", error);
      alert("Failed to post update.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete Job from Firebase
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this update?")) {
      try {
        await deleteDoc(doc(db, "jobs", id));
      } catch (error) {
        console.error("Error deleting job:", error);
      }
    }
  };

  return (
    <div className="aj-container">
      <div className="aj-header">
        <h2>🛠️ Update Management Panel</h2>
        <p>Post and manage Jobs, Results & Admit Cards</p>
      </div>

      <div className="aj-grid">
        {/* ADD JOB FORM */}
        <div className="aj-card aj-form-card">
          <h3>Add New Update</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="aj-form-grid">
              
              {/* 🔥 NEW: Category Selection Dropdown */}
              <div className="aj-input-group full-width">
                <label>Select Category (विभाग निवडा) *</label>
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="latest">💼 Latest Jobs (नवीन नोकरी)</option>
                  <option value="result">🏆 Results (निकाल)</option>
                  <option value="admit_card">🎟️ Admit Card (प्रवेशपत्र)</option>
                </select>
              </div>

              <div className="aj-input-group full-width">
                <label>Title (शीर्षक) *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Post Office GDS Result 2026" />
              </div>
              
              {/* Other inputs... */}
              <div className="aj-input-group">
                <label>Job Tag (Category)</label>
                <input type="text" name="tag" value={formData.tag} onChange={handleChange} placeholder="e.g. Merit Base, Defense" />
              </div>
              <div className="aj-input-group">
                <label>जाहिरात क्र (Advt No)</label>
                <input type="text" name="advtNo" value={formData.advtNo} onChange={handleChange} />
              </div>
              <div className="aj-input-group">
                <label>एकूण पदे (Total Posts)</label>
                <input type="text" name="totalPosts" value={formData.totalPosts} onChange={handleChange} />
              </div>
              <div className="aj-input-group">
                <label>पदाचे नाव (Post Details)</label>
                <input type="text" name="postDetails" value={formData.postDetails} onChange={handleChange} />
              </div>
              <div className="aj-input-group full-width">
                <label>शैक्षणिक पात्रता (Education)</label>
                <textarea name="education" value={formData.education} onChange={handleChange} rows="2"></textarea>
              </div>
              <div className="aj-input-group">
                <label>वयाची अट (Age Limit)</label>
                <input type="text" name="ageLimit" value={formData.ageLimit} onChange={handleChange} />
              </div>
              <div className="aj-input-group">
                <label>नोकरी ठिकाण (Location)</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} />
              </div>
              <div className="aj-input-group full-width">
                <label>फी (Fee Details)</label>
                <input type="text" name="fee" value={formData.fee} onChange={handleChange} placeholder="e.g. General: ₹100, SC/ST: Free" />
              </div>
              <div className="aj-input-group">
                <label>शेवटची तारीख (Last Date)</label>
                <input type="text" name="lastDate" value={formData.lastDate} onChange={handleChange} placeholder="e.g. 01 Jan 2026 (06:00 PM)" />
              </div>
              <div className="aj-input-group">
                <label>परीक्षा (Exam Date)</label>
                <input type="text" name="examDate" value={formData.examDate} onChange={handleChange} />
              </div>
              <div className="aj-input-group">
                <label>जाहिरात PDF Link</label>
                <input type="url" name="pdfLink" value={formData.pdfLink} onChange={handleChange} placeholder="https://..." />
              </div>
              <div className="aj-input-group">
                <label>Online Apply Link</label>
                <input type="url" name="applyLink" value={formData.applyLink} onChange={handleChange} placeholder="https://..." />
              </div>
            </div>

            <div className="aj-toggle">
              <input type="checkbox" id="isNew" name="isNew" checked={formData.isNew} onChange={handleChange} />
              <label htmlFor="isNew">Show 'NEW' Blinking Badge</label>
            </div>

            <button type="submit" className="aj-btn-submit" disabled={loading}>
              {loading ? "Publishing..." : "Publish Update 🚀"}
            </button>
          </form>
        </div>

        {/* POSTED JOBS LIST */}
        <div className="aj-card">
          <div className="aj-list-header">
            <h3>Active Updates ({jobs.length})</h3>
          </div>
          {jobs.length === 0 ? (
            <p className="aj-empty">No updates found in database.</p>
          ) : (
            <div className="aj-job-list">
              {jobs.map(job => (
                <div key={job.id} className="aj-job-item">
                  <div className="aj-item-info">
                    <h4>{job.title}</h4>
                    {/* 🔥 Shows Category Badge in Admin Panel */}
                    <span className="aj-item-date">
                      <b>[{job.category?.toUpperCase() || "LATEST"}]</b> • End: {job.lastDate || "N/A"}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(job.id)} className="aj-btn-delete">
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}