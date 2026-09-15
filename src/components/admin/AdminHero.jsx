import { useState, useEffect } from "react";
import { db, storage } from "./firebase";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import "./AdminHero.css";

export default function AdminHero() {
  const [slides, setSlides] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  /* =========================================================
     FETCH ALL SLIDES
     Admin sees BOTH visible and hidden banners
  ========================================================= */

  useEffect(() => {
    const q = query(
      collection(db, "hero_slides"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSlides(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      },
      (error) => {
        console.error(
          "Error loading hero slides:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     FILE CHANGE
  ========================================================= */

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  /* =========================================================
     ADD NEW BANNER
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      return alert(
        "Please select an image to upload!"
      );
    }

    setLoading(true);

    try {

      /* =====================================================
         1. UPLOAD IMAGE TO FIREBASE STORAGE
      ===================================================== */

      const imageRef = ref(
        storage,
        `hero_images/${Date.now()}_${imageFile.name}`
      );

      await uploadBytes(
        imageRef,
        imageFile
      );

      const imageUrl =
        await getDownloadURL(imageRef);

      /* =====================================================
         2. SAVE BANNER TO FIRESTORE

         New banners are visible by default
      ===================================================== */

      await addDoc(
        collection(db, "hero_slides"),
        {
          imageUrl,
          visible: true,
          createdAt: serverTimestamp()
        }
      );

      /* =====================================================
         3. RESET FORM
      ===================================================== */

      setImageFile(null);

      const input =
        document.getElementById(
          "sliderImageInput"
        );

      if (input) {
        input.value = "";
      }

      alert(
        "Banner Uploaded Successfully! 🚀"
      );

    } catch (error) {

      console.error(
        "Error adding slide:",
        error
      );

      alert(
        "Failed to add slide."
      );

    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     TOGGLE SHOW / HIDE
  ========================================================= */

  const handleToggleVisibility = async (
    slide
  ) => {

    setUpdatingId(slide.id);

    try {

      /*
        If visible is undefined,
        treat it as currently visible.
      */

      const currentVisibility =
        slide.visible !== false;

      const newVisibility =
        !currentVisibility;

      await updateDoc(
        doc(
          db,
          "hero_slides",
          slide.id
        ),
        {
          visible: newVisibility
        }
      );

    } catch (error) {

      console.error(
        "Error updating banner visibility:",
        error
      );

      alert(
        "Failed to update banner visibility."
      );

    } finally {

      setUpdatingId(null);

    }
  };

  /* =========================================================
     DELETE BANNER
  ========================================================= */

  const handleDelete = async (id) => {

    if (
      window.confirm(
        "Are you sure you want to delete this banner?"
      )
    ) {

      try {

        await deleteDoc(
          doc(
            db,
            "hero_slides",
            id
          )
        );

      } catch (error) {

        console.error(
          "Error deleting banner:",
          error
        );

        alert(
          "Failed to delete banner."
        );
      }
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="ah-container">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="ah-header">

        <h2>
          🖼️ Hero Banner Admin
        </h2>

        <p>
          Upload and manage full-width
          homepage banners.
        </p>

      </div>


      <div className="ah-grid">

        {/* ===================================================
            ADD SLIDE FORM
        =================================================== */}

        <div className="ah-card">

          <h3>
            Add New Banner
          </h3>

          <form
            onSubmit={handleSubmit}
            className="ah-form"
          >

            <div className="ah-input-group">

              <label>
                Upload Banner Image
                (16:9 ratio recommended) *
              </label>

              <div className="ah-file-box">

                <input
                  type="file"
                  id="sliderImageInput"
                  onChange={
                    handleFileChange
                  }
                  accept="image/*"
                  required
                />

              </div>

            </div>


            {/* Selected Image */}

            {imageFile && (
              <div className="ah-selected-file">

                <span>
                  📷 {imageFile.name}
                </span>

              </div>
            )}


            <button
              type="submit"
              className="ah-btn-submit"
              disabled={loading}
            >

              {loading
                ? "Uploading Banner..."
                : "Publish Banner 🚀"}

            </button>

          </form>

        </div>


        {/* ===================================================
            ACTIVE / ALL BANNERS
        =================================================== */}

        <div className="ah-card">

          <div className="ah-list-header">

            <div>

              <h3>
                Manage Banners ({slides.length})
              </h3>

              <p>
                Control which banners are
                visible to users.
              </p>

            </div>

          </div>


          <div className="ah-list">

            {slides.length === 0 ? (

              <p className="ah-empty">
                No banners uploaded yet.
              </p>

            ) : (

              slides.map(
                (slide, index) => {

                  /*
                    Existing banners without
                    visible field are considered visible.
                  */

                  const isVisible =
                    slide.visible !== false;

                  const isUpdating =
                    updatingId === slide.id;

                  return (

                    <div
                      key={slide.id}
                      className={`ah-list-item ${
                        !isVisible
                          ? "banner-hidden"
                          : ""
                      }`}
                    >

                      {/* ============================
                          IMAGE
                      ============================ */}

                      <div className="ah-item-preview full-preview">

                        {slide.imageUrl && (

                          <img
                            src={
                              slide.imageUrl
                            }
                            alt={`Banner ${
                              index + 1
                            }`}
                          />

                        )}

                      </div>


                      {/* ============================
                          INFO
                      ============================ */}

                      <div className="ah-item-info">

                        <span className="ah-banner-number">
                          Banner {index + 1}
                        </span>


                        {/* STATUS */}

                        <span
                          className={`ah-status ${
                            isVisible
                              ? "status-visible"
                              : "status-hidden"
                          }`}
                        >

                          {isVisible
                            ? "● Visible"
                            : "● Hidden"}

                        </span>

                      </div>


                      {/* ============================
                          ACTIONS
                      ============================ */}

                      <div className="ah-item-actions">

                        {/* SHOW / HIDE */}

                        <button
                          type="button"
                          className={`ah-btn-toggle ${
                            isVisible
                              ? "ah-btn-hide"
                              : "ah-btn-show"
                          }`}
                          onClick={() =>
                            handleToggleVisibility(
                              slide
                            )
                          }
                          disabled={isUpdating}
                        >

                          {isUpdating
                            ? "Updating..."
                            : isVisible
                            ? "👁 Hide"
                            : "👁 Show"}

                        </button>


                        {/* DELETE */}

                        <button
                          type="button"
                          className="ah-btn-delete"
                          onClick={() =>
                            handleDelete(
                              slide.id
                            )
                          }
                        >

                          🗑 Delete

                        </button>

                      </div>

                    </div>

                  );
                }
              )

            )}

          </div>

        </div>

      </div>

    </div>
  );
}