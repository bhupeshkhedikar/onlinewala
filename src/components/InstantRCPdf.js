import React, { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";
import "./InstantRCPdf.css";

const functions = getFunctions(undefined, "asia-south1");

export default function InstantRCPdf() {
  const [rcNumber, setRcNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const [copied, setCopied] = useState(false);

  const SERVICE_CHARGE = 40;

  /* =====================================================
     RC INPUT
  ===================================================== */

  const handleRcChange = (e) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);

    setRcNumber(value);
    setError("");
    setResult(null);
    setShowSuccessPopup(false);
  };

  /* =====================================================
     GET RC PDF
  ===================================================== */

  const getRcPdf = async () => {
    setError("");
    setResult(null);
    setShowSuccessPopup(false);
    setCopied(false);

    /* -----------------------------
       AUTH
    ----------------------------- */

    if (!auth.currentUser) {
      setError("कृपया आधी लॉगिन करा.");
      return;
    }

    /* -----------------------------
       RC VALIDATION
    ----------------------------- */

    if (!rcNumber) {
      setError("कृपया वाहनाचा RC क्रमांक टाका.");
      return;
    }

    if (rcNumber.length < 6) {
      setError("कृपया वैध RC क्रमांक टाका.");
      return;
    }

    setShowConfirm(false);
    setLoading(true);

    /*
     * IMPORTANT
     *
     * Browser popup blocker टाळण्यासाठी
     * user click होताच blank tab उघडतो.
     *
     * Firebase response आल्यानंतर त्या tab मध्ये
     * actual PDF URL load केली जाते.
     */

    let pdfWindow = null;

    try {
      /* =================================================
         OPEN BLANK PDF TAB
      ================================================= */

      pdfWindow = window.open(
        "",
        "_blank"
      );

      if (pdfWindow) {
        try {
          pdfWindow.document.write(`
            <!DOCTYPE html>
            <html lang="mr">
              <head>
                <meta charset="UTF-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1.0"
                />

                <title>
                  RC PDF - OnlineWalaa
                </title>

                <style>
                  * {
                    box-sizing: border-box;
                  }

                  html,
                  body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                  }

                  body {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f7f7f7;
                    font-family:
                      Arial,
                      Helvetica,
                      sans-serif;
                    color: #222;
                  }

                  .loader-wrapper {
                    width: 100%;
                    max-width: 420px;
                    padding: 30px;
                    text-align: center;
                  }

                  .spinner {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 20px;

                    border: 4px solid #e7e7e7;
                    border-top-color: #ff7900;

                    border-radius: 50%;

                    animation:
                      spin 0.8s
                      linear infinite;
                  }

                  h2 {
                    margin: 0 0 10px;
                    font-size: 21px;
                    font-weight: 700;
                  }

                  p {
                    margin: 0;
                    color: #777;
                    font-size: 14px;
                    line-height: 1.6;
                  }

                  @keyframes spin {
                    from {
                      transform: rotate(0deg);
                    }

                    to {
                      transform: rotate(360deg);
                    }
                  }
                </style>
              </head>

              <body>
                <div class="loader-wrapper">

                  <div class="spinner"></div>

                  <h2>
                    RC PDF तयार होत आहे...
                  </h2>

                  <p>
                    कृपया काही क्षण प्रतीक्षा करा.
                  </p>

                </div>
              </body>
            </html>
          `);

          pdfWindow.document.close();
        } catch (popupWriteError) {
          console.error(
            "PDF loading page error:",
            popupWriteError
          );
        }
      }

      /* =================================================
         FIREBASE CALLABLE
      ================================================= */

      const instantRcPdf = httpsCallable(
        functions,
        "instantRcPdf"
      );

      console.log(
        "Calling instantRcPdf:",
        {
          rcNumber,
          userId: auth.currentUser.uid,
        }
      );

      const response = await instantRcPdf({
        rcNumber: rcNumber,
      });

      const data = response?.data || {};

      /* =================================================
         DEBUG RESPONSE
      ================================================= */

      console.log(
        "Instant RC PDF Full Response:",
        data
      );

      console.log(
        "Instant RC PDF Parsed:",
        {
          success: data?.success,
          message: data?.message,
          rcNumber: data?.rcNumber,
          pdfLink: data?.pdfLink,
          hasPdfLink: Boolean(
            data?.pdfLink
          ),
          amount: data?.amount,
          transactionId:
            data?.transactionId,
          requestId:
            data?.requestId,
          remainingBalance:
            data?.remainingBalance,
        }
      );

      /* =================================================
         PDF LINK
      ================================================= */

      const pdfLink = String(
        data?.pdfLink || ""
      ).trim();

      /*
       * IMPORTANT:
       *
       * pdfLink मिळाला म्हणजे SUCCESS.
       *
       * Provider message:
       *
       * "RC PDF fetched successfully"
       *
       * किंवा
       *
       * "Request successful."
       *
       * हे ERROR नाही.
       */

      if (!pdfLink) {
        throw new Error(
          data?.message ||
            "RC PDF मिळवता आली नाही."
        );
      }

      /* =================================================
         PDF URL VALIDATION
      ================================================= */

      try {
        const parsedPdfUrl =
          new URL(pdfLink);

        if (
          parsedPdfUrl.protocol !==
            "https:" &&
          parsedPdfUrl.protocol !==
            "http:"
        ) {
          throw new Error(
            "Invalid PDF URL"
          );
        }
      } catch (urlError) {
        console.error(
          "Invalid PDF URL:",
          pdfLink,
          urlError
        );

        throw new Error(
          "RC PDF ची लिंक योग्य स्वरूपात मिळाली नाही."
        );
      }

      /* =================================================
         RESULT OBJECT
      ================================================= */

      const rcResult = {
        rcNumber: String(
          data?.rcNumber ||
            rcNumber
        )
          .trim()
          .toUpperCase(),

        pdfLink: pdfLink,

        amount: Number(
          data?.amount ||
            SERVICE_CHARGE
        ),

        transactionId:
          data?.transactionId ||
          "",

        requestId:
          data?.requestId ||
          "",

        remainingBalance:
          data?.remainingBalance ??
          null,
      };

      /* =================================================
         SAVE RESULT
      ================================================= */

      setResult(rcResult);

      setRcNumber("");

      setError("");

      /* =================================================
         SHOW SUCCESS
      ================================================= */

      setShowSuccessPopup(true);

      /* =================================================
         AUTOMATICALLY OPEN PDF
      ================================================= */

      if (
        pdfWindow &&
        !pdfWindow.closed
      ) {
        try {
          pdfWindow.location.href =
            rcResult.pdfLink;
        } catch (windowError) {
          console.error(
            "PDF tab navigation error:",
            windowError
          );

          window.open(
            rcResult.pdfLink,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } else {
        /*
         * Blank tab blocked असल्यास
         * normal window.open attempt.
         */

        const newWindow =
          window.open(
            rcResult.pdfLink,
            "_blank",
            "noopener,noreferrer"
          );

        if (!newWindow) {
          console.warn(
            "Browser blocked automatic PDF popup."
          );
        }
      }
    } catch (err) {
      /* =================================================
         ERROR
      ================================================= */

      console.error(
        "Instant RC PDF Error:",
        err
      );

      /* -----------------------------
         CLOSE BLANK TAB ON ERROR
      ----------------------------- */

      if (
        pdfWindow &&
        !pdfWindow.closed
      ) {
        try {
          pdfWindow.close();
        } catch (closeError) {
          console.error(
            "PDF window close error:",
            closeError
          );
        }
      }

      /* -----------------------------
         ERROR MESSAGE
      ----------------------------- */

      let message =
        err?.message ||
        "RC PDF मिळवताना काहीतरी त्रुटी आली.";

      if (
        typeof message ===
        "string"
      ) {
        message = message
          .replace(
            "FirebaseError:",
            ""
          )
          .trim();
      }

      /* -----------------------------
         PROVIDER SUCCESS MESSAGES
         MUST NOT BE ERROR
      ----------------------------- */

      if (
        message ===
          "RC PDF fetched successfully" ||
        message ===
          "Request successful."
      ) {
        message =
          "RC PDF मिळाली. कृपया PDF उघडा.";
      }

      /* -----------------------------
         HTTP ERROR MESSAGES
      ----------------------------- */

      if (
        message.includes(
          "Service Unavailable"
        ) ||
        message.includes(
          "service is currently unavailable"
        )
      ) {
        message =
          "RC PDF सेवा सध्या उपलब्ध नाही. कृपया काही वेळाने पुन्हा प्रयत्न करा.";
      }

      if (
        message.includes(
          "RC PDF सेवा सध्या उपलब्ध नाही"
        )
      ) {
        message =
          "RC PDF सेवा सध्या उपलब्ध नाही. कृपया काही वेळाने पुन्हा प्रयत्न करा.";
      }

      if (
        message.includes(
          "deadline-exceeded"
        )
      ) {
        message =
          "RC PDF सेवेला प्रतिसाद मिळण्यास जास्त वेळ लागला. कृपया पुन्हा प्रयत्न करा.";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FORM SUBMIT
  ===================================================== */

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (!auth.currentUser) {
      setError(
        "कृपया आधी लॉगिन करा."
      );
      return;
    }

    if (!rcNumber) {
      setError(
        "कृपया वाहनाचा RC क्रमांक टाका."
      );
      return;
    }

    if (rcNumber.length < 6) {
      setError(
        "कृपया वैध RC क्रमांक टाका."
      );
      return;
    }

    setShowConfirm(true);
  };

  /* =====================================================
     COPY RC NUMBER
  ===================================================== */

  const copyRcNumber = async () => {
    if (!result?.rcNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        result.rcNumber
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (copyError) {
      console.error(
        "RC copy error:",
        copyError
      );

      setError(
        "RC क्रमांक कॉपी करता आला नाही."
      );
    }
  };

  /* =====================================================
     CLOSE SUCCESS POPUP
  ===================================================== */

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    setCopied(false);
  };

  /* =====================================================
     OPEN PDF
  ===================================================== */

  const openPdf = () => {
    if (!result?.pdfLink) {
      return;
    }

    window.open(
      result.pdfLink,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =====================================================
     DOWNLOAD PDF
  ===================================================== */

  const downloadPdf = () => {
    if (!result?.pdfLink) {
      return;
    }

    const link =
      document.createElement("a");

    link.href =
      result.pdfLink;

    link.download =
      `${result.rcNumber || "RC"}-RC.pdf`;

    link.target = "_blank";

    link.rel =
      "noopener noreferrer";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  };

  /* =====================================================
     SUCCESS OVERLAY
  ===================================================== */

  const handleSuccessOverlayClick = (
    e
  ) => {
    if (
      e.target ===
        e.currentTarget &&
      !loading
    ) {
      closeSuccessPopup();
    }
  };

  /* =====================================================
     ESC KEY
  ===================================================== */

  useEffect(() => {
    const handleEscape = (e) => {
      if (
        e.key === "Escape" &&
        showSuccessPopup &&
        !loading
      ) {
        closeSuccessPopup();
      }

      if (
        e.key === "Escape" &&
        showConfirm &&
        !loading
      ) {
        setShowConfirm(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    showSuccessPopup,
    showConfirm,
    loading,
  ]);

  /* =====================================================
     BODY LOCK
  ===================================================== */

  useEffect(() => {
    if (
      showSuccessPopup ||
      showConfirm
    ) {
      document.body.classList.add(
        "rc-popup-open"
      );
    } else {
      document.body.classList.remove(
        "rc-popup-open"
      );
    }

    return () => {
      document.body.classList.remove(
        "rc-popup-open"
      );
    };
  }, [
    showSuccessPopup,
    showConfirm,
  ]);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="instant-rc-page">

      <div className="instant-rc-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="instant-rc-header">

          <div className="instant-rc-header-icon">
            <span>🚗</span>
          </div>

          <div>

            <div className="instant-rc-brand">
              ONLINEWALAA
            </div>

            <h1>
              त्वरित RC PDF
            </h1>

            <p>
              वाहन क्रमांक वापरून RC PDF मिळवा
            </p>

          </div>

        </div>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div className="instant-rc-card">

          <div className="instant-rc-card-top">

            <div className="rc-service-icon">
              📄
            </div>

            <div>

              <h2>
                वाहन RC PDF
              </h2>

              <p>
                तुमचा वाहन नोंदणी क्रमांक टाकून
                RC PDF मिळवा.
              </p>

            </div>

          </div>

          {/* =================================================
              PRICE
          ================================================= */}

          <div className="rc-service-price-box">

            <div>

              <span>
                सेवा शुल्क
              </span>

              <strong>
                ₹40
              </strong>

            </div>

          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
          >

            <div className="rc-input-group">

              <label htmlFor="rc-number">
                वाहन नोंदणी क्रमांक
              </label>

              <div className="rc-input-wrapper">

                <span className="rc-input-icon">
                  🚘
                </span>

                <input
                  id="rc-number"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={12}
                  value={rcNumber}
                  onChange={handleRcChange}
                  placeholder="उदा. BR03L8594"
                  disabled={loading}
                />

                {rcNumber.length >
                  0 && (
                  <span className="rc-character-count">
                    {rcNumber.length}/12
                  </span>
                )}

              </div>

              <small>
                🔒 तुमची माहिती सुरक्षितपणे
                प्रक्रिया केली जाईल.
              </small>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="rc-error">

                <span>
                  ⚠️
                </span>

                <p>
                  {error}
                </p>

              </div>
            )}

            {/* =================================================
                GET BUTTON
            ================================================= */}

            <button
              type="submit"
              className="get-rc-button"
              disabled={
                loading ||
                rcNumber.length < 6
              }
            >

              {loading ? (
                <>
                  <span className="rc-button-spinner" />

                  RC PDF मिळवत आहे...
                </>
              ) : (
                <>
                  <span>
                    📄
                  </span>

                  RC PDF मिळवा
                </>
              )}

            </button>

          </form>

          {/* =================================================
              INFO ROW
          ================================================= */}

          <div className="rc-info-row">

            <div>
              <span>
                ✓
              </span>

              यशस्वी झाल्यावरच शुल्क
            </div>

            <div>
              <span>
                ✓
              </span>

              सेवा शुल्क ₹40
            </div>

            <div>
              <span>
                ✓
              </span>

              वॉलेटमधून पेमेंट
            </div>

          </div>

        </div>

        {/* =================================================
            DISCLAIMER
        ================================================= */}

        <div className="instant-rc-disclaimer">

          <span>
            🔐
          </span>

          <p>
            वाहनाचा नोंदणी क्रमांक फक्त RC PDF
            मिळवण्यासाठी वापरला जातो. सेवा
            यशस्वी झाल्यानंतरच तुमच्या
            OnlineWalaa वॉलेटमधून ₹40 वजा केले
            जातील.
          </p>

        </div>

      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      {showConfirm && (
        <div className="rc-modal-overlay">

          <div className="rc-confirm-modal">

            <button
              type="button"
              className="rc-modal-close"
              onClick={() =>
                setShowConfirm(false)
              }
              disabled={loading}
              aria-label="बंद करा"
            >
              ×
            </button>

            <div className="rc-confirm-icon">
              🚗
            </div>

            <h2>
              RC PDF मिळवण्याची पुष्टी करा
            </h2>

            <p>
              तुम्ही खालील वाहन क्रमांकासाठी
              RC PDF मिळवणार आहात.
            </p>

            <div className="confirm-rc-number">
              {rcNumber}
            </div>

            <div className="rc-confirm-charge">

              <span>
                सेवा शुल्क
              </span>

              <strong>
                ₹40
              </strong>

            </div>

            <small>
              RC PDF यशस्वीपणे मिळाल्यावरच
              तुमच्या वॉलेटमधून ₹40 वजा केले
              जातील.
            </small>

            <div className="rc-confirm-actions">

              <button
                type="button"
                className="rc-cancel-button"
                onClick={() =>
                  setShowConfirm(false)
                }
                disabled={loading}
              >
                रद्द करा
              </button>

              <button
                type="button"
                className="rc-confirm-button"
                onClick={getRcPdf}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="rc-button-spinner" />

                    प्रक्रिया सुरू आहे...
                  </>
                ) : (
                  <>
                    📄 RC मिळवा • ₹40
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

      {showSuccessPopup &&
        result?.pdfLink && (

        <div
          className="rc-success-overlay"
          onClick={
            handleSuccessOverlayClick
          }
        >

          <div
            className="rc-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rc-success-title"
          >

            <button
              type="button"
              className="rc-success-close"
              onClick={
                closeSuccessPopup
              }
              aria-label="बंद करा"
            >
              ×
            </button>

            {/* =================================================
                SUCCESS HEADER
            ================================================= */}

            <div className="rc-success-header">

              <div className="rc-success-icon">
                ✓
              </div>

              <div>

                <div className="rc-success-label">
                  यशस्वी
                </div>

                <h2 id="rc-success-title">
                  RC PDF मिळाली
                </h2>

                <p>
                  तुमची RC PDF यशस्वीपणे
                  तयार झाली आहे.
                </p>

              </div>

            </div>

            {/* =================================================
                RC RESULT
            ================================================= */}

            <div className="rc-result-card">

              <div className="rc-result-card-top">

                <div className="rc-result-icon">
                  🚘
                </div>

                <div>

                  <span>
                    वाहन नोंदणी क्रमांक
                  </span>

                  <strong>
                    {result.rcNumber}
                  </strong>

                </div>

              </div>

              <div className="rc-pdf-status">

                <div className="rc-pdf-icon">
                  📄
                </div>

                <div>

                  <strong>
                    RC PDF तयार आहे
                  </strong>

                  <span>
                    तुमची डिजिटल RC PDF
                    नवीन टॅबमध्ये उघडली आहे.
                  </span>

                </div>

              </div>

            </div>

            {/* =================================================
                PAYMENT
            ================================================= */}

            <div className="rc-success-payment">

              <div>

                <span>
                  वॉलेटमधून वजा
                </span>

                <strong>
                  ₹
                  {result.amount ||
                    SERVICE_CHARGE}
                </strong>

              </div>

              {result.remainingBalance !==
                null && (

                <div>

                  <span>
                    शिल्लक वॉलेट
                  </span>

                  <strong>
                    ₹
                    {result.remainingBalance}
                  </strong>

                </div>

              )}

            </div>

            {/* =================================================
                PDF ACTIONS
            ================================================= */}

            <div className="rc-popup-actions">

              <button
                type="button"
                className="rc-open-pdf-button"
                onClick={openPdf}
              >
                📄 PDF उघडा
              </button>

              <button
                type="button"
                className="rc-download-button"
                onClick={downloadPdf}
              >
                ⬇ PDF डाउनलोड करा
              </button>

            </div>

            {/* =================================================
                SECONDARY ACTIONS
            ================================================= */}

            <div className="rc-secondary-actions">

              <button
                type="button"
                className="rc-copy-button"
                onClick={copyRcNumber}
              >
                {copied
                  ? "✓ कॉपी झाले"
                  : "📋 RC क्रमांक कॉपी करा"}
              </button>

              <button
                type="button"
                className="rc-close-button"
                onClick={
                  closeSuccessPopup
                }
              >
                बंद करा
              </button>

            </div>

            {/* =================================================
                TRANSACTION
            ================================================= */}

            {result.transactionId && (
              <div className="rc-transaction-id">

                व्यवहार क्रमांक:{" "}

                {result.transactionId}

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}