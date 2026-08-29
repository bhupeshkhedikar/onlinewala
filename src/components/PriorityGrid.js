import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import "./PriorityGrid.css";

export default function PriorityGrid() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "priority_services"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        setItems(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading priority services:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     LOADING SKELETON
  ===================================================== */

  const renderSkeletons = () => {
    return Array.from({ length: 6 }).map(
      (_, index) => (
        <div
          className="pCard pSkeletonCard"
          key={index}
        >
          <div className="pSkeleton-icon" />
          <div className="pSkeleton-line" />
          <div className="pSkeleton-line small" />
        </div>
      )
    );
  };

  /* =====================================================
     DISPLAY ITEMS
  ===================================================== */

  const displayedItems = showAll
    ? items
    : items.slice(0, 6);

  return (
    <section className="priorityGrid-wrapper">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="pGrid-header">

        <div className="pHeader-icon">
          ⚡
        </div>

        <div className="pHeader-content">

          <div className="pTitle-row">

            <h2>
              जलद सेवा
            </h2>

            {items.length > 0 && (
              <span className="pService-count">
                {items.length} सेवा
              </span>
            )}

          </div>

          <p>
            आमच्या सर्वाधिक लोकप्रिय सेवांचा
            त्वरित लाभ घ्या
          </p>

        </div>

      </div>


      {/* =================================================
          GRID
      ================================================= */}

      <div className="priorityGrid">

        {loading ? (
          renderSkeletons()
        ) : items.length === 0 ? (

          <div className="pEmpty">

            <div className="pEmpty-icon">
              📦
            </div>

            <h3>
              सध्या कोणतीही सेवा उपलब्ध नाही
            </h3>

            <p>
              कृपया थोड्या वेळाने पुन्हा तपासा.
            </p>

          </div>

        ) : (

          displayedItems.map(
            (item, index) => (
              <div
                key={item.id}
                className="pCard"
              >

                {/* TOP BADGE */}

                <span className="pCard-number">
                  {String(
                    index + 1
                  ).padStart(2, "0")}
                </span>


                {/* GLOW */}

                <span className="pCard-glow" />


                {/* ICON */}

                <div className="pIcon">

                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={
                        item.title ||
                        "Service"
                      }
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";

                        const fallback =
                          e.currentTarget.parentElement.querySelector(
                            ".pFallback"
                          );

                        if (fallback) {
                          fallback.style.display =
                            "flex";
                        }
                      }}
                    />
                  ) : null}

                  <span
                    className="pFallback"
                    style={{
                      display:
                        item.imageUrl
                          ? "none"
                          : "flex"
                    }}
                  >
                    ✨
                  </span>

                </div>


                {/* TITLE */}

                <p className="pCard-title">
                  {item.title}
                </p>


                {/* ACTION */}

                <div className="pCard-action">

                  <span>
                    त्वरित सेवा
                  </span>

                  <span className="pArrow">
                    →
                  </span>

                </div>


                {/* BOTTOM LINE */}

                <span className="pBottom-line" />

              </div>
            )
          )
        )}

      </div>


      {/* =================================================
          SEE MORE
      ================================================= */}

      {!loading &&
        items.length > 6 && (
          <div className="pMore-wrapper">

            <button
              type="button"
              className="pMore-btn"
              onClick={() =>
                setShowAll(!showAll)
              }
              aria-expanded={showAll}
            >

              <span>
                {showAll
                  ? "कमी पहा"
                  : "अधिक सेवा पहा"}
              </span>

              <span
                className={`pMore-arrow ${
                  showAll
                    ? "rotate"
                    : ""
                }`}
              >
                ↓
              </span>

            </button>

          </div>
        )}

    </section>
  );
}