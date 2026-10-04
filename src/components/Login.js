import { useState, useEffect } from "react";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth, db } from "./firebase";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import "./Login.css";

export default function Login({
  onLoginSuccess,
  onSwitchToSignup,
}) {
  /* =========================================================
     STATES
  ========================================================= */

  const [mobile, setMobile] = useState("");

  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);

  const [confirmationResult, setConfirmationResult] =
    useState(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [resending, setResending] = useState(false);

  const [countdown, setCountdown] = useState(0);

  /* =========================================================
     ADMIN STATES
  ========================================================= */

  const [adminMode, setAdminMode] = useState(false);

  const [adminEmail, setAdminEmail] = useState("");

  const [adminPassword, setAdminPassword] = useState("");

  const ADMIN_SECRET_CODE = "1999";

  /* =========================================================
     COUNTDOWN
  ========================================================= */

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) =>
        prev > 0 ? prev - 1 : 0
      );
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [countdown]);

  /* =========================================================
     CLEANUP RECAPTCHA
  ========================================================= */

  useEffect(() => {
    return () => {
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      } catch (error) {
        console.log(
          "Recaptcha cleanup error:",
          error
        );
      }
    };
  }, []);

  /* =========================================================
     SETUP RECAPTCHA
  ========================================================= */

  const setupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        return window.recaptchaVerifier;
      }

      window.recaptchaVerifier =
        new RecaptchaVerifier(
          auth,
          "login-recaptcha-container",
          {
            size: "invisible",

            callback: () => {
              console.log(
                "Login reCAPTCHA verified"
              );
            },

            "expired-callback": () => {
              console.log(
                "Login reCAPTCHA expired"
              );

              if (window.recaptchaVerifier) {
                try {
                  window.recaptchaVerifier.clear();
                } catch (error) {}

                window.recaptchaVerifier = null;
              }
            },
          }
        );

      return window.recaptchaVerifier;
    } catch (error) {
      console.error(
        "Recaptcha setup error:",
        error
      );

      throw error;
    }
  };

  /* =========================================================
     MOBILE INPUT CHANGE
     
     1999 = ADMIN MODE
     Anything else = NORMAL USER
  ========================================================= */

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    setMobile(value);
    setError("");

    /*
      SECRET ADMIN CODE
      =================
      Exactly 1999 entered:
      Show Admin Email/Password
    */

    if (value === ADMIN_SECRET_CODE) {
      setAdminMode(true);

      /*
        Clear OTP related states
        because this is admin mode.
      */

      setOtpSent(false);
      setConfirmationResult(null);
      setOtp("");
    } else {
      setAdminMode(false);
    }
  };

  /* =========================================================
     ADMIN LOGIN
  ========================================================= */

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!adminEmail.trim()) {
      setError(
        "कृपया Admin Email ID टाका."
      );

      return;
    }

    if (!adminPassword) {
      setError(
        "कृपया Admin Password टाका."
      );

      return;
    }

    try {
      setLoading(true);

      /*
        FIREBASE EMAIL/PASSWORD LOGIN
      */

      const result =
        await signInWithEmailAndPassword(
          auth,
          adminEmail.trim(),
          adminPassword
        );

      const adminUser = result.user;

      /*
        CHECK FIRESTORE ADMIN ROLE

        users/{uid}
        role: "admin"
      */

      const adminRef = doc(
        db,
        "users",
        adminUser.uid
      );

      const adminSnapshot =
        await getDoc(adminRef);

      if (!adminSnapshot.exists()) {
        await auth.signOut();

        setError(
          "Admin profile सापडले नाही."
        );

        return;
      }

      const adminData =
        adminSnapshot.data();

      if (adminData.role !== "admin") {
        await auth.signOut();

        setError(
          "तुमच्याकडे Admin access नाही."
        );

        return;
      }

      console.log(
        "Admin login successful:",
        adminUser.uid
      );

      /*
        LOGIN SUCCESS
      */

      if (onLoginSuccess) {
        onLoginSuccess(adminUser);
      }
    } catch (err) {
      console.error(
        "Admin Login Error:",
        err
      );

      if (
        err.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Email ID किंवा Password चुकीचा आहे."
        );
      } else if (
        err.code ===
        "auth/user-not-found"
      ) {
        setError(
          "Admin account सापडले नाही."
        );
      } else if (
        err.code ===
        "auth/wrong-password"
      ) {
        setError(
          "Password चुकीचा आहे."
        );
      } else if (
        err.code ===
        "auth/invalid-email"
      ) {
        setError(
          "Email ID योग्य नाही."
        );
      } else {
        setError(
          "Admin login करताना काहीतरी चूक झाली."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CHECK USER BY MOBILE
     
     This is important because Admin-created users
     may have a different Firebase Auth UID.
  ========================================================= */

  const findUserByMobile = async (
    cleanMobile
  ) => {
    try {
      const usersRef = collection(
        db,
        "users"
      );

      /*
        Primary search:
        users.mobile == cleanMobile
      */

      const mobileQuery = query(
        usersRef,
        where(
          "mobile",
          "==",
          cleanMobile
        )
      );

      const snapshot =
        await getDocs(mobileQuery);

      if (!snapshot.empty) {
        const userDoc =
          snapshot.docs[0];

        return {
          id: userDoc.id,
          data: userDoc.data(),
        };
      }

      /*
        Fallback:
        Some older profiles may have
        phoneNumber instead of mobile.
      */

      const phoneQuery = query(
        usersRef,
        where(
          "phoneNumber",
          "==",
          `+91${cleanMobile}`
        )
      );

      const phoneSnapshot =
        await getDocs(phoneQuery);

      if (!phoneSnapshot.empty) {
        const userDoc =
          phoneSnapshot.docs[0];

        return {
          id: userDoc.id,
          data: userDoc.data(),
        };
      }

      return null;
    } catch (error) {
      console.error(
        "Find user by mobile error:",
        error
      );

      throw error;
    }
  };

  /* =========================================================
     SEND OTP
  ========================================================= */

  const handleSendOTP = async () => {
    setError("");

    const cleanMobile = mobile
      .replace(/\D/g, "")
      .trim();

    /*
      ADMIN CODE ENTERED
      ==================
      Do NOT send OTP
    */

    if (
      cleanMobile === ADMIN_SECRET_CODE
    ) {
      setAdminMode(true);

      return;
    }

    /*
      VALIDATE MOBILE
    */

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      setError(
        "कृपया 10 अंकी मोबाईल नंबर टाका."
      );

      return;
    }

    try {
      setLoading(true);

      /*
        CHECK WHETHER USER EXISTS
        IN FIRESTORE
      */

      const existingUser =
        await findUserByMobile(
          cleanMobile
        );

      if (!existingUser) {
        setError(
          "या मोबाईल नंबरवर खाते सापडले नाही. कृपया आधी साइन अप करा."
        );

        setLoading(false);

        return;
      }

      /*
        OPTIONAL:
        If mobile login is disabled
        for a particular admin-created user,
        prevent login.
      */

      const userData =
        existingUser.data;

      if (
        userData.mobileLoginEnabled ===
        false
      ) {
        setError(
          "या मोबाईल नंबरसाठी Mobile Login बंद आहे. Admin शी संपर्क करा."
        );

        setLoading(false);

        return;
      }

      /*
        SETUP RECAPTCHA
      */

      const appVerifier =
        setupRecaptcha();

      /*
        SEND OTP
      */

      const phoneNumber =
        `+91${cleanMobile}`;

      const confirmation =
        await signInWithPhoneNumber(
          auth,
          phoneNumber,
          appVerifier
        );

      setConfirmationResult(
        confirmation
      );

      setOtpSent(true);

      setCountdown(30);

      setError("");
    } catch (err) {
      console.error(
        "Send Login OTP Error:",
        err
      );

      if (
        err.code ===
        "auth/invalid-phone-number"
      ) {
        setError(
          "मोबाईल नंबर योग्य नाही."
        );
      } else if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "खूप प्रयत्न झाले आहेत. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
        );
      } else if (
        err.code ===
        "auth/quota-exceeded"
      ) {
        setError(
          "OTP SMS quota संपली आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
        );
      } else if (
        err.code ===
        "auth/invalid-app-credential"
      ) {
        setError(
          "OTP verification setup मध्ये समस्या आहे. कृपया Firebase reCAPTCHA / Authorized Domain settings तपासा."
        );
      } else {
        setError(
          "OTP पाठवताना काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     VERIFY OTP
  ========================================================= */

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setError("");

    if (!confirmationResult) {
      setError(
        "कृपया आधी OTP मागवा."
      );

      return;
    }

    const cleanOTP = otp
      .replace(/\D/g, "")
      .trim();

    if (cleanOTP.length !== 6) {
      setError(
        "कृपया 6 अंकी OTP टाका."
      );

      return;
    }

    try {
      setLoading(true);

      /*
        VERIFY OTP
      */

      const result =
        await confirmationResult.confirm(
          cleanOTP
        );

      /*
        Firebase Phone Auth user

        IMPORTANT:
        This UID can be different from
        the UID created by Admin Panel.
      */

      const authenticatedUser =
        result.user;

      console.log(
        "Phone OTP login successful:",
        authenticatedUser.uid
      );

      /*
        GET REGISTERED MOBILE
      */

      const cleanMobile =
        mobile
          .replace(/\D/g, "")
          .trim();

      /*
        FIND FIRESTORE PROFILE BY MOBILE
        instead of only using:
        users/{authenticatedUser.uid}
      */

      const existingUser =
        await findUserByMobile(
          cleanMobile
        );

      if (!existingUser) {
        /*
          This should normally never happen
          because we already checked before
          sending OTP.
        */

        await auth.signOut();

        setError(
          "तुमचे प्रोफाईल सापडले नाही. कृपया पुन्हा Login करा."
        );

        return;
      }

      const userProfile =
        existingUser.data;

      /*
        CHECK ROLE

        Normal mobile login should
        normally be a user account.

        Admin login continues through
        Email + Password.
      */

      if (
        userProfile.role &&
        userProfile.role !== "user" &&
        userProfile.role !== "admin"
      ) {
        await auth.signOut();

        setError(
          "या खात्याची भूमिका योग्य नाही. Admin शी संपर्क करा."
        );

        return;
      }

      /*
        COMBINE FIREBASE AUTH USER
        + FIRESTORE PROFILE

        This gives your app access to:
        - uid
        - name
        - mobile
        - email
        - role
        - referral data
        etc.
      */

      const loggedInUser = {
        ...authenticatedUser,
        ...userProfile,

        /*
          Keep actual Firebase Auth UID
          separately.
        */

        uid: authenticatedUser.uid,

        /*
          Firestore profile document ID.
          Useful when Admin-created account
          has a different UID.
        */

        profileId: existingUser.id,

        /*
          Keep mobile consistent.
        */

        mobile:
          userProfile.mobile ||
          cleanMobile,

        phoneNumber:
          userProfile.phoneNumber ||
          `+91${cleanMobile}`,
      };

      console.log(
        "User profile found:",
        existingUser.id
      );

      console.log(
        "Logged in user:",
        loggedInUser
      );

      /*
        LOGIN SUCCESS
      */

      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
      }
    } catch (err) {
      console.error(
        "OTP Verification Error:",
        err
      );

      if (
        err.code ===
        "auth/invalid-verification-code"
      ) {
        setError(
          "OTP चुकीचा आहे. कृपया पुन्हा तपासा."
        );
      } else if (
        err.code ===
        "auth/code-expired"
      ) {
        setError(
          "OTP ची वेळ संपली आहे. कृपया नवीन OTP मागवा."
        );
      } else if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "खूप प्रयत्न झाले आहेत. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
        );
      } else {
        setError(
          "OTP verify करताना काहीतरी चूक झाली."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     RESEND OTP
  ========================================================= */

  const handleResendOTP = async () => {
    if (
      countdown > 0 ||
      resending
    ) {
      return;
    }

    setError("");

    setResending(true);

    try {
      /*
        CLEAR OLD RECAPTCHA
      */

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {}

        window.recaptchaVerifier = null;
      }

      const appVerifier =
        setupRecaptcha();

      const cleanMobile =
        mobile
          .replace(/\D/g, "")
          .trim();

      /*
        Verify that this mobile
        still belongs to a registered user.
      */

      const existingUser =
        await findUserByMobile(
          cleanMobile
        );

      if (!existingUser) {
        setError(
          "या मोबाईल नंबरवर खाते सापडले नाही."
        );

        return;
      }

      const confirmation =
        await signInWithPhoneNumber(
          auth,
          `+91${cleanMobile}`,
          appVerifier
        );

      setConfirmationResult(
        confirmation
      );

      setCountdown(30);

      setOtp("");

      setError("");
    } catch (err) {
      console.error(
        "Resend OTP Error:",
        err
      );

      setError(
        "OTP पुन्हा पाठवता आला नाही. कृपया थोड्या वेळाने प्रयत्न करा."
      );
    } finally {
      setResending(false);
    }
  };

  /* =========================================================
     CHANGE MOBILE
  ========================================================= */

  const handleChangeMobile = () => {
    setOtpSent(false);

    setConfirmationResult(null);

    setOtp("");

    setError("");
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="auth-wrapper">

      <div className="glow-orb orb-1"></div>

      <div className="glow-orb orb-2"></div>

      <div className="auth-card fade-in">

        {/* =================================================
           HEADER
        ================================================= */}

        <div className="auth-header">

          <div className="auth-logo">
            🔒
          </div>

          <h2>
            पुन्हा स्वागत आहे
          </h2>

          <p>
            तुमच्या डॅशबोर्डवर जाण्यासाठी
            लॉग इन करा.
          </p>

        </div>

        {/* =================================================
           ERROR
        ================================================= */}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* =================================================
           ADMIN LOGIN
        ================================================= */}

        {adminMode ? (

          <form
            className="auth-form"
            onSubmit={
              handleAdminLogin
            }
          >

            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
              }}
            >

              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "8px",
                }}
              >
                🔐
              </div>

              <h3
                style={{
                  margin: "0",
                  color: "#facc15",
                }}
              >
                Admin Login
              </h3>

              <p
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  marginTop: "6px",
                }}
              >
                Admin account ने login करा
              </p>

            </div>

            {/* ADMIN EMAIL */}

            <div className="auth-input-group">

              <label htmlFor="admin-email">
                Admin Email ID
              </label>

              <input
                type="email"
                id="admin-email"
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => {
                  setAdminEmail(
                    e.target.value
                  );

                  setError("");
                }}
                autoComplete="username"
                required
              />

            </div>

            {/* ADMIN PASSWORD */}

            <div className="auth-input-group">

              <label htmlFor="admin-password">
                Password
              </label>

              <input
                type="password"
                id="admin-password"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(
                    e.target.value
                  );

                  setError("");
                }}
                autoComplete="current-password"
                required
              />

            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading
                ? "Login होत आहे..."
                : "Admin Login"}
            </button>

            {/* BACK TO USER LOGIN */}

            <div
              style={{
                textAlign: "center",
                marginTop: "15px",
              }}
            >

              <button
                type="button"
                onClick={() => {

                  setAdminMode(false);

                  setMobile("");

                  setAdminEmail("");

                  setAdminPassword("");

                  setError("");

                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >

                ← User Login वर जा

              </button>

            </div>

          </form>

        ) : (

          /* =================================================
             NORMAL USER LOGIN
          ================================================= */

          !otpSent ? (

            <div className="auth-form">

              <div className="auth-input-group">

                <label htmlFor="login-mobile">
                  मोबाईल नंबर
                </label>

                <input
                  type="tel"
                  id="login-mobile"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={
                    handleMobileChange
                  }
                  maxLength="10"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />

              </div>

              <button
                type="button"
                className="auth-btn"
                onClick={
                  handleSendOTP
                }
                disabled={loading}
              >

                {loading
                  ? "OTP पाठवत आहे..."
                  : "OTP पाठवा"}

              </button>

              <div
                id="login-recaptcha-container"
              ></div>

            </div>

          ) : (

            /* =================================================
               OTP
            ================================================= */

            <form
              onSubmit={
                handleVerifyOTP
              }
              className="auth-form"
            >

              <div className="auth-input-group">

                <label htmlFor="login-otp">
                  OTP
                </label>

                <input
                  type="text"
                  id="login-otp"
                  placeholder="6 अंकी OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                    )
                  }
                  maxLength="6"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                />

              </div>

              <p
                style={{
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#94a3b8",
                  marginBottom: "15px",
                }}
              >
                +91 {mobile} वर OTP पाठवला आहे.
              </p>

              <button
                type="submit"
                className="auth-btn"
                disabled={loading}
              >

                {loading
                  ? "तपासणी होत आहे..."
                  : "OTP Verify करा"}

              </button>

              <div
                style={{
                  textAlign: "center",
                  marginTop: "15px",
                }}
              >

                <button
                  type="button"
                  onClick={
                    handleResendOTP
                  }
                  disabled={
                    countdown > 0 ||
                    resending
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      countdown > 0
                        ? "#64748b"
                        : "#facc15",
                    cursor:
                      countdown > 0
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "600",
                  }}
                >

                  {resending
                    ? "OTP पाठवत आहे..."
                    : countdown > 0
                    ? `पुन्हा OTP पाठवा (${countdown}s)`
                    : "पुन्हा OTP पाठवा"}

                </button>

              </div>

              <div
                style={{
                  textAlign: "center",
                  marginTop: "10px",
                }}
              >

                <button
                  type="button"
                  onClick={
                    handleChangeMobile
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >

                  ← मोबाईल नंबर बदला

                </button>

              </div>

            </form>

          )

        )}

        {/* =================================================
           FOOTER
        ================================================= */}

        {!adminMode && !otpSent && (

          <div className="auth-footer">

            तुमचे खाते नाही का?{" "}

            <span
              onClick={
                onSwitchToSignup
              }
              className="auth-link"
            >
              खाते तयार करा
            </span>

          </div>

        )}

      </div>

    </div>
  );
}