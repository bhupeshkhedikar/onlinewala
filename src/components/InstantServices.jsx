import React, { useEffect, useState } from "react";
import "./InstantServices.css";

import InstantNumberLinkWithVoter from "./InstantNumberLinkWithVoter";
import InstantRcPdfWithoutChip from "./InstantRcPdfWithoutChip";
import InstantLlPass from "./InstantLlPass";
import InstantPanFind from "./InstantPanFind";

const services = [
  {
    id: "number-voter",
    title: "मतदान कार्ड सोबत मो.नंबर लिंक",
    shortTitle: "मतदान कार्ड मो.नंबर लिंक",
    icon: "📱",
    badge: "लोकप्रिय",
    description: "मतदान कार्ड सोबत मोबाईल नंबर लिंक सेवा",
    component: <InstantNumberLinkWithVoter />,
  },
  {
    id: "rc-pdf",
    title: "आरसी पीडीएफ",
    shortTitle: "आरसी पीडीएफ",
    icon: "📄",
    badge: "त्वरित",
    description: "आरसी पीडीएफ मिळवा",
    component: <InstantRcPdfWithoutChip />,
  },
  {
    id: "ll-pass",
    title: "एलएल पास",
    shortTitle: "एलएल पास",
    icon: "🪪",
    badge: "नवीन",
    description: "लर्निंग लायसन्स पास सेवा",
    component: <InstantLlPass />,
  },
  {
    id: "pan-find",
    title: "आधार वरून पॅन कार्ड शोधा",
    shortTitle: "आधारवरून पॅन",
    icon: "💳",
    badge: "उपयुक्त",
    description: "आधार क्रमांकावरून पॅन कार्ड शोधा",
    component: <InstantPanFind />,
  },
];

export default function InstantServices() {
  const [activeService, setActiveService] = useState(null);

  const openService = (service) => {
    setActiveService(service);
    document.body.style.overflow = "hidden";
  };

  const closeService = () => {
    setActiveService(null);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeService();
      }
    };

    if (activeService) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [activeService]);

  return (
    <>
      <section className="instant-services">
        <div className="instant-services__top">
          <div className="instant-services__heading">
            <span className="instant-services__eyebrow">
              ⚡ त्वरित ऑनलाइन सेवा
            </span>

            <h2>आपली कामे आता <span>झटपट करा</span></h2>

            <p>
              खालील सेवांपैकी सेवा निवडा आणि लगेच पुढे जा.
            </p>
          </div>

          <div className="instant-services__count">
            <strong>{services.length}</strong>
            <span>सेवा उपलब्ध</span>
          </div>
        </div>

        <div className="instant-services__grid">
          {services.map((service, index) => (
            <button
              type="button"
              className="instant-service-card"
              key={service.id}
              onClick={() => openService(service)}
              style={{ "--card-index": index }}
            >
              <span className="instant-service-card__shine" />

              <span className="instant-service-card__top">
                <span className="instant-service-card__icon">
                  {service.icon}
                </span>

                <span className="instant-service-card__badge">
                  {service.badge}
                </span>
              </span>

              <span className="instant-service-card__content">
                <strong>{service.shortTitle}</strong>
                <small>{service.description}</small>
              </span>

              <span className="instant-service-card__bottom">
                <span>सेवा वापरा</span>
                <span className="instant-service-card__arrow">→</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeService && (
        <div
          className="instant-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeService();
            }
          }}
        >
          <div
            className="instant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instant-modal-title"
          >
            <div className="instant-modal__header">
              <div className="instant-modal__title">
                <span className="instant-modal__icon">
                  {activeService.icon}
                </span>

                <div>
                  <span className="instant-modal__label">
                    ⚡ त्वरित सेवा
                  </span>

                  <h3 id="instant-modal-title">
                    {activeService.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                className="instant-modal__close"
                onClick={closeService}
                aria-label="बंद करा"
              >
                ×
              </button>
            </div>

            <div className="instant-modal__body">
              {activeService.component}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
