import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./AdminHero.css";

export default function AdminHero() {
  const [slides, setSlides] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Slides
  useEffect(() => {
    const q = query(collection(db, "hero_slides"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSlides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    if (!imageFile) return alert("Please select an image to upload!");

    setLoading(true);
    try {
      // 1. Upload Image to Storage
      const imageRef = ref(storage, `hero_images/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      // 2. Save only Image URL to Firestore
      await addDoc(collection(db, "hero_slides"), {
        imageUrl,
        createdAt: serverTimestamp()
      });

      // 3. Reset Form
      setImageFile(null);
      document.getElementById("sliderImageInput").value = "";
      alert("Banner Uploaded Successfully! 🚀");
    } catch (error) {
      console.error("Error adding slide:", error);
      alert("Failed to add slide.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this banner?")) {
      await deleteDoc(doc(db, "hero_slides", id));
    }
  };

  return (
    <div className="ah-container">
      <div className="ah-header">
        <h2>🖼️ Hero Banner Admin</h2>
        <p>Upload full-width images for the main homepage slider.</p>
      </div>

      <div className="ah-grid">
        {/* ADD SLIDE FORM */}
        <div className="ah-card">
          <h3>Add New Banner</h3>
          <form onSubmit={handleSubmit} className="ah-form">

            <div className="ah-input-group">
              <label>Upload Banner Image (16:9 ratio recommended) *</label>
              <div className="ah-file-box">
                <input 
                  type="file" 
                  id="sliderImageInput"
                  onChange={handleFileChange} 
                  accept="image/*" 
                  required
                />
              </div>
            </div>

            <button type="submit" className="ah-btn-submit" disabled={loading}>
              {loading ? "Uploading Banner..." : "Publish Banner 🚀"}
            </button>
          </form>
        </div>

        {/* LIST OF ACTIVE SLIDES */}
        <div className="ah-card">
          <h3>Active Banners ({slides.length})</h3>
          <div className="ah-list">
            {slides.length === 0 ? (
              <p className="ah-empty">No banners uploaded yet.</p>
            ) : (
              slides.map((slide, index) => (
                <div key={slide.id} className="ah-list-item">
                  <div className="ah-item-preview full-preview">
                    {slide.imageUrl && <img src={slide.imageUrl} alt={`Banner ${index}`} />}
                  </div>
                  <button className="ah-btn-delete" onClick={() => handleDelete(slide.id)}>
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