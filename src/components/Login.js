import { useState, useEffect } from "react";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

import { auth, db } from "./firebase";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import "./Login.css";


export default function Login({
  onLoginSuccess,
  onSwitchToSignup,
}) {

  const [mobile, setMobile] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [confirmationResult, setConfirmationResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [countdown, setCountdown] =
    useState(0);


  /*
  =========================================================
  COUNTDOWN
  =========================================================
  */

  useEffect(() => {

    if (countdown <= 0) {
      return;
    }

    const timer =
      setInterval(() => {

        setCountdown(
          (prev) =>
            prev > 0
              ? prev - 1
              : 0
        );

      }, 1000);


    return () => {
      clearInterval(timer);
    };

  }, [countdown]);


  /*
  =========================================================
  CLEANUP RECAPTCHA
  =========================================================
  */

  useEffect(() => {

    return () => {

      try {

        if (
          window.recaptchaVerifier
        ) {

          window.recaptchaVerifier.clear();

          window.recaptchaVerifier =
            null;

        }

      } catch (error) {

        console.log(
          "Recaptcha cleanup error:",
          error
        );

      }

    };

  }, []);


  /*
  =========================================================
  SETUP RECAPTCHA
  =========================================================
  */

  const setupRecaptcha = () => {

    try {

      if (
        window.recaptchaVerifier
      ) {

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

              if (
                window.recaptchaVerifier
              ) {

                try {
                  window.recaptchaVerifier.clear();
                } catch (error) {}

                window.recaptchaVerifier =
                  null;

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


  /*
  =========================================================
  SEND OTP
  =========================================================
  */

  const handleSendOTP = async () => {

    setError("");


    const cleanMobile =
      mobile
        .replace(/\D/g, "")
        .trim();


    if (
      !/^[0-9]{10}$/.test(
        cleanMobile
      )
    ) {

      setError(
        "कृपया 10 अंकी मोबाईल नंबर टाका."
      );

      return;

    }


    try {

      setLoading(true);


      /*
      -------------------------------------------------------
      CHECK WHETHER USER EXISTS IN FIRESTORE
      -------------------------------------------------------
      */

      const usersQuery =
        await import(
          "firebase/firestore"
        );


      const {
        collection,
        query,
        where,
        getDocs,
      } = usersQuery;


      const mobileQuery =
        query(
          collection(
            db,
            "users"
          ),
          where(
            "mobile",
            "==",
            cleanMobile
          )
        );


      const snapshot =
        await getDocs(
          mobileQuery
        );


      if (
        snapshot.empty
      ) {

        setError(
          "या मोबाईल नंबरवर खाते सापडले नाही. कृपया आधी साइन अप करा."
        );

        setLoading(false);

        return;

      }


      /*
      -------------------------------------------------------
      SETUP RECAPTCHA
      -------------------------------------------------------
      */

      const appVerifier =
        setupRecaptcha();


      /*
      -------------------------------------------------------
      SEND OTP
      -------------------------------------------------------
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

      } else {

        setError(
          "OTP पाठवताना काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा."
        );

      }


    } finally {

      setLoading(false);

    }

  };


  /*
  =========================================================
  VERIFY OTP
  =========================================================
  */

  const handleVerifyOTP =
    async (e) => {

      e.preventDefault();

      setError("");


      if (
        !confirmationResult
      ) {

        setError(
          "कृपया आधी OTP मागवा."
        );

        return;

      }


      const cleanOTP =
        otp
          .replace(/\D/g, "")
          .trim();


      if (
        cleanOTP.length !== 6
      ) {

        setError(
          "कृपया 6 अंकी OTP टाका."
        );

        return;

      }


      try {

        setLoading(true);


        /*
        -------------------------------------------------------
        VERIFY OTP
        -------------------------------------------------------
        */

        const result =
          await confirmationResult.confirm(
            cleanOTP
          );


        const user =
          result.user;


        console.log(
          "Login successful:",
          user.uid
        );


        /*
        -------------------------------------------------------
        GET USER PROFILE
        -------------------------------------------------------
        */

        const userRef =
          doc(
            db,
            "users",
            user.uid
          );


        const userSnapshot =
          await getDoc(
            userRef
          );


        if (
          !userSnapshot.exists()
        ) {

          setError(
            "तुमचे प्रोफाईल सापडले नाही. कृपया साइन अप करा."
          );

          return;

        }


        /*
        -------------------------------------------------------
        LOGIN SUCCESS
        -------------------------------------------------------
        */

        if (
          onLoginSuccess
        ) {

          onLoginSuccess(
            user
          );

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

        } else {

          setError(
            "OTP verify करताना काहीतरी चूक झाली."
          );

        }


      } finally {

        setLoading(false);

      }

    };


  /*
  =========================================================
  RESEND OTP
  =========================================================
  */

  const handleResendOTP =
    async () => {

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
        -------------------------------------------------------
        CLEAR OLD RECAPTCHA
        -------------------------------------------------------
        */

        if (
          window.recaptchaVerifier
        ) {

          try {

            window.recaptchaVerifier.clear();

          } catch (error) {}

          window.recaptchaVerifier =
            null;

        }


        const appVerifier =
          setupRecaptcha();


        const cleanMobile =
          mobile
            .replace(/\D/g, "")
            .trim();


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


  /*
  =========================================================
  CHANGE MOBILE
  =========================================================
  */

  const handleChangeMobile =
    () => {

      setOtpSent(false);

      setConfirmationResult(
        null
      );

      setOtp("");

      setError("");

    };


  /*
  =========================================================
  UI
  =========================================================
  */

  return (

    <div className="auth-wrapper">

      <div className="glow-orb orb-1"></div>

      <div className="glow-orb orb-2"></div>


      <div className="auth-card fade-in">


        {/* HEADER */}

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


        {/* ERROR */}

        {error && (

          <div className="auth-error">
            {error}
          </div>

        )}


        {!otpSent ? (

          /* =================================================
             MOBILE NUMBER
          ================================================= */

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
                onChange={(e) =>
                  setMobile(
                    e.target.value
                      .replace(/\D/g, "")
                  )
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
              disabled={
                loading
              }
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

        )}


        {/* FOOTER */}

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


      </div>

    </div>

  );

}