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
     कार्ड रंग थीम
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
     सेवा मिळवा
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
          "सेवा मिळवताना त्रुटी आली:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  /* =====================================================
     सेवा निवड
  ===================================================== */

  const handleServiceClick = (
    serviceName
  ) => {
    if (!user) {
      if (onLoginRequest) {
        onLoginRequest();
      } else {
        alert(
          "सेवा बुक करण्यासाठी कृपया प्रथम लॉगिन करा."
        );
      }

      return;
    }

    setSelectedService(serviceName);
    setIsModalOpen(true);
  };

  /* =====================================================
     कीबोर्डद्वारे सेवा निवड
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
     लोडिंग दाखवा
  ===================================================== */

  const renderLoading = () => {
    return Array.from({
      length: 6
    }).map((_, index) => (
      <div
        className="service-skeleton"
        key={index}
        aria-label="सेवा लोड होत आहे"
      >
        <div className="skeleton-icon" />

        <div className="skeleton-text" />

        <div className="skeleton-text small" />
      </div>
    ));
  };

  /* =====================================================
     मुख्य भाग
  ===================================================== */

  return (
    <>
      <section
        className="services-container"
        aria-label="उपलब्ध सेवा"
      >

        {/* =================================================
            विभागाचे शीर्षक
        ================================================= */}

        <div className="services-heading">

          <div className="services-heading-left">

            <span
              className="services-heading-icon"
              aria-hidden="true"
            >
              ✨
            </span>

            <div>
              <h2>
                आमच्या सेवा
              </h2>

              <p>
                तुमच्यासाठी उपलब्ध असलेली
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
            सेवा ग्रिड
        ================================================= */}

        <div className="servicesRow">

          {/* सेवा लोड होत असताना */}

          {loading ? (
            renderLoading()
          ) : services.length === 0 ? (

            /* कोणतीही सेवा उपलब्ध नसल्यास */

            <div className="services-empty">

              <div
                className="empty-icon"
                aria-hidden="true"
              >
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

            /* उपलब्ध सेवा */

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
                    aria-label={`${svc.name} सेवा बुक करा`}
                  >

                    {/* रंगीत चमक */}

                    <div
                      className="service-glow"
                      aria-hidden="true"
                    />

                    {/* क्रमांक */}

                    <span
                      className="service-number"
                      aria-hidden="true"
                    >
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </span>

                    {/* सेवा चिन्ह */}

                    <div className="icon-container">

                      {svc.imageUrl ? (

                        <img
                          className="icon-img"
                          src={svc.imageUrl}
                          alt={`${svc.name} चे चिन्ह`}
                          loading="lazy"
                          onError={(event) => {
                            console.warn(
                              "सेवेचे चिन्ह लोड झाले नाही:",
                              svc.name
                            );

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
                        aria-hidden="true"
                      >
                        ✨
                      </div>

                    </div>

                    {/* सेवेचे नाव */}

                    <p className="service-name">
                      {svc.name}
                    </p>

                    {/* सेवा बुक करा */}

                    <span className="service-book">
                      सेवा बुक करा

                      <span aria-hidden="true">
                        →
                      </span>
                    </span>

                    {/* खालची सजावट */}

                    <div
                      className="service-bottom-line"
                      aria-hidden="true"
                    />

                  </div>
                );
              }
            )
          )}

        </div>

      </section>


      {/* ===================================================
          बुकिंग विंडो
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