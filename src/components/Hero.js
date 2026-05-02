import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./Hero.css";

export default function Hero() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const touchStart = useRef(0);

  useEffect(() => {
    const q = query(collection(db, "hero_slides"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const slideData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSlides(slideData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (slides.length <= 1) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
  };

  const nextSlide = () => setIndex((index + 1) % slides.length);
  const prevSlide = () => setIndex((index - 1 + slides.length) % slides.length);

  if (loading) {
    return (
      <div className="hero-wrapper">
        <div className="hero-loading">Loading banners...</div>
      </div>
    );
  }

  if (slides.length === 0) return null; 

  return (
    <div className="hero-wrapper">
      <div
        className="hero"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* SLIDER TRACK - FULL IMAGE */}
        <div
          className="hero-slider"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div className="hero-slide" key={slide.id || i}>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt={`Slide ${i}`} className="full-slide-img" />
              )}
            </div>
          ))}
        </div>

        {/* Buttons */}
        {slides.length > 1 && (
          <>
            <button className="hero-nav prev" onClick={prevSlide}>‹</button>
            <button className="hero-nav next" onClick={nextSlide}>›</button>
            
            {/* Dots */}
            <div className="hero-dots">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={index === i ? "active" : ""}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 🔥 GLOWING APPOINTMENT BUTTON (Kept untouched below slider) */}
      {/* <div className="hero-cta-container">
        <button className="glowing-appointment-btn">
          <span className="btn-icon">📅</span> Book Appointment
        </button>
      </div> */}
    </div>
  );
}