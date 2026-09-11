import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";
import "./InstantPanFind.css";

const functions = getFunctions(undefined, "asia-south1");

export default function InstantPanFind() {
  const [aadhaar, setAadhaar] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPanPopup, setShowPanPopup] = useState(false);
  const [copied, setCopied] = useState(false);

  const SERVICE_CHARGE = 50;

  // ========================================
  // AADHAAR INPUT
  // ========================================

  const handleAadhaarChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, "")
      .slice(0, 12);

    setAadhaar(value);
    setError("");
    setResult(null);
    setShowPanPopup(false);
  };

  // ========================================
  // FIND PAN
  // ========================================

  const findPan = async () => {
    setError("");
    setResult(null);
    setShowPanPopup(false);
    setCopied(false);

    // ----------------------------------------
    // LOGIN CHECK
    // ----------------------------------------

    if (!auth.currentUser) {
      setError("कृपया आधी Login करा.");
      return;
    }

    // ----------------------------------------
    // AADHAAR VALIDATION
    // ----------------------------------------

    if (aadhaar.length !== 12) {
      setError("कृपया 12 अंकी Aadhaar Number टाका.");
      return;
    }

    setShowConfirm(false);
    setLoading(true);

    try {
      // ----------------------------------------
      // FIREBASE CALLABLE FUNCTION
      // ----------------------------------------

      const instantPanFind = httpsCallable(
        functions,
        "instantPanFind"
      );

      const response = await instantPanFind({
        aadhaarNumber: aadhaar,
      });

      const data = response.data;

      console.log("Instant PAN Find Response:", data);

      // ----------------------------------------
      // CHECK SUCCESS
      // ----------------------------------------

      if (!data?.success || !data?.panNumber) {
        throw new Error(
          data?.message ||
            "PAN Number शोधता आला नाही."
        );
      }

      // ----------------------------------------
      // SET RESULT
      // ----------------------------------------

      const panResult = {
        panNumber: String(data.panNumber)
          .trim()
          .toUpperCase(),

        amount: Number(
          data.amount || SERVICE_CHARGE
        ),

        transactionId:
          data.transactionId || "",

        requestId:
          data.requestId || "",

        remainingBalance:
          data.remainingBalance ?? null,
      };

      setResult(panResult);

      // ----------------------------------------
      // CLEAR AADHAAR
      // ----------------------------------------

      setAadhaar("");

      // ----------------------------------------
      // SHOW PAN POPUP
      // ----------------------------------------

      setShowPanPopup(true);
    } catch (err) {
      console.error(
        "Instant PAN Find Error:",
        err
      );

      let message =
        err?.message ||
        "PAN Number शोधताना काहीतरी error आला.";

      // Firebase callable errors can sometimes
      // contain extra prefixes.
      if (
        typeof message === "string" &&
        message.includes("FirebaseError:")
      ) {
        message = message.replace(
          "FirebaseError:",
          ""
        ).trim();
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // FORM SUBMIT
  // ========================================

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (!auth.currentUser) {
      setError("कृपया आधी Login करा.");
      return;
    }

    if (aadhaar.length !== 12) {
      setError(
        "कृपया 12 अंकी Aadhaar Number टाका."
      );
      return;
    }

    setShowConfirm(true);
  };

  // ========================================
  // MASK AADHAAR
  // ========================================

  const maskAadhaar = (value) => {
    if (!value) return "";

    return `XXXX XXXX ${value.slice(-4)}`;
  };

  // ========================================
  // COPY PAN
  // ========================================

  const copyPan = async () => {
    if (!result?.panNumber) return;

    try {
      await navigator.clipboard.writeText(
        result.panNumber
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (copyError) {
      console.error(
        "PAN copy error:",
        copyError
      );

      setError("PAN copy करता आला नाही.");
    }
  };

  // ========================================
  // CLOSE PAN POPUP
  // ========================================

  const closePanPopup = () => {
    setShowPanPopup(false);
    setCopied(false);
  };

  // ========================================
  // CLOSE ON OVERLAY
  // ========================================

  const handlePopupOverlayClick = (e) => {
    if (
      e.target === e.currentTarget &&
      !loading
    ) {
      closePanPopup();
    }
  };

  // ========================================
  // ESC KEY
  // ========================================

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (
        e.key === "Escape" &&
        showPanPopup &&
        !loading
      ) {
        closePanPopup();
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
  }, [showPanPopup, loading]);

  // ========================================
  // BODY SCROLL LOCK WHEN POPUP OPEN
  // ========================================

  React.useEffect(() => {
    if (showPanPopup) {
      document.body.classList.add(
        "pan-popup-open"
      );
    } else {
      document.body.classList.remove(
        "pan-popup-open"
      );
    }

    return () => {
      document.body.classList.remove(
        "pan-popup-open"
      );
    };
  }, [showPanPopup]);

  return (
    <div className="instant-pan-page">

      <div className="instant-pan-container">

        {/* =====================================
            HEADER
        ====================================== */}

        <div className="instant-pan-header">

          <div className="instant-pan-header-icon">
            <span>₹</span>
          </div>

          <div>
            <div className="instant-pan-brand">
              ONLINEWALAA
            </div>

            <h1>Instant PAN Find</h1>

            <p>
              Aadhaar Number वापरून PAN Number शोधा
            </p>
          </div>

        </div>

        {/* =====================================
            MAIN CARD
        ====================================== */}

        <div className="instant-pan-card">

          <div className="instant-pan-card-top">

            <div className="service-icon">
              🪪
            </div>

            <div>
              <h2>Aadhaar to PAN</h2>

              <p>
                तुमचा Aadhaar Number enter करून
                PAN Number मिळवा.
              </p>
            </div>

          </div>

          {/* =================================
              PRICE
          ================================== */}

          <div className="service-price-box">

            <div>
              <span>Service Charge</span>

              <strong>₹50</strong>
            </div>

          </div>

          {/* =================================
              FORM
          ================================== */}

          <form onSubmit={handleSubmit}>

            <div className="input-group">

              <label htmlFor="aadhaar-number">
                Aadhaar Number
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🔐
                </span>

                <input
                  id="aadhaar-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  value={aadhaar}
                  onChange={handleAadhaarChange}
                  placeholder="Enter 12 digit Aadhaar"
                  disabled={loading}
                />

                {aadhaar.length > 0 && (
                  <span className="digit-count">
                    {aadhaar.length}/12
                  </span>
                )}

              </div>

              <small>
                🔒 तुमची माहिती सुरक्षितपणे process
                केली जाईल.
              </small>

            </div>

            {/* =================================
                ERROR
            ================================== */}

            {error && (
              <div className="pan-error">
                <span>⚠️</span>

                <p>{error}</p>
              </div>
            )}

            {/* =================================
                FIND BUTTON
            ================================== */}

            <button
              type="submit"
              className="find-pan-button"
              disabled={
                loading ||
                aadhaar.length !== 12
              }
            >

              {loading ? (
                <>
                  <span className="button-spinner"></span>

                  PAN शोधत आहे...
                </>
              ) : (
                <>
                  <span>🔎</span>

                  Find PAN Number
                </>
              )}

            </button>

          </form>

          {/* =================================
              INFO ROW
          ================================== */}

          <div className="pan-info-row">

            <div>
              <span>✓</span>
              Success only billing
            </div>

            <div>
              <span>✓</span>
              ₹50 service charge
            </div>

            <div>
              <span>✓</span>
              Wallet payment
            </div>

          </div>

        </div>

        {/* =====================================
            DISCLAIMER
        ====================================== */}

        <div className="instant-pan-disclaimer">

          <span>🔐</span>

          <p>
            Aadhaar Number फक्त PAN lookup service
            साठी वापरला जातो. Service successful
            झाल्यावरच तुमच्या OnlineWalaa wallet
            मधून ₹50 debit केले जातील.
          </p>

        </div>

      </div>

      {/* =================================================
          CONFIRM MODAL
      ================================================== */}

      {showConfirm && (

        <div className="pan-modal-overlay">

          <div className="pan-confirm-modal">

            <button
              type="button"
              className="modal-close-button"
              onClick={() =>
                setShowConfirm(false)
              }
              disabled={loading}
              aria-label="Close"
            >
              ×
            </button>

            <div className="confirm-icon">
              🪪
            </div>

            <h2>
              Confirm PAN Search
            </h2>

            <p>
              तुम्ही खालील Aadhaar Number वरून
              PAN Number शोधणार आहात.
            </p>

            <div className="confirm-aadhaar">
              {maskAadhaar(aadhaar)}
            </div>

            <div className="confirm-charge">

              <span>
                Service Charge
              </span>

              <strong>
                ₹50
              </strong>

            </div>

            <small>
              PAN result successful झाल्यासच ₹50
              wallet मधून debit केले जातील.
            </small>

            <div className="confirm-actions">

              <button
                type="button"
                className="cancel-confirm"
                onClick={() =>
                  setShowConfirm(false)
                }
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-pay"
                onClick={findPan}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    🔎 Find PAN • ₹50
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          PAN SUCCESS POPUP
      ================================================== */}

      {showPanPopup && result?.panNumber && (

        <div
          className="pan-success-overlay"
          onClick={handlePopupOverlayClick}
        >

          <div
            className="pan-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pan-success-title"
          >

            {/* CLOSE */}

            <button
              type="button"
              className="pan-success-close"
              onClick={closePanPopup}
              aria-label="Close PAN result"
            >
              ×
            </button>

            {/* SUCCESS HEADER */}

            <div className="pan-success-header">

              <div className="pan-success-icon">
                ✓
              </div>

              <div>
                <div className="pan-success-label">
                  SUCCESS
                </div>

                <h2 id="pan-success-title">
                  PAN Details Found
                </h2>

                <p>
                  Your PAN Number has been found
                  successfully.
                </p>
              </div>

            </div>

            {/* PAN CARD */}

            <div className="pan-real-card">

              <div className="pan-card-watermark">
                ONLINEWALAA
              </div>

              <div className="pan-card-header">

                <div className="pan-emblem">

                  <div className="emblem-circle">
                    🇮🇳
                  </div>

                </div>

                <div className="pan-government">

                  <strong>
                    INCOME TAX DEPARTMENT
                  </strong>

                  <span>
                    GOVERNMENT OF INDIA
                  </span>

                </div>

                <div className="pan-card-logo">
                  ONLINEWALAA
                </div>

              </div>

              <div className="pan-card-body">

                <div className="pan-photo">

                  <div className="photo-placeholder">
                    👤
                  </div>

                </div>

                <div className="pan-information">

                  <span className="pan-label">
                    Permanent Account Number
                  </span>

                  <div className="pan-number">
                    {result.panNumber}
                  </div>

                  <span className="pan-card-note">
                    PAN Number
                  </span>

                </div>

              </div>

              <div className="pan-card-footer">

                <span>
                  Digital result generated through
                  OnlineWalaa.
                </span>

                <span>
                  PAN
                </span>

              </div>

            </div>

            {/* PAYMENT INFO */}

            <div className="pan-success-payment">

              <div>
                <span>
                  Wallet Debited
                </span>

                <strong>
                  ₹{result.amount || 50}
                </strong>
              </div>

              {result.remainingBalance !== null && (
                <div>
                  <span>
                    Remaining Balance
                  </span>

                  <strong>
                    ₹{result.remainingBalance}
                  </strong>
                </div>
              )}

            </div>

            {/* ACTIONS */}

            <div className="pan-popup-actions">

              <button
                type="button"
                id="pan-copy-button"
                className="copy-pan-button"
                onClick={copyPan}
              >
                {copied
                  ? "✓ Copied"
                  : "📋 Copy PAN"}
              </button>

              <button
                type="button"
                className="close-pan-button"
                onClick={closePanPopup}
              >
                Done
              </button>

            </div>

            {result.transactionId && (
              <div className="pan-transaction-id">
                Transaction ID:{" "}
                {result.transactionId}
              </div>
            )}

          </div>

        </div>

      )}

    </div>
  );
}