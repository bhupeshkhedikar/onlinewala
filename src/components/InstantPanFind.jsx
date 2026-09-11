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

  const SERVICE_CHARGE = 10;

  const handleAadhaarChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 12);

    setAadhaar(value);
    setError("");
    setResult(null);
  };

  const findPan = async () => {
    setError("");
    setResult(null);

    if (!auth.currentUser) {
      setError("कृपया आधी Login करा.");
      return;
    }

    if (aadhaar.length !== 12) {
      setError("कृपया 12 अंकी Aadhaar Number टाका.");
      return;
    }

    setShowConfirm(false);
    setLoading(true);

    try {
      const instantPanFind = httpsCallable(
        functions,
        "instantPanFind"
      );

      const response = await instantPanFind({
        aadhaarNumber: aadhaar,
      });

      const data = response.data;

      if (!data?.success) {
        throw new Error(
          data?.message || "PAN Number शोधता आला नाही."
        );
      }

      setResult({
        panNumber: data.panNumber,
        amount: Number(data.amount || SERVICE_CHARGE),
        transactionId: data.transactionId || "",
      });

      setAadhaar("");
    } catch (err) {
      console.error("Instant PAN Find Error:", err);

      setError(
        err?.message ||
          "PAN Number शोधताना काहीतरी error आला."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (aadhaar.length !== 12) {
      setError("कृपया 12 अंकी Aadhaar Number टाका.");
      return;
    }

    setShowConfirm(true);
  };

  const maskAadhaar = (value) => {
    if (!value) return "";

    return `XXXX XXXX ${value.slice(-4)}`;
  };

  const copyPan = async () => {
    if (!result?.panNumber) return;

    try {
      await navigator.clipboard.writeText(result.panNumber);

      const button = document.getElementById(
        "pan-copy-button"
      );

      if (button) {
        button.innerText = "✓ Copied";

        setTimeout(() => {
          button.innerText = "Copy PAN";
        }, 1500);
      }
    } catch {
      setError("PAN copy करता आला नाही.");
    }
  };

  return (
    <div className="instant-pan-page">

      <div className="instant-pan-container">

        {/* HEADER */}
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

        {/* MAIN CARD */}
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

          {/* PRICE */}
          <div className="service-price-box">

            <div>
              <span>Service Charge</span>

              <strong>₹10</strong>
            </div>

            <div className="price-badge">
              PER HIT
            </div>

          </div>

          {/* FORM */}
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
                🔒 तुमची माहिती सुरक्षितपणे process केली
                जाईल.
              </small>

            </div>

            {error && (
              <div className="pan-error">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

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

          {/* INFO */}
          <div className="pan-info-row">

            <div>
              <span>✓</span>
              Success only billing
            </div>

            <div>
              <span>✓</span>
              ₹10 / successful hit
            </div>

            <div>
              <span>✓</span>
              Wallet payment
            </div>

          </div>

        </div>

        {/* RESULT */}
        {result?.panNumber && (
          <div className="pan-result-section">

            <div className="result-heading">

              <div>
                <span>RESULT</span>
                <h2>PAN Details Found</h2>
              </div>

              <div className="success-check">
                ✓
              </div>

            </div>

            {/* PAN CARD */}
            <div className="pan-real-card">

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
                  This is a digital result generated
                  through OnlineWalaa.
                </span>

                <span>
                  PAN
                </span>

              </div>

            </div>

            {/* RESULT ACTIONS */}
            <div className="pan-result-actions">

              <button
                id="pan-copy-button"
                type="button"
                onClick={copyPan}
                className="copy-pan-button"
              >
                📋 Copy PAN
              </button>

              <div className="charged-info">
                <span>Wallet Debited</span>
                <strong>
                  ₹{result.amount}
                </strong>
              </div>

            </div>

            {result.transactionId && (
              <div className="pan-transaction-id">
                Transaction ID: {result.transactionId}
              </div>
            )}

          </div>
        )}

        {/* FOOTER NOTE */}
        <div className="instant-pan-disclaimer">

          <span>🔐</span>

          <p>
            Aadhaar Number फक्त PAN lookup service साठी
            वापरला जातो. Service successful झाल्यावरच
            तुमच्या OnlineWalaa wallet मधून ₹10 debit
            केले जातील.
          </p>

        </div>

      </div>

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div className="pan-modal-overlay">

          <div className="pan-confirm-modal">

            <div className="confirm-icon">
              🪪
            </div>

            <h2>Confirm PAN Search</h2>

            <p>
              तुम्ही खालील Aadhaar Number वरून
              PAN Number शोधणार आहात.
            </p>

            <div className="confirm-aadhaar">
              {maskAadhaar(aadhaar)}
            </div>

            <div className="confirm-charge">

              <span>Service Charge</span>

              <strong>₹10</strong>

            </div>

            <small>
              PAN result successful झाल्यासच ₹10
              wallet मधून debit केले जातील.
            </small>

            <div className="confirm-actions">

              <button
                type="button"
                className="cancel-confirm"
                onClick={() => setShowConfirm(false)}
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
                    🔎 Find PAN • ₹10
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}