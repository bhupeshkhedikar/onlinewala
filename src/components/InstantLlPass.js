import React, {
  useEffect,
  useState,
} from "react";

import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "./firebase";

import "./InstantLlPass.css";

const functions =
  getFunctions(
    undefined,
    "asia-south1"
  );

const InstantLlPass = () => {
  const SERVICE_CHARGE = 120;

  // =========================================================
  // FORM
  // =========================================================

  const [
    applicationNumber,
    setApplicationNumber,
  ] = useState("");

  const [dob, setDob] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [state, setState] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  // =========================================================
  // UI
  // =========================================================

  const [activeTab, setActiveTab] =
    useState("submit");

  const [loading, setLoading] =
    useState(false);

  const [
    statusLoading,
    setStatusLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    statusError,
    setStatusError,
  ] = useState("");

  // =========================================================
  // RESULT
  // =========================================================

  const [result, setResult] =
    useState(null);

  const [
    selectedApplication,
    setSelectedApplication,
  ] = useState(null);

  const [
    statusResult,
    setStatusResult,
  ] = useState(null);

  const [
    applications,
    setApplications,
  ] = useState([]);

  // =========================================================
  // SUCCESS POPUP
  // =========================================================

  const [
    showSuccess,
    setShowSuccess,
  ] = useState(false);

  // =========================================================
  // LOAD USER APPLICATIONS
  // =========================================================

  useEffect(() => {
    const user =
      auth.currentUser;

    if (!user) {
      return;
    }

    const q =
      query(
        collection(
          db,
          "llPassApplicants"
        ),

        where(
          "uid",
          "==",
          user.uid
        ),

        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        q,
        (snapshot) => {
          const list =
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            );

          setApplications(
            list
          );
        },
        (error) => {
          console.error(
            "Applications listener error:",
            error
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // =========================================================
  // APPLICATION NUMBER
  // =========================================================

  const handleApplicationChange = (
    e
  ) => {
    const value =
      e.target.value
        .toUpperCase()
        .replace(
          /[^A-Z0-9-]/g,
          ""
        );

    setApplicationNumber(
      value
    );

    setError("");
  };

  // =========================================================
  // DOB
  // =========================================================

  const handleDobChange = (
    e
  ) => {
    let value =
      e.target.value.replace(
        /[^0-9]/g,
        ""
      );

    if (value.length > 8) {
      value =
        value.substring(
          0,
          8
        );
    }

    if (value.length > 4) {
      value =
        value.substring(0, 2) +
        "-" +
        value.substring(2, 4) +
        "-" +
        value.substring(4);
    } else if (
      value.length > 2
    ) {
      value =
        value.substring(0, 2) +
        "-" +
        value.substring(2);
    }

    setDob(value);

    setError("");
  };

  // =========================================================
  // PASSWORD
  // =========================================================

  const handlePasswordChange = (
    e
  ) => {
    const value =
      e.target.value
        .replace(/\s/g, "")
        .toUpperCase();

    setPassword(value);

    setError("");
  };

  // =========================================================
  // STATE
  // =========================================================

  const handleStateChange = (
    e
  ) => {
    setState(
      e.target.value.toUpperCase()
    );

    setError("");
  };

  // =========================================================
  // SUBMIT LL PASS
  // =========================================================

  const submitLlPass = async () => {
    setError("");

    setResult(null);

    setShowSuccess(false);

    const cleanApplication =
      applicationNumber.trim();

    const cleanDob =
      dob.trim();

    const cleanPassword =
      password.trim();

    const cleanState =
      state.trim().toUpperCase();

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    if (!cleanApplication) {
      setError(
        "कृपया Application Number टाका."
      );
      return;
    }

    if (
      !/^[A-Z0-9-]{5,30}$/.test(
        cleanApplication
      )
    ) {
      setError(
        "कृपया योग्य Application Number टाका."
      );
      return;
    }

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

    if (!cleanPassword) {
      setError(
        "कृपया LL Test Password टाका."
      );
      return;
    }

    if (!cleanState) {
      setError(
        "कृपया State निवडा."
      );
      return;
    }

    if (!auth.currentUser) {
      setError(
        "कृपया प्रथम लॉगिन करा."
      );
      return;
    }

    // ---------------------------------------------------------
    // CALL FIREBASE
    // ---------------------------------------------------------

    setLoading(true);

    try {
      const instantLlPass =
        httpsCallable(
          functions,
          "instantLlPass"
        );

      const response =
        await instantLlPass({
          app_no:
            cleanApplication,

          dob:
            cleanDob,

          password:
            cleanPassword,

          State:
            cleanState,
        });

      const data =
        response?.data;

      console.log(
        "LL Pass response:",
        data
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "LL Pass request successful झाला नाही."
        );
      }

      const finalResult = {
        applicationNumber:
          data.applicationNumber ||
          cleanApplication,

        dob:
          data.dob ||
          cleanDob,

        state:
          data.state ||
          cleanState,

        requestId:
          data.requestId ||
          data.orderId ||
          "",

        orderId:
          data.orderId ||
          data.requestId ||
          "",

        applicantId:
          data.applicantId ||
          "",

        transactionId:
          data.transactionId ||
          "",

        amount:
          Number(
            data.amount
          ) ||
          SERVICE_CHARGE,

        remainingBalance:
          data.remainingBalance,

        message:
          data.message ||
          "Request successful.",
      };

      setResult(
        finalResult
      );

      setShowSuccess(
        true
      );

      // Switch to status tab after success
      setActiveTab(
        "applications"
      );

    } catch (err) {
      console.error(
        "LL Pass error:",
        err
      );

      let message =
        "LL Pass request करताना समस्या आली.";

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
          "LL Pass request successful झाला नाही.";
      } else if (
        err?.code ===
        "functions/unavailable"
      ) {
        message =
          err?.message ||
          "LL Pass service सध्या उपलब्ध नाही.";
      } else if (
        err?.message
      ) {
        message =
          err.message;
      }

      setError(
        message.replace(
          /^FirebaseError:\s*/i,
          ""
        ).trim()
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CHECK STATUS
  // =========================================================

  const checkStatus = async (
    applicant
  ) => {
    if (!applicant) {
      return;
    }

    setStatusError("");

    setStatusResult(null);

    setSelectedApplication(
      applicant
    );

    setStatusLoading(true);

    try {
      const checkLlPassStatus =
        httpsCallable(
          functions,
          "checkLlPassStatus"
        );

      const response =
        await checkLlPassStatus({
          applicantId:
            applicant.id,
        });

      const data =
        response?.data;

      console.log(
        "LL status:",
        data
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Status मिळाला नाही."
        );
      }

      setStatusResult(
        data
      );

      // -------------------------------------------------------
      // UPDATE LOCAL LIST IMMEDIATELY
      // -------------------------------------------------------

      setApplications(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              applicant.id
                ? {
                    ...item,

                    status:
                      data.status,

                    statusMessage:
                      data.message,

                    providerResponse:
                      data.providerResponse,

                    lastStatusCheck:
                      new Date(),
                  }
                : item
          )
      );

    } catch (err) {
      console.error(
        "Check LL status error:",
        err
      );

      let message =
        "Status check करताना समस्या आली.";

      if (
        err?.code ===
        "functions/not-found"
      ) {
        message =
          err?.message ||
          "Application सापडली नाही.";
      } else if (
        err?.code ===
        "functions/permission-denied"
      ) {
        message =
          "ही application तुमची नाही.";
      } else if (
        err?.code ===
        "functions/unavailable"
      ) {
        message =
          "Status service सध्या उपलब्ध नाही.";
      } else if (
        err?.message
      ) {
        message =
          err.message;
      }

      setStatusError(
        message.replace(
          /^FirebaseError:\s*/i,
          ""
        ).trim()
      );
    } finally {
      setStatusLoading(
        false
      );
    }
  };

  // =========================================================
  // CLOSE SUCCESS POPUP
  // =========================================================

  const closeSuccessPopup =
    () => {
      setShowSuccess(
        false
      );
    };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setApplicationNumber("");

    setDob("");

    setPassword("");

    setState("");

    setError("");

    setResult(null);

    setShowSuccess(false);

    setActiveTab(
      "submit"
    );
  };

  // =========================================================
  // FORMAT STATUS
  // =========================================================

  const getStatusClass = (
    status
  ) => {
    const value =
      String(
        status || ""
      )
        .toLowerCase();

    if (
      value.includes(
        "pass"
      ) ||
      value.includes(
        "complete"
      ) ||
      value.includes(
        "success"
      )
    ) {
      return "ll-status-success";
    }

    if (
      value.includes(
        "fail"
      ) ||
      value.includes(
        "reject"
      ) ||
      value.includes(
        "error"
      )
    ) {
      return "ll-status-failed";
    }

    if (
      value.includes(
        "process"
      ) ||
      value.includes(
        "pending"
      ) ||
      value.includes(
        "wait"
      )
    ) {
      return "ll-status-pending";
    }

    return "ll-status-default";
  };

  // =========================================================
  // JSX
  // =========================================================

  return (
    <div className="instant-ll-pass-page">

      <div className="instant-ll-pass-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="instant-ll-pass-header">

          <div className="ll-pass-main-icon">
            🪪
          </div>

          <div>

            <h1>
              Instant LL Pass
            </h1>

            <p>
              LL Test Pass request आणि status check
            </p>

          </div>

        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <div className="ll-pass-tabs">

          <button
            type="button"
            className={
              activeTab ===
              "submit"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "submit"
              )
            }
          >
            <span>
              ⚡
            </span>

            New Request
          </button>

          <button
            type="button"
            className={
              activeTab ===
              "applications"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "applications"
              )
            }
          >
            <span>
              📋
            </span>

            My Applications

            {applications.length >
              0 && (
              <b>
                {applications.length}
              </b>
            )}
          </button>

        </div>

        {/* =================================================
            SUBMIT TAB
        ================================================= */}

        {activeTab ===
          "submit" && (

          <div className="instant-ll-pass-card">

            <div className="ll-pass-badge">
              ⚡ Instant Service
            </div>

            <h2>
              Learning Licence Test Pass
            </h2>

            <p className="ll-pass-description">
              Application Number, DOB, LL Test
              Password आणि State भरा.
            </p>

            {/* APPLICATION */}

            <div className="ll-pass-form-group">

              <label>
                Application Number
              </label>

              <div className="ll-pass-input-wrapper">

                <span className="ll-pass-input-icon">
                  📄
                </span>

                <input
                  type="text"
                  value={
                    applicationNumber
                  }
                  onChange={
                    handleApplicationChange
                  }
                  placeholder="उदा. 3382731234"
                  disabled={
                    loading
                  }
                  autoComplete="off"
                />

              </div>

            </div>

            {/* DOB */}

            <div className="ll-pass-form-group">

              <label>
                Date of Birth
              </label>

              <div className="ll-pass-input-wrapper">

                <span className="ll-pass-input-icon">
                  📅
                </span>

                <input
                  type="text"
                  value={dob}
                  onChange={
                    handleDobChange
                  }
                  placeholder="DD-MM-YYYY"
                  maxLength={10}
                  disabled={
                    loading
                  }
                  inputMode="numeric"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="ll-pass-form-group">

              <label>
                LL Test Password
              </label>

              <div className="ll-pass-input-wrapper">

                <span className="ll-pass-input-icon">
                  🔐
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={
                    handlePasswordChange
                  }
                  placeholder="LL Test Password"
                  disabled={
                    loading
                  }
                  autoComplete="off"
                />

                <button
                  type="button"
                  className="ll-pass-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

            </div>

            {/* STATE */}

            <div className="ll-pass-form-group">

              <label>
                State
              </label>

              <div className="ll-pass-input-wrapper">

                <span className="ll-pass-input-icon">
                  📍
                </span>

                <select
                  value={state}
                  onChange={
                    handleStateChange
                  }
                  disabled={
                    loading
                  }
                >

                  <option value="">
                    Select State
                  </option>

                  <option value="AP">
                    Andhra Pradesh
                  </option>

                  <option value="AS">
                    Assam
                  </option>

                  <option value="BR">
                    Bihar
                  </option>

                  <option value="CG">
                    Chhattisgarh
                  </option>

                  <option value="DL">
                    Delhi
                  </option>

                  <option value="GJ">
                    Gujarat
                  </option>

                  <option value="HR">
                    Haryana
                  </option>

                  <option value="HP">
                    Himachal Pradesh
                  </option>

                  <option value="JH">
                    Jharkhand
                  </option>

                  <option value="KA">
                    Karnataka
                  </option>

                  <option value="KL">
                    Kerala
                  </option>

                  <option value="MP">
                    Madhya Pradesh
                  </option>

                  <option value="MH">
                    Maharashtra
                  </option>

                  <option value="OD">
                    Odisha
                  </option>

                  <option value="PB">
                    Punjab
                  </option>

                  <option value="RJ">
                    Rajasthan
                  </option>

                  <option value="TN">
                    Tamil Nadu
                  </option>

                  <option value="TS">
                    Telangana
                  </option>

                  <option value="UP">
                    Uttar Pradesh
                  </option>

                  <option value="UK">
                    Uttarakhand
                  </option>

                  <option value="WB">
                    West Bengal
                  </option>

                </select>

              </div>

            </div>

            {/* PRICE */}

            <div className="ll-pass-price-box">

              <div className="ll-pass-price-left">

                <span className="ll-pass-price-icon">
                  💰
                </span>

                <div>

                  <span className="ll-pass-price-label">
                    Service Charge
                  </span>

                  <small>
                    Successful request वरच deduct होईल
                  </small>

                </div>

              </div>

              <strong>
                ₹{SERVICE_CHARGE}
              </strong>

            </div>

            {/* ERROR */}

            {error && (
              <div className="ll-pass-error">

                <span>
                  ⚠️
                </span>

                <span>
                  {error}
                </span>

              </div>
            )}

            {/* BUTTON */}

            <button
              type="button"
              className="ll-pass-submit-btn"
              onClick={
                submitLlPass
              }
              disabled={
                loading ||
                !applicationNumber.trim() ||
                !dob.trim() ||
                !password.trim() ||
                !state
              }
            >

              {loading ? (
                <>
                  <span className="ll-pass-spinner"></span>

                  LL Pass process होत आहे...
                </>
              ) : (
                <>
                  ⚡ Submit LL Pass
                </>
              )}

            </button>

            <div className="ll-pass-note">

              <span>
                🔒
              </span>

              <span>
                Request successful झाल्यावरच ₹120
                wallet मधून deduct होतील.
              </span>

            </div>

          </div>
        )}

        {/* =================================================
            APPLICATIONS TAB
        ================================================= */}

        {activeTab ===
          "applications" && (

          <div className="ll-applications-card">

            <div className="ll-applications-heading">

              <div>

                <h2>
                  My LL Applications
                </h2>

                <p>
                  तुमच्या submitted applications चा status
                  येथे check करा.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "submit"
                  )
                }
              >
                + New
              </button>

            </div>

            {/* STATUS ERROR */}

            {statusError && (
              <div className="ll-pass-error">

                ⚠️

                <span>
                  {statusError}
                </span>

              </div>
            )}

            {/* EMPTY */}

            {applications.length ===
              0 && (
              <div className="ll-empty-applications">

                <div>
                  📋
                </div>

                <h3>
                  No Applications Yet
                </h3>

                <p>
                  तुमची पहिली LL Pass request submit करा.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "submit"
                    )
                  }
                >
                  Submit New Request
                </button>

              </div>
            )}

            {/* LIST */}

            {applications.map(
              (app) => (
                <div
                  className="ll-application-item"
                  key={app.id}
                >

                  <div className="ll-application-top">

                    <div>

                      <span className="ll-application-label">
                        Application Number
                      </span>

                      <strong>
                        {
                          app.applicationNumber
                        }
                      </strong>

                    </div>

                    <span
                      className={`ll-status-badge ${getStatusClass(
                        app.status
                      )}`}
                    >
                      {app.status ||
                        "Submitted"}
                    </span>

                  </div>

                  <div className="ll-application-meta">

                    <span>
                      📍 {app.state}
                    </span>

                    <span>
                      💰 ₹{app.amount}
                    </span>

                    <span>
                      🆔{" "}
                      {
                        app.providerOrderId
                      }
                    </span>

                  </div>

                  {app.statusMessage && (
                    <div className="ll-application-message">
                      {app.statusMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    className="ll-check-status-btn"
                    onClick={() =>
                      checkStatus(
                        app
                      )
                    }
                    disabled={
                      statusLoading &&
                      selectedApplication?.id ===
                        app.id
                    }
                  >

                    {statusLoading &&
                    selectedApplication?.id ===
                      app.id ? (
                      <>
                        <span className="ll-pass-spinner dark"></span>

                        Checking...
                      </>
                    ) : (
                      <>
                        🔄 Check Status
                      </>
                    )}

                  </button>

                </div>
              )
            )}

          </div>
        )}

      </div>

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

      {showSuccess &&
        result && (

        <div
          className="ll-pass-popup-overlay"
          onClick={
            closeSuccessPopup
          }
        >

          <div
            className="ll-pass-success-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="ll-pass-popup-x"
              onClick={
                closeSuccessPopup
              }
            >
              ×
            </button>

            <div className="ll-pass-popup-success-icon">
              ✓
            </div>

            <h2>
              LL Pass Request Successful!
            </h2>

            <p className="ll-pass-popup-message">
              {result.message}
            </p>

            <div className="ll-pass-popup-details">

              <div>
                <span>
                  Application Number
                </span>

                <strong>
                  {
                    result.applicationNumber
                  }
                </strong>
              </div>

              <div>
                <span>
                  State
                </span>

                <strong>
                  {result.state}
                </strong>
              </div>

              <div>
                <span>
                  Request ID
                </span>

                <strong>
                  {result.requestId}
                </strong>
              </div>

              <div>
                <span>
                  Amount
                </span>

                <strong>
                  ₹{result.amount}
                </strong>
              </div>

            </div>

            <div className="ll-pass-popup-status">

              <span>
                ✓
              </span>

              <div>

                <strong>
                  Request Submitted
                </strong>

                <small>
                  तुमची request successfully submit झाली आहे.
                  आता My Applications मधून status check करू शकता.
                </small>

              </div>

            </div>

            <div className="ll-pass-popup-actions">

              <button
                type="button"
                className="ll-pass-popup-close-btn"
                onClick={
                  closeSuccessPopup
                }
              >
                Close
              </button>

              <button
                type="button"
                className="ll-pass-popup-new-btn"
                onClick={() => {
                  closeSuccessPopup();

                  setActiveTab(
                    "applications"
                  );
                }}
              >
                Check Status
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          STATUS RESULT POPUP
      ===================================================== */}

      {statusResult && (

        <div
          className="ll-pass-popup-overlay"
          onClick={() =>
            setStatusResult(null)
          }
        >

          <div
            className="ll-status-result-popup"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="ll-pass-popup-x"
              onClick={() =>
                setStatusResult(null)
              }
            >
              ×
            </button>

            <div
              className={`ll-status-large-icon ${getStatusClass(
                statusResult.status
              )}`}
            >
              {getStatusClass(
                statusResult.status
              ) ===
              "ll-status-success"
                ? "✓"
                : getStatusClass(
                    statusResult.status
                  ) ===
                  "ll-status-failed"
                ? "!"
                : "⏳"}
            </div>

            <h2>
              LL Application Status
            </h2>

            <div
              className={`ll-status-big-badge ${getStatusClass(
                statusResult.status
              )}`}
            >
              {
                statusResult.status ||
                "Unknown"
              }
            </div>

            <p>
              {
                statusResult.message
              }
            </p>

            <div className="ll-status-result-details">

              <div>
                <span>
                  Application Number
                </span>

                <strong>
                  {
                    statusResult.applicationNumber
                  }
                </strong>
              </div>

              <div>
                <span>
                  State
                </span>

                <strong>
                  {
                    statusResult.state
                  }
                </strong>
              </div>

              <div>
                <span>
                  Order ID
                </span>

                <strong>
                  {
                    statusResult.orderId
                  }
                </strong>
              </div>

            </div>

            <button
              type="button"
              className="ll-status-close-button"
              onClick={() =>
                setStatusResult(null)
              }
            >
              Done
            </button>

          </div>

        </div>
      )}

    </div>
  );
};

export default InstantLlPass;