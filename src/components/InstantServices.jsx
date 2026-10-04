import React, { useEffect, useState } from "react";
import "./InstantServices.css";

import InstantNumberLinkWithVoter from "./InstantNumberLinkWithVoter";
import InstantRcPdfWithoutChip from "./InstantRcPdfWithoutChip";
import InstantLlPass from "./InstantLlPass";
import InstantPanFind from "./InstantPanFind";
import AadharToRationPdf from "./AadharToRationPdf";

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

  // ==========================================================
  // NEW - AADHAAR TO RATION PDF
  // ==========================================================

  {
    id: "aadhar-ration-pdf",
    title: "आधार वरून रेशन कार्ड पीडीएफ",
    shortTitle: "आधारवरून रेशन पीडीएफ",
    icon: "📋",
    badge: "नवीन",
    description:
      "आधार क्रमांक वापरून रेशन कार्ड PDF मिळवा",
    component: <AadharToRationPdf />,
  },
];

export default function InstantServices() {
  const [activeService, setActiveService] =
    useState(null);

  // ==========================================================
  // OPEN SERVICE
  // ==========================================================

  const openService = (service) => {
    setActiveService(service);

    document.body.style.overflow = "hidden";
  };

  // ==========================================================
  // CLOSE SERVICE
  // ==========================================================

  const closeService = () => {
    setActiveService(null);

    document.body.style.overflow = "";
  };

  // ==========================================================
  // ESCAPE KEY
  // ==========================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeService();
      }
    };

    if (activeService) {
      document.addEventListener(
        "keydown",
        handleEscape
      );
    }

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow = "";
    };
  }, [activeService]);

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <>
      <section className="instant-services">

        {/* ==================================================
            TOP
        ================================================== */}

        <div className="instant-services__top">

          <div className="instant-services__heading">

            <span className="instant-services__eyebrow">
              ⚡ त्वरित ऑनलाइन सेवा
            </span>

            <h2>
              आपली कामे आता{" "}
              <span>झटपट करा</span>
            </h2>

            <p>
              खालील सेवांपैकी सेवा निवडा आणि लगेच पुढे जा.
            </p>

          </div>

          {/* SERVICE COUNT */}

          <div className="instant-services__count">

            <strong>
              {services.length}
            </strong>

            <span>
              सेवा उपलब्ध
            </span>

          </div>

        </div>


        {/* ==================================================
            SERVICE GRID
        ================================================== */}

        <div className="instant-services__grid">

          {services.map(
            (service, index) => (

              <button
                type="button"
                className="instant-service-card"
                key={service.id}
                onClick={() =>
                  openService(service)
                }
                style={{
                  "--card-index": index,
                }}
              >

                <span className="instant-service-card__shine" />


                {/* CARD TOP */}

                <span className="instant-service-card__top">

                  <span className="instant-service-card__icon">
                    {service.icon}
                  </span>

                  <span className="instant-service-card__badge">
                    {service.badge}
                  </span>

                </span>


                {/* CARD CONTENT */}

                <span className="instant-service-card__content">

                  <strong>
                    {service.shortTitle}
                  </strong>

                  <small>
                    {service.description}
                  </small>

                </span>


                {/* CARD BOTTOM */}

                <span className="instant-service-card__bottom">

                  <span>
                    सेवा वापरा
                  </span>

                  <span className="instant-service-card__arrow">
                    →
                  </span>

                </span>

              </button>
            )
          )}

        </div>

      </section>


      {/* ====================================================
          SERVICE MODAL
      ==================================================== */}

      {activeService && (

        <div
          className="instant-modal-backdrop"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
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

            {/* =================================================
                MODAL HEADER
            ================================================= */}

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


              {/* CLOSE */}

              <button
                type="button"
                className="instant-modal__close"
                onClick={closeService}
                aria-label="बंद करा"
              >
                ×
              </button>

            </div>


            {/* =================================================
                MODAL BODY
            ================================================= */}

            <div className="instant-modal__body">

              {activeService.component}

            </div>

          </div>

        </div>

      )}

    </>
  );
}