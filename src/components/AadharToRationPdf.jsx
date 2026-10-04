import React, { useEffect, useState } from "react";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "./firebase";

import "./AadharToRationPdf.css";

const functions = getFunctions(
  app,
  "asia-south1"
);

const aadharToRationPdf = httpsCallable(
  functions,
  "aadharToRationPdf"
);

const AadharToRationPdf = () => {
  const [uidNumber, setUidNumber] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [pdfUrl, setPdfUrl] =
    useState("");

  const [pdfBlob, setPdfBlob] =
    useState(null);

  const [pdfFileName, setPdfFileName] =
    useState("Aadhar_To_Ration.pdf");

  const [personName, setPersonName] =
    useState("");

  const [rationNumber, setRationNumber] =
    useState("");

  // ==========================================================
  // CLEANUP PDF URL
  // ==========================================================

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // ==========================================================
  // BASE64 -> BLOB
  // ==========================================================

  const base64ToBlob = (base64) => {
    const cleanBase64 = String(base64)
      .replace(
        /^data:application\/pdf;base64,/i,
        ""
      )
      .replace(/\s/g, "");

    const byteCharacters =
      atob(cleanBase64);

    const sliceSize = 1024 * 512;

    const byteArrays = [];

    for (
      let offset = 0;
      offset < byteCharacters.length;
      offset += sliceSize
    ) {
      const slice =
        byteCharacters.slice(
          offset,
          offset + sliceSize
        );

      const byteNumbers =
        new Array(slice.length);

      for (
        let i = 0;
        i < slice.length;
        i++
      ) {
        byteNumbers[i] =
          slice.charCodeAt(i);
      }

      byteArrays.push(
        new Uint8Array(byteNumbers)
      );
    }

    return new Blob(
      byteArrays,
      {
        type: "application/pdf",
      }
    );
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    const cleanUid =
      uidNumber
        .replace(/\D/g, "")
        .trim();

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!cleanUid) {
      setError(
        "कृपया Aadhaar Number टाका."
      );
      return;
    }

    if (cleanUid.length !== 12) {
      setError(
        "कृपया 12 अंकी Aadhaar Number टाका."
      );
      return;
    }

    setLoading(true);

    try {
      // ------------------------------------------------------
      // CALL CLOUD FUNCTION
      // ------------------------------------------------------

      const result =
        await aadharToRationPdf({
          uidNumber: cleanUid,
          type: "Default",
        });

      const data =
        result?.data || {};

      console.log(
        "Aadhar Ration PDF Response:",
        data
      );

      // ------------------------------------------------------
      // SUCCESS CHECK
      // ------------------------------------------------------

      if (
        !data?.success ||
        !data?.pdf
      ) {
        throw new Error(
          data?.message ||
            "Aadhaar to Ration PDF तयार होऊ शकला नाही."
        );
      }

      // ------------------------------------------------------
      // BASE64 -> PDF BLOB
      // ------------------------------------------------------

      const blob =
        base64ToBlob(
          data.pdf
        );

      const objectUrl =
        URL.createObjectURL(blob);

      // Previous URL cleanup
      if (pdfUrl) {
        URL.revokeObjectURL(
          pdfUrl
        );
      }

      setPdfBlob(blob);

      setPdfUrl(objectUrl);

      setPdfFileName(
        data.filename ||
          `Aadhar_To_Ration_${cleanUid}.pdf`
      );

      setPersonName(
        data.name ||
          data?.data?.name ||
          ""
      );

      setRationNumber(
        data.ration ||
          data?.data?.ration ||
          ""
      );

      setSuccessMessage(
        data.message ||
          "Aadhaar to Ration PDF तयार आहे."
      );

    } catch (err) {
      console.error(
        "Aadhar To Ration PDF Error:",
        err
      );

      let message =
        err?.message ||
        "PDF तयार करताना अडचण आली.";

      /*
       * Firebase callable errors sometimes
       * return functions/https errors.
       */

      if (
        err?.code ===
        "functions/failed-precondition"
      ) {
        message =
          err?.message ||
          "Wallet मध्ये पुरेशी रक्कम नाही.";
      }

      if (
        err?.code ===
        "functions/unauthenticated"
      ) {
        message =
          "कृपया आधी Login करा.";
      }

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // DOWNLOAD
  // ==========================================================

  const handleDownload = () => {
    if (!pdfBlob) {
      return;
    }

    const url =
      URL.createObjectURL(
        pdfBlob
      );

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      pdfFileName ||
      "Aadhar_To_Ration.pdf";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // ==========================================================
  // CLOSE POPUP
  // ==========================================================

  const closePopup = () => {
    setSuccessMessage("");

    if (pdfUrl) {
      URL.revokeObjectURL(
        pdfUrl
      );
    }

    setPdfUrl("");

    setPdfBlob(null);
  };

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <>
      <div className="aadhar-ration-page">

        <div className="aadhar-ration-card">

          {/* ICON */}

          <div className="aadhar-ration-icon">
            📄
          </div>

          {/* TITLE */}

          <h1>
            Aadhaar To Ration PDF
          </h1>

          <p className="aadhar-ration-subtitle">
            Aadhaar Number वापरून Ration Card PDF मिळवा
          </p>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="aadhar-ration-form"
          >

            <label>
              Aadhaar Number
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={uidNumber}
              onChange={(e) => {
                const value =
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 12);

                setUidNumber(value);
              }}
              placeholder="उदा. 123456789012"
              maxLength={12}
              autoComplete="off"
              disabled={loading}
            />

            <p className="aadhar-ration-input-hint">
              तुमचा 12 अंकी Aadhaar Number टाका
            </p>

            {/* ERROR */}

            {error && (
              <div className="aadhar-ration-error">
                {error}
              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              className="aadhar-ration-generate-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="aadhar-ration-spinner"></span>

                  PDF तयार होत आहे...
                </>
              ) : (
                <>
                  📄 Ration PDF तयार करा
                </>
              )}
            </button>

          </form>

          {/* PRICE */}

          <div className="aadhar-ration-price-box">

            <span>
              Service Charge
            </span>

            <strong>
              ₹50
            </strong>

          </div>

          <p className="aadhar-ration-secure-text">
            🔒 Secure &amp; Instant Service
          </p>

        </div>

      </div>

      {/* =====================================================
          PDF POPUP
      ===================================================== */}

      {pdfUrl && (
        <div
          className="aadhar-ration-modal-overlay"
          onClick={closePopup}
        >

          <div
            className="aadhar-ration-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="aadhar-ration-modal-header">

              <div className="aadhar-ration-title-area">

                <div className="aadhar-ration-success-icon">
                  ✓
                </div>

                <div>

                  <h2>
                    Ration PDF तयार आहे
                  </h2>

                  <p>
                    Aadhaar To Ration
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="aadhar-ration-x-btn"
                onClick={closePopup}
                aria-label="Close"
              >
                ×
              </button>

            </div>

            {/* USER DETAILS */}

            {(personName ||
              rationNumber) && (
              <div className="aadhar-ration-details">

                {personName && (
                  <div>
                    <span>
                      नाव
                    </span>

                    <strong>
                      {personName}
                    </strong>
                  </div>
                )}

                {rationNumber && (
                  <div>
                    <span>
                      Ration Number
                    </span>

                    <strong>
                      {rationNumber}
                    </strong>
                  </div>
                )}

              </div>
            )}

            {/* PDF */}

            <div className="aadhar-ration-pdf-viewer">

              <iframe
                src={pdfUrl}
                title="Aadhaar To Ration PDF Preview"
                className="aadhar-ration-pdf-frame"
              />

            </div>

            {/* FOOTER */}

            <div className="aadhar-ration-modal-footer">

              <button
                type="button"
                className="aadhar-ration-download"
                onClick={handleDownload}
              >
                ⬇️ PDF Download करा
              </button>

              <button
                type="button"
                className="aadhar-ration-close"
                onClick={closePopup}
              >
                बंद करा
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
};

export default AadharToRationPdf;