import { useState, useEffect } from "react";
import { db, storage } from "./firebase"; 
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./AdminPriorityGrid.css";

export default function AdminPriorityGrid() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "priority_services"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert("Title is required!");

    setLoading(true);
    try {
      let imageUrl = "";

      // 🔥 Upload image if selected
      if (imageFile) {
        const imageRef = ref(storage, `priority_icons/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      // 🔥 Save to Firestore
      await addDoc(collection(db, "priority_services"), {
        title,
        imageUrl,
        createdAt: serverTimestamp()
      });

      // Reset
      setTitle("");
      setImageFile(null);
      document.getElementById("iconUpload").value = ""; // Clear file input
      alert("Service added successfully!");

    } catch (error) {
      console.error("Error adding service:", error);
      alert("Failed to add service.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this service?")) {
      await deleteDoc(doc(db, "priority_services", id));
    }
  };

  return (
    <div className="ap-container">
      <div className="ap-header">
        <h2>⚡ Priority Services Admin</h2>
        <p>Manage quick-access grid items on the homepage.</p>
      </div>

      <div className="ap-grid">
        {/* ADD FORM */}
        <div className="ap-card">
          <h3>Add New Service</h3>
          <form onSubmit={handleSubmit} className="ap-form">
            
            <div className="ap-input-group">
              <label>Service Title *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Instant ID Printing" 
                required 
              />
            </div>

            <div className="ap-input-group">
              <label>Icon / Image (Optional)</label>
              <div className="ap-file-box">
                <input 
                  type="file" 
                  id="iconUpload"
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/webp" 
                />
              </div>
              <small>If left empty, a beautiful random gradient will be applied.</small>
            </div>

            <button type="submit" className="ap-btn-submit" disabled={loading}>
              {loading ? "Uploading..." : "Add to Grid 🚀"}
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="ap-card">
          <h3>Active Services ({items.length})</h3>
          <div className="ap-list">
            {items.length === 0 ? (
              <p className="ap-empty">No services found.</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="ap-list-item">
                  <div className="ap-item-left">
                    <div className="ap-item-preview">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} />
                      ) : (
                        <span>✨</span>
                      )}
                    </div>
                    <h4>{item.title}</h4>
                  </div>
                  <button className="ap-btn-delete" onClick={() => handleDelete(item.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}