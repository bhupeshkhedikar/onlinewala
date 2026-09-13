import React, { useState } from "react";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "./firebase";

import "./InstantNumberLinkWithVoter.css";

const functions = getFunctions(
  app,
  "asia-south1"
);

const instantNumberLinkWithVoter =
  httpsCallable(
    functions,
    "instantNumberLinkWithVoter"
  );

const InstantNumberLinkWithVoter = () => {
  const [epic, setEpic] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [resultData, setResultData] =
    useState(null);

  // ----------------------------------------------------------
  // Submit
  // ----------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setResultData(null);

    const cleanEpic = epic
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    const cleanMobile = mobile
      .replace(/\D/g, "");

    if (!cleanEpic) {
      setError(
        "कृपया Voter Number (EPIC) टाका."
      );
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        cleanMobile
      )
    ) {
      setError(
        "कृपया Valid 10 digit Mobile Number टाका."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await instantNumberLinkWithVoter(
          {
            epic: cleanEpic,
            mobile: cleanMobile,
          }
        );

      const data =
        response?.data;

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Request failed."
        );
      }

      // Popup open
      setResultData(data);

    } catch (err) {
      console.error(
        "Voter link error:",
        err
      );

      setError(
        err?.message ||
          "Request करताना अडचण आली."
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // Close
  // ----------------------------------------------------------

  const closePopup = () => {
    setResultData(null);
  };

  // ----------------------------------------------------------
  // JSX
  // ----------------------------------------------------------

  return (
    <>
      <div className="voter-link-page">

        <div className="voter-link-card">

          {/* Icon */}

          <div className="voter-link-icon">
            🗳️
          </div>

          <h1>
            Voter Mobile Link
          </h1>

          <p className="voter-link-subtitle">
            Voter ID सोबत Mobile Number Link करा
          </p>


          {/* Form */}

          <form
            onSubmit={handleSubmit}
            className="voter-link-form"
          >

            {/* EPIC */}

            <div className="voter-field">

              <label>
                Voter Number (EPIC)
              </label>

              <input
                type="text"
                value={epic}
                onChange={(e) =>
                  setEpic(
                    e.target.value
                      .toUpperCase()
                  )
                }
                placeholder="उदा. UCG0228569"
                maxLength={20}
                autoComplete="off"
                disabled={loading}
              />

              <span>
                तुमचा Voter EPIC Number टाका
              </span>

            </div>


            {/* Mobile */}

            <div className="voter-field">

              <label>
                Mobile Number
              </label>

              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                placeholder="10 digit mobile number"
                maxLength={10}
                inputMode="numeric"
                autoComplete="tel"
                disabled={loading}
              />

              <span>
                Link करायचा 10 digit Mobile Number
              </span>

            </div>


            {/* Error */}

            {error && (
              <div className="voter-link-error">
                {error}
              </div>
            )}


            {/* Submit */}

            <button
              type="submit"
              className="voter-link-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="voter-link-spinner"></span>

                  Request Processing...
                </>
              ) : (
                <>
                  🔗 Mobile Number Link करा
                </>
              )}

            </button>

          </form>


          {/* Price */}

          <div className="voter-link-price">

            <span>
              Service Charge
            </span>

            <strong>
              ₹40
            </strong>

          </div>


          <p className="voter-link-secure">
            🔒 Secure &amp; Instant Service
          </p>

        </div>

      </div>


      {/* ======================================================
          SUCCESS POPUP
      ====================================================== */}

      {resultData && (
        <div
          className="voter-popup-overlay"
          onClick={closePopup}
        >

          <div
            className="voter-success-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Close */}

            <button
              type="button"
              className="voter-popup-close"
              onClick={closePopup}
            >
              ×
            </button>


            {/* Success */}

            <div className="voter-success-icon">
              ✓
            </div>


            <h2>
              Request Successful
            </h2>

            <p className="voter-success-message">
              {resultData.message ||
                "Mobile Number Link Request successful."}
            </p>


            {/* Details */}

            <div className="voter-result-box">

              <div className="voter-result-row">

                <span>
                  Voter Number
                </span>

                <strong>
                  {resultData.epic}
                </strong>

              </div>


              <div className="voter-result-row">

                <span>
                  Mobile Number
                </span>

                <strong>
                  {resultData.mobile}
                </strong>

              </div>


              {resultData.result && (
                <div className="voter-result-row">

                  <span>
                    Request ID
                  </span>

                  <strong>
                    {String(
                      resultData.result
                    )}
                  </strong>

                </div>
              )}


              <div className="voter-result-row">

                <span>
                  Service Charge
                </span>

                <strong>
                  ₹{resultData.amount}
                </strong>

              </div>

            </div>


            {/* Footer */}

            <button
              type="button"
              className="voter-popup-done"
              onClick={closePopup}
            >
              Done
            </button>

          </div>

        </div>
      )}
    </>
  );
};

export default InstantNumberLinkWithVoter;