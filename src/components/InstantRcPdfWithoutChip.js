import React, { useEffect, useState } from "react";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "./firebase";

import "./InstantRcPdfWithoutChip.css";

const functions = getFunctions(app, "asia-south1");

const instantRcPdfWithoutChip = httpsCallable(
  functions,
  "instantRcPdfWithoutChip"
);

const InstantRcPdfWithoutChip = () => {
  const [rcNumber, setRcNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [pdfUrl, setPdfUrl] = useState("");

  const [pdfBlob, setPdfBlob] = useState(null);

  const [pdfFileName, setPdfFileName] =
    useState("RC.pdf");

  // ----------------------------------------------------------
  // Cleanup PDF URL
  // ----------------------------------------------------------

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // ----------------------------------------------------------
  // Base64 → Blob
  // ----------------------------------------------------------

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

    return new Blob(byteArrays, {
      type: "application/pdf",
    });
  };

  // ----------------------------------------------------------
  // Submit
  // ----------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");

    const cleanRc = rcNumber
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!cleanRc) {
      setError(
        "कृपया RC Number टाका."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await instantRcPdfWithoutChip({
          rcno: cleanRc,
        });

      const data = result?.data;

      if (!data?.success || !data?.pdf) {
        throw new Error(
          data?.message ||
            "RC PDF तयार होऊ शकला नाही."
        );
      }

      const blob = base64ToBlob(
        data.pdf
      );

      const objectUrl =
        URL.createObjectURL(blob);

      // Previous URL cleanup
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfBlob(blob);

      setPdfUrl(objectUrl);

      setPdfFileName(
        data.filename ||
          `RC_${cleanRc}.pdf`
      );

      setSuccessMessage(
        data.message ||
          "RC PDF तयार आहे."
      );

      // Popup automatically opens
      // after successful PDF generation

    } catch (err) {
      console.error(
        "RC PDF error:",
        err
      );

      setError(
        err?.message ||
          "RC PDF तयार करताना अडचण आली."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // Download
  // ----------------------------------------------------------

  const handleDownload = () => {
    if (!pdfBlob) return;

    const url =
      URL.createObjectURL(pdfBlob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      pdfFileName || "RC.pdf";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // ----------------------------------------------------------
  // Close Popup
  // ----------------------------------------------------------

  const closePopup = () => {
    setSuccessMessage("");

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    setPdfUrl("");

    setPdfBlob(null);
  };

  // ----------------------------------------------------------
  // JSX
  // ----------------------------------------------------------

  return (
    <>
      <div className="rc-without-chip-page">

        <div className="rc-without-chip-card">

          <div className="rc-without-chip-icon">
            🚗
          </div>

          <h1>
            Instant RC PDF
          </h1>

          <p className="rc-without-chip-subtitle">
            RC Card ची PDF लगेच मिळवा
          </p>

          <form
            onSubmit={handleSubmit}
            className="rc-without-chip-form"
          >

            <label>
              RC Number
            </label>

            <input
              type="text"
              value={rcNumber}
              onChange={(e) =>
                setRcNumber(
                  e.target.value
                    .toUpperCase()
                )
              }
              placeholder="उदा. GJ25U7291"
              maxLength={15}
              autoComplete="off"
              disabled={loading}
            />

            <p className="rc-input-hint">
              तुमचा वाहन RC Number टाका
            </p>

            {error && (
              <div className="rc-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="rc-generate-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="rc-spinner"></span>
                  PDF तयार होत आहे...
                </>
              ) : (
                <>
                  📄 RC PDF तयार करा
                </>
              )}
            </button>

          </form>

          <div className="rc-price-box">
            <span>
              Service Charge
            </span>

            <strong>
              ₹40
            </strong>
          </div>

          <p className="rc-secure-text">
            🔒 Secure &amp; Instant Service
          </p>

        </div>

      </div>


      {/* ======================================================
          CENTER PDF POPUP
      ====================================================== */}

      {pdfUrl && (
        <div
          className="rc-pdf-modal-overlay"
          onClick={closePopup}
        >

          <div
            className="rc-pdf-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Header */}

            <div className="rc-pdf-modal-header">

              <div className="rc-pdf-title-area">

                <div className="rc-pdf-success-icon">
                  ✓
                </div>

                <div>
                  <h2>
                    RC PDF तयार आहे
                  </h2>

                  <p>
                    {rcNumber
                      .trim()
                      .toUpperCase()}
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="rc-pdf-x-btn"
                onClick={closePopup}
                aria-label="Close"
              >
                ×
              </button>

            </div>


            {/* PDF */}

            <div className="rc-pdf-viewer">

              <iframe
                src={pdfUrl}
                title="RC PDF Preview"
                className="rc-pdf-frame"
              />

            </div>


            {/* Footer */}

            <div className="rc-pdf-modal-footer">

              <button
                type="button"
                className="rc-pdf-download"
                onClick={handleDownload}
              >
                ⬇️ PDF Download करा
              </button>

              <button
                type="button"
                className="rc-pdf-close"
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

export default InstantRcPdfWithoutChip;