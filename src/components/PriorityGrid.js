import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./PriorityGrid.css";

export default function PriorityGrid() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
    return <div className="pLoading">Loading priority services...</div>;
  }

  return (
    <div className="priorityGrid-wrapper">
      
      {/* 🔥 NEW: TITLE & SUBTITLE ADDED HERE */}
      <div className="pGrid-header">
        <h2>Quick Services</h2>
        <p>Access our most popular features instantly</p>
      </div>

      <div className="priorityGrid">
        {items.length === 0 ? (
          <p className="pEmpty">No priority services added yet.</p>
        ) : (
          items.map((item) => (
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
    </div>
  );
}