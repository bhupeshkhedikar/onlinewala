import React, { useState } from "react";
import { app } from "./firebase";
import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import "./Withdraw.css";

const functions = getFunctions(
  app,
  "asia-south1"
);

const createWithdrawal = httpsCallable(
  functions,
  "createWithdrawal"
);

export default function Withdraw({
  user,
  availableBalance = 0,
  onClose,
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);

  const balance = Number(availableBalance) || 0;

  const quickAmounts = [100, 200, 500, 1000];

  const validateUpi = (value) => {
    return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9._-]{2,}$/.test(
      value.trim()
    );
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;

    if (
      value === "" ||
      /^\d*\.?\d*$/.test(value)
    ) {
      setAmount(value);
      setError("");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();

    setError("");

    const withdrawalAmount = Number(amount);
    const cleanUpi = upiId.trim().toLowerCase();

    if (!user?.uid) {
      setError("कृपया आधी लॉग इन करा.");
      return;
    }

    if (
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount < 100
    ) {
      setError("किमान withdrawal amount ₹100 आहे.");
      return;
    }

    if (withdrawalAmount > 50000) {
      setError("कमाल withdrawal amount ₹50,000 आहे.");
      return;
    }

    if (withdrawalAmount > balance) {
      setError(
        `तुमच्या available balance मध्ये फक्त ₹${balance.toLocaleString(
          "en-IN"
        )} उपलब्ध आहेत.`
      );
      return;
    }

    if (!cleanUpi) {
      setError("कृपया तुमचा UPI ID टाका.");
      return;
    }

    if (!validateUpi(cleanUpi)) {
      setError("कृपया valid UPI ID टाका.");
      return;
    }

    try {
      setLoading(true);

      const result = await createWithdrawal({
        amount: withdrawalAmount,
        upiId: cleanUpi,
      });

      const data = result?.data;

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Withdrawal request create नहीं हुई."
        );
      }

      setWithdrawnAmount(
        withdrawalAmount
      );

      setSuccess(true);

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      console.error(
        "Withdrawal error:",
        err
      );

      let message =
        "Withdrawal request create करते समय error आया.";

      if (
        err?.code ===
        "functions/unauthenticated"
      ) {
        message =
          "आपका session expire हो गया है. कृपया दोबारा login करें.";
      } else if (
        err?.code ===
        "functions/failed-precondition"
      ) {
        message =
          err.message ||
          "Withdrawal अभी process नहीं हो सकता.";
      } else if (
        err?.code ===
        "functions/invalid-argument"
      ) {
        message =
          err.message ||
          "Withdrawal details invalid हैं.";
      } else if (
        err?.message
      ) {
        message =
          err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMax = () => {
    if (balance >= 100) {
      setAmount(
        Math.floor(balance).toString()
      );
      setError("");
    } else {
      setError(
        "Withdrawal के लिए कम से कम ₹100 available balance चाहिए."
      );
    }
  };

  if (success) {
    return (
      <div
        className="withdraw-overlay"
        onMouseDown={(e) => {
          if (
            e.target === e.currentTarget &&
            onClose
          ) {
            onClose();
          }
        }}
      >
        <div className="withdraw-modal">
          <div className="withdraw-success">
            <div className="withdraw-success-icon">
              ✓
            </div>

            <h3>
              Withdrawal Request Submitted
            </h3>

            <div className="withdraw-success-amount">
              ₹
              {withdrawnAmount.toLocaleString(
                "en-IN"
              )}
            </div>

            <p>
              आपकी withdrawal request successfully
              submit हो गई है।
              <br />
              Admin verification के बाद payment
              process किया जाएगा।
            </p>

            <button
              type="button"
              className="withdraw-success-close"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="withdraw-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading &&
          onClose
        ) {
          onClose();
        }
      }}
    >
      <div className="withdraw-modal">
        <div className="withdraw-header">
          <div className="withdraw-header-left">
            <div className="withdraw-icon">
              ₹
            </div>

            <div>
              <h2>
                Withdraw Money
              </h2>

              <p>
                अपने available balance से withdraw करें
              </p>
            </div>
          </div>

          <button
            type="button"
            className="withdraw-close"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="withdraw-body">
          <div className="withdraw-balance">
            <div>
              <div className="withdraw-balance-label">
                Available Balance
              </div>

              <div className="withdraw-balance-amount">
                ₹
                {balance.toLocaleString(
                  "en-IN"
                )}
              </div>
            </div>

            <button
              type="button"
              className="withdraw-max-btn"
              onClick={handleMax}
              disabled={
                loading ||
                balance < 100
              }
            >
              MAX
            </button>
          </div>

          {error && (
            <div className="withdraw-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleWithdraw}>
            <div className="withdraw-form-group">
              <label htmlFor="withdrawAmount">
                Withdrawal Amount
              </label>

              <div className="withdraw-input-wrapper">
                <span className="withdraw-input-prefix">
                  ₹
                </span>

                <input
                  id="withdrawAmount"
                  type="text"
                  inputMode="decimal"
                  className="withdraw-input"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={
                    handleAmountChange
                  }
                  disabled={loading}
                  autoComplete="off"
                />
              </div>

              <div className="withdraw-help">
                Minimum ₹100 • Maximum ₹50,000
              </div>

              <div className="withdraw-quick-amounts">
                {quickAmounts.map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      className="withdraw-quick-btn"
                      onClick={() => {
                        if (
                          value <= balance
                        ) {
                          setAmount(
                            value.toString()
                          );
                          setError("");
                        } else {
                          setError(
                            "इतना balance उपलब्ध नहीं है."
                          );
                        }
                      }}
                      disabled={loading}
                    >
                      ₹{value}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="withdraw-form-group">
              <label htmlFor="withdrawUpi">
                UPI ID
              </label>

              <input
                id="withdrawUpi"
                type="text"
                className="withdraw-upi-input"
                placeholder="example@upi"
                value={upiId}
                onChange={(e) => {
                  setUpiId(
                    e.target.value
                  );
                  setError("");
                }}
                disabled={loading}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
              />

              <div className="withdraw-help">
                Payment इसी UPI ID पर भेजा जाएगा.
              </div>
            </div>

            <div className="withdraw-info">
              <div className="withdraw-info-title">
                Withdrawal Information
              </div>

              <ul>
                <li>
                  Minimum withdrawal ₹100 है.
                </li>

                <li>
                  Request पहले pending रहेगी.
                </li>

                <li>
                  Admin verification के बाद payment
                  process होगा.
                </li>

                <li>
                  Pending referral reward withdraw
                  नहीं किया जा सकता.
                </li>
              </ul>
            </div>

            <button
              type="submit"
              className="withdraw-submit"
              disabled={
                loading ||
                balance < 100
              }
            >
              {loading ? (
                <span className="withdraw-loading">
                  <span className="withdraw-spinner"></span>
                  Submitting...
                </span>
              ) : (
                "Request Withdrawal"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}