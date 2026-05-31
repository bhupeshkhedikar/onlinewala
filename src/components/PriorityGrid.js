import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./PriorityGrid.css";

export default function PriorityGrid() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State to track whether to show all cards or not
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Real-time listener for Priority Services
    const q = query(collection(db, "priority_services"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="pLoading">सेवा लोड होत आहेत...</div>;
  }

  // Slice the array to show only 6 items if 'showAll' is false
  const displayedItems = showAll ? items : items.slice(0, 6);

  return (
    <div className="priorityGrid-wrapper">
      
      {/* TITLE & SUBTITLE IN MARATHI */}
      <div className="pGrid-header">
        <h2>जलद सेवा</h2>
        <p>आमच्या सर्वाधिक लोकप्रिय सेवांचा त्वरित लाभ घ्या</p>
      </div>

      <div className="priorityGrid">
        {items.length === 0 ? (
          <p className="pEmpty">अद्याप कोणतीही सेवा जोडलेली नाही.</p>
        ) : (
          displayedItems.map((item) => (
            <div key={item.id} className="pCard">
              <div className="pIcon">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} loading="lazy" />
                ) : (
                  <span className="pFallback">✨</span>
                )}
              </div>
              <p>{item.title}</p>
            </div>
          ))
        )}
      </div>

      {/* See More / See Less Button IN MARATHI */}
      {items.length > 6 && (
        <div style={{ textAlign: "center", marginTop: "15px" }}>
          <button 
            onClick={() => setShowAll(!showAll)}
            style={{
              background: "transparent",
              color: "#4f46e5", 
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "8px 16px",
              fontSize: "14px"
            }}
          >
            {showAll ? "कमी पहा ▲" : "अधिक पहा ▼"}
          </button>
        </div>
      )}

    </div>
  );
}