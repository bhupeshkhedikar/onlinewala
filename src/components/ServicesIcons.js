import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs
} from "firebase/firestore";
import BookingModal from "./BookingModal";
import "./ServicesIcons.css";

export default function ServicesIcons({
  user,
  onLoginRequest
}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [selectedService, setSelectedService] =
    useState("");

  /* =====================================================
     CARD COLOR THEMES
  ===================================================== */

  const cardThemes = [
    "service-theme-blue",
    "service-theme-purple",
    "service-theme-orange",
    "service-theme-green",
    "service-theme-pink",
    "service-theme-cyan",
    "service-theme-indigo",
    "service-theme-rose"
  ];

  /* =====================================================
     FETCH SERVICES
  ===================================================== */

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "services")
        );

        const fetchedServices =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));

        setServices(fetchedServices);
      } catch (error) {
        console.error(
          "Error fetching services:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  /* =====================================================
     SERVICE CLICK
  ===================================================== */

  const handleServiceClick = (
    serviceName
  ) => {
    if (!user) {
      if (onLoginRequest) {
        onLoginRequest();
      } else {
        alert(
          "Please login first to book a service!"
        );
      }

      return;
    }

    setSelectedService(serviceName);
    setIsModalOpen(true);
  };

  /* =====================================================
     KEYBOARD ACCESS
  ===================================================== */

  const handleKeyDown = (
    event,
    serviceName
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      handleServiceClick(serviceName);
    }
  };

  /* =====================================================
     LOADING SKELETON
  ===================================================== */

  const renderLoading = () => {
    return Array.from({
      length: 6
    }).map((_, index) => (
      <div
        className="service-skeleton"
        key={index}
      >
        <div className="skeleton-icon" />

        <div className="skeleton-text" />

        <div className="skeleton-text small" />
      </div>
    ));
  };

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <>
      <section
        className="services-container"
        aria-label="Available Services"
      >

        {/* =================================================
            SECTION HEADER
        ================================================= */}

        <div className="services-heading">

          <div className="services-heading-left">

            <span className="services-heading-icon">
              ✨
            </span>

            <div>
              <h2>
                आमच्या सेवा
              </h2>

              <p>
                तुमच्यासाठी उपलब्ध असलेल्या
                सेवा निवडा
              </p>
            </div>

          </div>

          {services.length > 0 && (
            <span className="services-count">
              {services.length} सेवा
            </span>
          )}

        </div>


        {/* =================================================
            SERVICES GRID
        ================================================= */}

        <div className="servicesRow">

          {/* LOADING */}

          {loading ? (
            renderLoading()
          ) : services.length === 0 ? (

            /* EMPTY */

            <div className="services-empty">

              <div className="empty-icon">
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

            /* SERVICES */

            services.map(
              (svc, index) => {

                const theme =
                  cardThemes[
                    index %
                      cardThemes.length
                  ];

                return (
                  <div
                    key={svc.id}
                    className={`serviceItem ${theme}`}
                    onClick={() =>
                      handleServiceClick(
                        svc.name
                      )
                    }
                    onKeyDown={(event) =>
                      handleKeyDown(
                        event,
                        svc.name
                      )
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`Book ${svc.name}`}
                  >

                    {/* COLOR GLOW */}

                    <div className="service-glow" />

                    {/* NUMBER */}

                    <span className="service-number">
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </span>

                    {/* ICON */}

                    <div className="icon-container">

                      {svc.imageUrl ? (

                        <img
                          className="icon-img"
                          src={svc.imageUrl}
                          alt={svc.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";

                            const fallback =
                              event.currentTarget
                                .parentElement
                                .querySelector(
                                  ".icon-fallback"
                                );

                            if (fallback) {
                              fallback.style.display =
                                "flex";
                            }
                          }}
                        />

                      ) : null}

                      <div
                        className="icon-fallback"
                        style={{
                          display:
                            svc.imageUrl
                              ? "none"
                              : "flex"
                        }}
                      >
                        ✨
                      </div>

                    </div>

                    {/* SERVICE NAME */}

                    <p className="service-name">
                      {svc.name}
                    </p>

                    {/* BOOK LABEL */}

                    <span className="service-book">
                      Book Now
                      <span>
                        →
                      </span>
                    </span>

                    {/* BOTTOM DECORATION */}

                    <div className="service-bottom-line" />

                  </div>
                );
              }
            )
          )}

        </div>

      </section>


      {/* ===================================================
          BOOKING MODAL
      =================================================== */}

      {isModalOpen && (
        <BookingModal
          user={user}
          initialData={{
            service: selectedService,
            date: "",
            time: ""
          }}
          onClose={() =>
            setIsModalOpen(false)
          }
        />
      )}
    </>
  );
}