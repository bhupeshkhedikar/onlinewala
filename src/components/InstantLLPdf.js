import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";
import "./InstantLLPdf.css";

const functions = getFunctions(undefined, "asia-south1");

const InstantLLPdf = () => {
  const [applicationNumber, setApplicationNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);

  const SERVICE_CHARGE = 50;

  // =========================================================
  // INPUT FORMAT
  // =========================================================

  const handleApplicationChange = (e) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");

    setApplicationNumber(value);

    if (error) {
      setError("");
    }
  };

  // =========================================================
  // BASE64 → BLOB
  // =========================================================

  const base64ToBlob = (base64, contentType = "application/pdf") => {
    try {
      // Remove possible data URL prefix
      const cleanBase64 = base64
        .replace(/^data:application\/pdf;base64,/, "")
        .replace(/\s/g, "");

      const byteCharacters = atob(cleanBase64);

      const byteArrays = [];

      const sliceSize = 1024;

      for (
        let offset = 0;
        offset < byteCharacters.length;
        offset += sliceSize
      ) {
        const slice = byteCharacters.slice(
          offset,
          offset + sliceSize
        );

        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
      }

      return new Blob(byteArrays, {
        type: contentType,
      });
    } catch (err) {
      console.error("Base64 to Blob error:", err);

      throw new Error(
        "PDF तयार करण्यात समस्या आली."
      );
    }
  };

  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  const downloadPdf = () => {
    if (!result?.pdf) {
      return;
    }

    try {
      const blob = base64ToBlob(result.pdf);

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download =
        `Learning-Licence-${result.applicationNumber}.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.error(err);

      setError(
        "PDF download करण्यात समस्या आली."
      );
    }
  };

  // =========================================================
  // VIEW PDF
  // =========================================================

  const viewPdf = () => {
    if (!result?.pdf) {
      return;
    }

    try {
      const blob = base64ToBlob(result.pdf);

      const url = URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      // Give browser enough time to open the PDF
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      console.error(err);

      setError(
        "PDF उघडण्यात समस्या आली."
      );
    }
  };

  // =========================================================
  // GET LL PDF
  // =========================================================

  const fetchLLPdf = async () => {
    setError("");
    setResult(null);
    setShowSuccess(false);

    const appNo = applicationNumber.trim();

    if (!appNo) {
      setError(
        "कृपया Learning Licence Application Number टाका."
      );

      return;
    }

    if (appNo.length < 5) {
      setError(
        "कृपया योग्य Application Number टाका."
      );

      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError(
        "कृपया प्रथम लॉगिन करा."
      );

      return;
    }

    setLoading(true);

    try {
      const instantLlPdf = httpsCallable(
        functions,
        "instantLlPdf"
      );

      const response = await instantLlPdf({
        application_no: appNo,
      });

      const data = response?.data;

      console.log("Instant LL PDF response:", data);

      if (
        !data?.success ||
        !data?.pdf
      ) {
        throw new Error(
          data?.message ||
            "Learning Licence PDF उपलब्ध नाही."
        );
      }

      const pdfBase64 = String(
        data.pdf
      ).trim();

      if (!pdfBase64) {
        throw new Error(
          "PDF data मिळाला नाही."
        );
      }

      const finalResult = {
        applicationNumber:
          data.applicationNumber ||
          appNo,

        pdf: pdfBase64,

        amount:
          Number(data.amount) ||
          SERVICE_CHARGE,

        transactionId:
          data.transactionId ||
          "",

        requestId:
          data.requestId ||
          "",

        providerOrderId:
          data.providerOrderId ||
          "",

        remainingBalance:
          data.remainingBalance,
      };

      setResult(finalResult);

      setShowSuccess(true);

      // =====================================================
      // AUTO DOWNLOAD
      // =====================================================

      try {
        const blob = base64ToBlob(
          pdfBase64
        );

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = url;

        link.download =
          `Learning-Licence-${finalResult.applicationNumber}.pdf`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 5000);
      } catch (downloadError) {
        console.warn(
          "Auto download failed:",
          downloadError
        );
      }
    } catch (err) {
      console.error(
        "Instant LL PDF error:",
        err
      );

      let message =
        "Learning Licence PDF मिळवताना समस्या आली.";

      if (
        err?.code ===
        "functions/unauthenticated"
      ) {
        message =
          "कृपया प्रथम लॉगिन करा.";
      } else if (
        err?.code ===
        "functions/failed-precondition"
      ) {
        message =
          err?.message ||
          "Wallet मध्ये पुरेशी रक्कम नाही.";
      } else if (
        err?.code ===
        "functions/not-found"
      ) {
        message =
          err?.message ||
          "Learning Licence PDF उपलब्ध नाही.";
      } else if (
        err?.code ===
        "functions/unavailable"
      ) {
        message =
          "LL service सध्या उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.";
      } else if (
        err?.message
      ) {
        message =
          err.message;
      }

      // Firebase sometimes prefixes message
      message = message
        .replace(
          /^FirebaseError:\s*/i,
          ""
        )
        .trim();

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetForm = () => {
    setApplicationNumber("");
    setResult(null);
    setError("");
    setShowSuccess(false);
  };

  return (
    <div className="instant-ll-page">

      <div className="instant-ll-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="instant-ll-header">

          <div className="ll-icon">
            📄
          </div>

          <div>
            <h1>
              Instant LL PDF
            </h1>

            <p>
              Learning Licence PDF काही सेकंदात मिळवा
            </p>
          </div>

        </div>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div className="instant-ll-card">

          <div className="service-badge">
            ⚡ Instant Service
          </div>

          <h2>
            Learning Licence PDF मिळवा
          </h2>

          <p className="ll-description">
            तुमचा Learning Licence Application
            Number टाका आणि PDF लगेच डाउनलोड करा.
          </p>

          {/* =================================================
              APPLICATION NUMBER
          ================================================= */}

          <div className="ll-form-group">

            <label htmlFor="applicationNumber">
              Application Number
            </label>

            <div className="ll-input-wrapper">

              <span className="ll-input-icon">
                #
              </span>

              <input
                id="applicationNumber"
                type="text"
                value={applicationNumber}
                onChange={
                  handleApplicationChange
                }
                placeholder="उदा. 4147419226"
                autoComplete="off"
                maxLength={30}
                disabled={loading}
              />

            </div>

            <small>
              तुमचा Learning Licence
              Application Number टाका
            </small>

          </div>

          {/* =================================================
              CHARGE INFO
          ================================================= */}

          <div className="ll-price-box">

            <div className="ll-price-left">

              <span className="price-icon">
                💰
              </span>

              <div>
                <span className="price-label">
                  Service Charge
                </span>

                <span className="price-note">
                  Wallet मधून deduct होईल
                </span>
              </div>

            </div>

            <strong>
              ₹{SERVICE_CHARGE}
            </strong>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="ll-error">

              <span className="error-icon">
                ⚠️
              </span>

              <span>
                {error}
              </span>

            </div>
          )}

          {/* =================================================
              BUTTON
          ================================================= */}

          <button
            type="button"
            className="ll-submit-btn"
            onClick={fetchLLPdf}
            disabled={
              loading ||
              !applicationNumber.trim()
            }
          >

            {loading ? (
              <>
                <span className="ll-spinner"></span>

                PDF मिळवत आहे...
              </>
            ) : (
              <>
                <span>
                  📄
                </span>

                Get LL PDF
              </>
            )}

          </button>

          {/* =================================================
              NOTE
          ================================================= */}

          <div className="ll-note">

            <span>
              🔒
            </span>

            <span>
              तुमची माहिती सुरक्षित आहे.
              PDF मिळाल्यावरच wallet मधून charge
              deduct केला जातो.
            </span>

          </div>

        </div>

        {/* =================================================
            SUCCESS CARD
        ================================================= */}

        {result && (
          <div className="ll-result-card">

            <div className="success-icon">
              ✓
            </div>

            <h3>
              LL PDF तयार आहे!
            </h3>

            <p>
              Application Number:
              <strong>
                {result.applicationNumber}
              </strong>
            </p>

            <div className="result-info">

              <div>
                <span>
                  Service Charge
                </span>

                <strong>
                  ₹{result.amount}
                </strong>
              </div>

              {result.remainingBalance !==
                undefined &&
                result.remainingBalance !==
                  null && (
                  <div>
                    <span>
                      Remaining Balance
                    </span>

                    <strong>
                      ₹
                      {Number(
                        result.remainingBalance
                      ).toFixed(2)}
                    </strong>
                  </div>
                )}

            </div>

            <div className="ll-result-actions">

              <button
                type="button"
                className="ll-view-btn"
                onClick={viewPdf}
              >
                👁️ View PDF
              </button>

              <button
                type="button"
                className="ll-download-btn"
                onClick={downloadPdf}
              >
                ⬇️ Download PDF
              </button>

            </div>

            <button
              type="button"
              className="ll-new-btn"
              onClick={resetForm}
            >
              ← दुसरे Application Number
            </button>

          </div>
        )}

      </div>

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

      {showSuccess && (
        <div
          className="ll-popup-overlay"
          onClick={() =>
            setShowSuccess(false)
          }
        >

          <div
            className="ll-success-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="popup-check">
              ✓
            </div>

            <h2>
              PDF Ready!
            </h2>

            <p>
              तुमची Learning Licence PDF
              successfully मिळाली आहे.
            </p>

            <div className="popup-actions">

              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  downloadPdf();
                }}
              >
                ⬇️ Download PDF
              </button>

              <button
                type="button"
                className="popup-close"
                onClick={() =>
                  setShowSuccess(false)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default InstantLLPdf;