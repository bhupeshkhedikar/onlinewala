import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import "./Hero.css";

export default function Hero() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const touchStart = useRef(0);

  /* =========================================================
     LOAD HERO SLIDES
     Only visible banners are shown to users
  ========================================================= */

  useEffect(() => {
    const q = query(
      collection(db, "hero_slides"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const slideData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((slide) => slide.visible !== false);

        setSlides(slideData);
        setLoading(false);

        // Prevent invalid index after admin hides/deletes a banner
        setIndex((currentIndex) => {
          if (slideData.length === 0) return 0;

          if (currentIndex >= slideData.length) {
            return 0;
          }

          return currentIndex;
        });
      },
      (error) => {
        console.error("Hero slides error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     AUTO SLIDE
  ========================================================= */

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  /* =========================================================
     NEXT
  ========================================================= */

  const nextSlide = () => {
    if (slides.length <= 1) return;

    setIndex((prev) => (prev + 1) % slides.length);
  };

  /* =========================================================
     PREVIOUS
  ========================================================= */

  const prevSlide = () => {
    if (slides.length <= 1) return;

    setIndex(
      (prev) =>
        (prev - 1 + slides.length) %
        slides.length
    );
  };

  /* =========================================================
     TOUCH SWIPE
  ========================================================= */

  const handleTouchStart = (e) => {
    touchStart.current =
      e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (slides.length <= 1) return;

    const diff =
      touchStart.current -
      e.changedTouches[0].clientX;

    if (diff > 50) {
      nextSlide();
    }

    if (diff < -50) {
      prevSlide();
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="hero-wrapper">
        <div className="hero-loading">
          बॅनर लोड होत आहे...
        </div>
      </div>
    );
  }

  /* =========================================================
     EMPTY
  ========================================================= */

  if (slides.length === 0) {
    return null;
  }

  /* =========================================================
     DESKTOP LOOP
     
     Last slide ke baad first slide duplicate
  ========================================================= */

  const desktopSlides =
    slides.length > 1
      ? [
          ...slides,
          {
            ...slides[0],
            id: `${slides[0].id}-duplicate`
          }
        ]
      : slides;

  return (
    <div className="hero-wrapper">

      <div
        className="hero"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* =====================================================
            DESKTOP / MOBILE SLIDER
        ===================================================== */}

        <div
          className="hero-slider"
          style={{
            transform: `translateX(-${
              index *
              (window.innerWidth > 768
                ? 50
                : 100)
            }%)`
          }}
        >

          {desktopSlides.map((slide, i) => {

            const originalIndex =
              i % slides.length;

            const isActive =
              originalIndex === index;

            return (
              <div
                className={`hero-slide ${
                  isActive
                    ? "hero-slide-active"
                    : "hero-slide-side"
                }`}
                key={`${slide.id}-${i}`}
              >

                <div className="hero-slide-inner">

                  {slide.imageUrl && (
                    <img
                      src={slide.imageUrl}
                      alt={`Slide ${
                        originalIndex + 1
                      }`}
                      className="full-slide-img"
                    />
                  )}

                </div>

              </div>
            );
          })}

        </div>

        {/* =====================================================
            NAVIGATION BUTTONS
        ===================================================== */}

        {slides.length > 1 && (
          <>

            <button
              type="button"
              className="hero-nav prev"
              onClick={prevSlide}
              aria-label="Previous banner"
            >
              ‹
            </button>

            <button
              type="button"
              className="hero-nav next"
              onClick={nextSlide}
              aria-label="Next banner"
            >
              ›
            </button>

            {/* =================================================
                DOTS
            ================================================= */}

            <div className="hero-dots">

              {slides.map((_, i) => (
                <span
                  key={i}
                  className={
                    index === i
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setIndex(i)
                  }
                />
              ))}

            </div>

          </>
        )}

      </div>

      {/* =====================================================
          CTA
      ===================================================== */}

      {/*
      <div className="hero-cta-container">

        <button className="glowing-appointment-btn">

          <span className="btn-icon">
            📅
          </span>

          Book Appointment

        </button>

      </div>
      */}

    </div>
  );
}