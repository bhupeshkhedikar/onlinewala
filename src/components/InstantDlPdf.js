import React, { useState } from "react";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { auth } from "./firebase";
import "./InstantDlPdf.css";

const functions = getFunctions(
  undefined,
  "asia-south1"
);

const InstantDlPdf = () => {
  const SERVICE_CHARGE = 50;

  const [dlNumber, setDlNumber] = useState("");
  const [dob, setDob] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  const [showSuccess, setShowSuccess] = useState(false);

  // =========================================================
  // DL NUMBER INPUT
  // =========================================================

  const handleDlChange = (e) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");

    setDlNumber(value);
    setError("");
  };

  // =========================================================
  // DOB INPUT
  // Automatically formats:
  // 01021969 → 01-02-1969
  // =========================================================

  const handleDobChange = (e) => {
    let value = e.target.value.replace(
      /[^0-9]/g,
      ""
    );

    if (value.length > 8) {
      value = value.substring(0, 8);
    }

    if (value.length > 4) {
      value =
        value.substring(0, 2) +
        "-" +
        value.substring(2, 4) +
        "-" +
        value.substring(4);
    } else if (value.length > 2) {
      value =
        value.substring(0, 2) +
        "-" +
        value.substring(2);
    }

    setDob(value);
    setError("");
  };

  // =========================================================
  // BASE64 PDF → BLOB
  // =========================================================

  const base64ToBlob = (base64) => {
    try {
      const cleanBase64 = String(base64)
        .replace(
          /^data:application\/pdf;base64,/i,
          ""
        )
        .replace(/\s/g, "");

      const byteCharacters = atob(
        cleanBase64
      );

      const sliceSize = 1024;

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
    } catch (err) {
      console.error(
        "Base64 PDF conversion error:",
        err
      );

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
      const blob = base64ToBlob(
        result.pdf
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `Driving-Licence-${result.dlNumber}.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);
    } catch (err) {
      console.error(
        "Download error:",
        err
      );

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
      const blob = base64ToBlob(
        result.pdf
      );

      const url =
        URL.createObjectURL(blob);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      console.error(
        "View PDF error:",
        err
      );

      setError(
        "PDF उघडण्यात समस्या आली."
      );
    }
  };

  // =========================================================
  // CLOSE SUCCESS POPUP
  // =========================================================

  const closeSuccessPopup = () => {
    setShowSuccess(false);
  };

  // =========================================================
  // FETCH DL PDF
  // =========================================================

  const fetchDlPdf = async () => {
    setError("");
    setResult(null);
    setShowSuccess(false);

    const cleanDlNumber =
      dlNumber.trim().toUpperCase();

    const cleanDob = dob.trim();

    // -------------------------------------------------------
    // DL VALIDATION
    // -------------------------------------------------------

    if (!cleanDlNumber) {
      setError(
        "कृपया Driving Licence Number टाका."
      );

      return;
    }

    if (
      !/^[A-Z0-9-]{5,30}$/.test(
        cleanDlNumber
      )
    ) {
      setError(
        "कृपया योग्य Driving Licence Number टाका."
      );

      return;
    }

    // -------------------------------------------------------
    // DOB VALIDATION
    // -------------------------------------------------------

    if (!cleanDob) {
      setError(
        "कृपया Date of Birth टाका."
      );

      return;
    }

    const dobRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

    if (!dobRegex.test(cleanDob)) {
      setError(
        "DOB DD-MM-YYYY format मध्ये टाका."
      );

      return;
    }

    // -------------------------------------------------------
    // AUTH
    // -------------------------------------------------------

    const user = auth.currentUser;

    if (!user) {
      setError(
        "कृपया प्रथम लॉगिन करा."
      );

      return;
    }

    // -------------------------------------------------------
    // LOADING
    // -------------------------------------------------------

    setLoading(true);

    try {
      const instantDlPdf =
        httpsCallable(
          functions,
          "instantDlPdf"
        );

      const response =
        await instantDlPdf({
          dl: cleanDlNumber,
          dob: cleanDob,
        });

      const data =
        response?.data;

      console.log(
        "Instant DL PDF response:",
        data
      );

      // -----------------------------------------------------
      // SUCCESS VALIDATION
      // -----------------------------------------------------

      if (
        !data?.success ||
        !data?.pdf
      ) {
        throw new Error(
          data?.message ||
            "Driving Licence PDF उपलब्ध नाही."
        );
      }

      const pdfBase64 =
        String(data.pdf).trim();

      if (!pdfBase64) {
        throw new Error(
          "PDF data मिळाला नाही."
        );
      }

      // -----------------------------------------------------
      // RESULT
      // -----------------------------------------------------

      const finalResult = {
        dlNumber:
          data.dlNumber ||
          cleanDlNumber,

        dob:
          data.dob ||
          cleanDob,

        pdf:
          pdfBase64,

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

      // -----------------------------------------------------
      // SHOW CENTER POPUP
      // -----------------------------------------------------

      setShowSuccess(true);

      // -----------------------------------------------------
      // AUTO DOWNLOAD
      // -----------------------------------------------------

      try {
        const blob =
          base64ToBlob(
            pdfBase64
          );

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href = url;

        link.download =
          `Driving-Licence-${finalResult.dlNumber}.pdf`;

        document.body.appendChild(
          link
        );

        link.click();

        document.body.removeChild(
          link
        );

        setTimeout(() => {
          URL.revokeObjectURL(
            url
          );
        }, 5000);
      } catch (
        downloadError
      ) {
        console.warn(
          "Automatic download failed:",
          downloadError
        );
      }
    } catch (err) {
      console.error(
        "Instant DL PDF error:",
        err
      );

      let message =
        "Driving Licence PDF मिळवताना समस्या आली.";

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
          "Driving Licence PDF उपलब्ध नाही.";
      } else if (
        err?.code ===
        "functions/unavailable"
      ) {
        message =
          "DL service सध्या उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.";
      } else if (
        err?.message
      ) {
        message =
          err.message;
      }

      message =
        message.replace(
          /^FirebaseError:\s*/i,
          ""
        ).trim();

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetForm = () => {
    setDlNumber("");
    setDob("");
    setResult(null);
    setError("");
    setShowSuccess(false);
  };

  return (
    <div className="instant-dl-page">

      <div className="instant-dl-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="instant-dl-header">

          <div className="dl-icon">
            🚘
          </div>

          <div>
            <h1>
              Instant DL PDF
            </h1>

            <p>
              Driving Licence PDF काही सेकंदात मिळवा
            </p>
          </div>

        </div>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div className="instant-dl-card">

          <div className="dl-badge">
            ⚡ Instant Service
          </div>

          <h2>
            Driving Licence PDF मिळवा
          </h2>

          <p className="dl-description">
            तुमचा Driving Licence Number आणि
            Date of Birth टाका.
          </p>

          {/* =================================================
              DL NUMBER
          ================================================= */}

          <div className="dl-form-group">

            <label htmlFor="dlNumber">
              Driving Licence Number
            </label>

            <div className="dl-input-wrapper">

              <span className="dl-input-icon">
                🚘
              </span>

              <input
                id="dlNumber"
                type="text"
                value={dlNumber}
                onChange={
                  handleDlChange
                }
                placeholder="उदा. AS2120050001596"
                maxLength={30}
                disabled={loading}
                autoComplete="off"
              />

            </div>

          </div>

          {/* =================================================
              DOB
          ================================================= */}

          <div className="dl-form-group">

            <label htmlFor="dob">
              Date of Birth
            </label>

            <div className="dl-input-wrapper">

              <span className="dl-input-icon">
                📅
              </span>

              <input
                id="dob"
                type="text"
                value={dob}
                onChange={
                  handleDobChange
                }
                placeholder="DD-MM-YYYY"
                maxLength={10}
                disabled={loading}
                inputMode="numeric"
                autoComplete="off"
              />

            </div>

            <small>
              उदा. 01-02-1969
            </small>

          </div>

          {/* =================================================
              PRICE
          ================================================= */}

          <div className="dl-price-box">

            <div className="dl-price-left">

              <span className="dl-price-icon">
                💰
              </span>

              <div>

                <span className="dl-price-label">
                  Service Charge
                </span>

                <small>
                  Wallet मधून deduct होईल
                </small>

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
            <div className="dl-error">

              <span className="dl-error-icon">
                ⚠️
              </span>

              <span>
                {error}
              </span>

            </div>
          )}

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="button"
            className="dl-submit-btn"
            onClick={
              fetchDlPdf
            }
            disabled={
              loading ||
              !dlNumber.trim() ||
              !dob.trim()
            }
          >

            {loading ? (
              <>
                <span className="dl-spinner"></span>

                PDF मिळवत आहे...
              </>
            ) : (
              <>
                <span>
                  📄
                </span>

                Get DL PDF
              </>
            )}

          </button>

          {/* =================================================
              SECURITY NOTE
          ================================================= */}

          <div className="dl-note">

            <span>
              🔒
            </span>

            <span>
              तुमची माहिती सुरक्षित आहे.
              PDF successfully मिळाल्यावरच
              ₹50 wallet मधून deduct होतील.
            </span>

          </div>

        </div>

        {/* =================================================
            RESULT CARD
        ================================================= */}

        {result && (
          <div className="dl-result-card">

            <div className="dl-success-icon">
              ✓
            </div>

            <h3>
              DL PDF तयार आहे!
            </h3>

            <p>
              DL Number

              <strong>
                {result.dlNumber}
              </strong>
            </p>

            <div className="dl-result-info">

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

            <div className="dl-actions">

              <button
                type="button"
                className="dl-view-btn"
                onClick={
                  viewPdf
                }
              >
                👁️ View PDF
              </button>

              <button
                type="button"
                className="dl-download-btn"
                onClick={
                  downloadPdf
                }
              >
                ⬇️ Download PDF
              </button>

            </div>

            <button
              type="button"
              className="dl-new-btn"
              onClick={
                resetForm
              }
            >
              ← दुसरा DL Number
            </button>

          </div>
        )}

      </div>

      {/* =====================================================
          CENTER PDF SUCCESS POPUP
          ===================================================== */}

      {showSuccess && result?.pdf && (

        <div
          className="dl-popup-overlay"
          onClick={
            closeSuccessPopup
          }
        >

          <div
            className="dl-pdf-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* CLOSE */}

            <button
              type="button"
              className="dl-popup-x"
              onClick={
                closeSuccessPopup
              }
              aria-label="Close"
            >
              ×
            </button>

            {/* HEADER */}

            <div className="dl-popup-header">

              <div className="dl-popup-success-icon">
                ✓
              </div>

              <div>

                <h2>
                  DL PDF Ready!
                </h2>

                <p>
                  Driving Licence PDF
                  successfully generated.
                </p>

              </div>

            </div>

            {/* =================================================
                PDF CENTER PREVIEW
                ================================================= */}

            <div className="dl-pdf-preview-wrapper">

              <iframe
                title="Driving Licence PDF Preview"
                className="dl-pdf-preview"
                src={`data:application/pdf;base64,${result.pdf}`}
              />

            </div>

            {/* =================================================
                DL INFO
                ================================================= */}

            <div className="dl-popup-info">

              <div>
                <span>
                  DL Number
                </span>

                <strong>
                  {result.dlNumber}
                </strong>
              </div>

              <div>
                <span>
                  Charge
                </span>

                <strong>
                  ₹{result.amount}
                </strong>
              </div>

            </div>

            {/* =================================================
                ACTIONS
                ================================================= */}

            <div className="dl-popup-actions">

              <button
                type="button"
                className="dl-popup-download"
                onClick={
                  downloadPdf
                }
              >
                ⬇️ Download PDF
              </button>

              <button
                type="button"
                className="dl-popup-close-btn"
                onClick={
                  closeSuccessPopup
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

export default InstantDlPdf;