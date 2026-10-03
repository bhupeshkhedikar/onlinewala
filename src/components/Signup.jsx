import { useState, useEffect } from "react";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";

import { auth, db } from "./firebase";

import {
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  collection,
  where,
  serverTimestamp,
} from "firebase/firestore";

import "./Login.css";


export default function Signup({
  onLoginSuccess,
  onSwitchToLogin,
}) {
  // =========================================================
  // STATES
  // =========================================================

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralFromURL, setReferralFromURL] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);


  // =========================================================
  // AUTO-FILL REFERRAL CODE FROM URL
  // Example: /signup?ref=OWCD8UQZ
  // =========================================================

  useEffect(() => {
    try {
      const params = new URLSearchParams(
        window.location.search
      );

      const refCode = params
        .get("ref")
        ?.trim()
        .toUpperCase();

      if (refCode) {
        setReferralCode(refCode);
        setReferralFromURL(true);
      } else {
        setReferralFromURL(false);
      }
    } catch (error) {
      console.error(
        "Referral URL error:",
        error
      );
    }
  }, []);


  // =========================================================
  // COUNTDOWN
  // =========================================================

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [countdown]);


  // =========================================================
  // CLEANUP RECAPTCHA
  // =========================================================

  useEffect(() => {
    return () => {
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      } catch (error) {
        console.log("Recaptcha cleanup error:", error);
      }
    };
  }, []);


  // =========================================================
  // GENERATE REFERRAL CODE
  // Example: OW8K4P2X
  // =========================================================

  const generateReferralCode = () => {
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "OW";

    for (let i = 0; i < 6; i++) {
      code +=
        characters[
          Math.floor(
            Math.random() * characters.length
          )
        ];
    }

    return code;
  };


  // =========================================================
  // GENERATE RANDOM REWARD
  // ₹10 - ₹100
  // =========================================================

  const generateReward = () => {
    return (
      Math.floor(
        Math.random() * 10
      ) * 10 + 10
    );
  };


  // =========================================================
  // FIND REFERRER
  // =========================================================

  const findReferrer = async (code) => {
    if (!code) {
      return null;
    }

    const normalizedCode = code
      .trim()
      .toUpperCase();

    const referralQuery = query(
      collection(db, "users"),
      where(
        "referralCode",
        "==",
        normalizedCode
      )
    );

    const snapshot = await getDocs(
      referralQuery
    );

    if (snapshot.empty) {
      return null;
    }

    const referrerDoc = snapshot.docs[0];

    return {
      id: referrerDoc.id,
      data: referrerDoc.data(),
    };
  };


  // =========================================================
  // CHECK MOBILE ALREADY EXISTS
  // =========================================================

  const checkMobileExists = async (cleanMobile) => {
    const mobileQuery = query(
      collection(db, "users"),
      where(
        "mobile",
        "==",
        cleanMobile
      )
    );

    const snapshot = await getDocs(
      mobileQuery
    );

    return !snapshot.empty;
  };


  // =========================================================
  // CHECK EMAIL ALREADY EXISTS
  // =========================================================

  const checkEmailExists = async (cleanEmail) => {
    const emailQuery = query(
      collection(db, "users"),
      where(
        "email",
        "==",
        cleanEmail
      )
    );

    const snapshot = await getDocs(
      emailQuery
    );

    return !snapshot.empty;
  };


  // =========================================================
  // SETUP RECAPTCHA
  // =========================================================

  const setupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        return window.recaptchaVerifier;
      }

      window.recaptchaVerifier =
        new RecaptchaVerifier(
          auth,
          "signup-recaptcha-container",
          {
            size: "invisible",

            callback: () => {
              console.log(
                "Signup reCAPTCHA verified"
              );
            },

            "expired-callback": () => {
              console.log(
                "Signup reCAPTCHA expired"
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


  // =========================================================
  // SEND OTP
  // =========================================================

  const handleSendOTP = async () => {
    setError("");

    const cleanName = name.trim();

    const cleanMobile = mobile
      .replace(/\D/g, "")
      .trim();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    const cleanReferralCode = referralCode
      .trim()
      .toUpperCase();


    // =======================================================
    // BASIC VALIDATION
    // =======================================================

    if (cleanName.length < 2) {
      setError(
        "कृपया योग्य नाव टाका."
      );
      return;
    }

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

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      setError(
        "कृपया योग्य Email ID टाका."
      );
      return;
    }


    try {
      setLoading(true);


      // =====================================================
      // CHECK MOBILE
      // =====================================================

      const mobileExists =
        await checkMobileExists(
          cleanMobile
        );

      if (mobileExists) {
        setError(
          "हा मोबाईल नंबर आधीच नोंदणीकृत आहे. कृपया लॉग इन करा."
        );

        setLoading(false);
        return;
      }


      // =====================================================
      // CHECK EMAIL
      // =====================================================

      const emailExists =
        await checkEmailExists(
          cleanEmail
        );

      if (emailExists) {
        setError(
          "हा Email आधीच नोंदणीकृत आहे. कृपया दुसरा Email वापरा."
        );

        setLoading(false);
        return;
      }


      // =====================================================
      // CHECK REFERRAL CODE
      // =====================================================

      if (cleanReferralCode) {
        const referrer =
          await findReferrer(
            cleanReferralCode
          );

        if (!referrer) {
          setError(
            "Referral code चुकीचा आहे."
          );

          setLoading(false);
          return;
        }
      }


      // =====================================================
      // SETUP RECAPTCHA
      // =====================================================

      const appVerifier =
        setupRecaptcha();


      // =====================================================
      // SEND OTP
      // =====================================================

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
        "Send Signup OTP Error:",
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
          "reCAPTCHA verification मध्ये समस्या आली. कृपया पुन्हा प्रयत्न करा."
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


  // =========================================================
  // VERIFY OTP + CREATE PROFILE
  // =========================================================

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


      // =====================================================
      // CLEAN DATA
      // =====================================================

      const cleanName =
        name.trim();

      const cleanMobile =
        mobile
          .replace(/\D/g, "")
          .trim();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const cleanReferralCode =
        referralCode
          .trim()
          .toUpperCase();


      // =====================================================
      // VERIFY OTP
      // =====================================================

      const result =
        await confirmationResult.confirm(
          cleanOTP
        );

      const user = result.user;

      console.log(
        "Phone verified:",
        user.uid
      );


      // =====================================================
      // DOUBLE CHECK FIRESTORE PROFILE
      // =====================================================

      const existingUserRef =
        doc(
          db,
          "users",
          user.uid
        );

      const existingUser =
        await getDoc(
          existingUserRef
        );


      // =====================================================
      // IF PROFILE ALREADY EXISTS
      // =====================================================

      if (existingUser.exists()) {
        await signOut(auth);

        setError(
          "या मोबाईल नंबरवर खाते आधीच आहे. कृपया लॉग इन करा."
        );

        setOtpSent(false);
        setConfirmationResult(null);

        return;
      }


      // =====================================================
      // CHECK EMAIL AGAIN
      // =====================================================

      const emailExists =
        await checkEmailExists(
          cleanEmail
        );

      if (emailExists) {
        await signOut(auth);

        setError(
          "हा Email आधीच नोंदणीकृत आहे. कृपया दुसरा Email वापरा."
        );

        setOtpSent(false);
        setConfirmationResult(null);

        return;
      }


      // =====================================================
      // FIND REFERRER AGAIN
      // =====================================================

      let referrer = null;

      if (cleanReferralCode) {
        referrer =
          await findReferrer(
            cleanReferralCode
          );

        if (!referrer) {
          await signOut(auth);

          setError(
            "Referral code चुकीचा आहे."
          );

          return;
        }
      }


      // =====================================================
      // GENERATE OWN REFERRAL CODE
      // =====================================================

      const ownReferralCode =
        generateReferralCode();


      // =====================================================
      // CREATE USER PROFILE
      // =====================================================

      await setDoc(
        existingUserRef,
        {
          // Basic information
          name: cleanName,

          mobile: cleanMobile,

          email: cleanEmail,


          // Firebase authentication
          uid: user.uid,

          phoneNumber:
            user.phoneNumber ||
            `+91${cleanMobile}`,


          // User role
          role: "user",


          // Referral
          referralCode:
            ownReferralCode,

          referredBy:
            referrer
              ? referrer.id
              : null,

          referredByCode:
            referrer
              ? cleanReferralCode
              : null,


          // First free spin
          tickets: 1,


          // Wallet
          walletBalance: 0,

          availableBalance: 0,

          pendingReferralAmount: 0,


          // Created date
          createdAt:
            serverTimestamp(),
        }
      );


      // =====================================================
      // CREATE PENDING REFERRAL
      // =====================================================

      if (referrer) {
        const rewardAmount =
          generateReward();


        // ===================================================
        // CREATE REFERRAL DOCUMENT
        // ===================================================

        await setDoc(
          doc(
            collection(
              db,
              "referrals"
            )
          ),
          {
            // Referrer
            referrerId:
              referrer.id,

            referrerName:
              referrer.data.name ||
              "",

            referrerMobile:
              referrer.data.mobile ||
              "",

            referrerEmail:
              referrer.data.email ||
              "",


            // Referred user
            referredUserId:
              user.uid,

            referredUserName:
              cleanName,

            referredUserMobile:
              cleanMobile,

            referredUserEmail:
              cleanEmail,


            // Referral
            referralCode:
              cleanReferralCode,

            rewardAmount:
              rewardAmount,

            status:
              "pending",

            serviceBooked:
              false,

            walletCredited:
              false,

            createdAt:
              serverTimestamp(),
          }
        );


        // ===================================================
        // ADD PENDING AMOUNT TO REFERRER
        // ===================================================

        const referrerRef =
          doc(
            db,
            "users",
            referrer.id
          );

        const currentPending =
          Number(
            referrer.data
              .pendingReferralAmount ||
            0
          );

        const currentWallet =
          Number(
            referrer.data
              .walletBalance ||
            0
          );


        await setDoc(
          referrerRef,
          {
            pendingReferralAmount:
              currentPending +
              rewardAmount,

            walletBalance:
              currentWallet +
              rewardAmount,
          },
          {
            merge: true,
          }
        );
      }


      // =====================================================
      // LOGIN SUCCESS
      // =====================================================

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }

    } catch (err) {
      console.error(
        "Signup OTP Verification Error:",
        err
      );


      // =====================================================
      // INVALID OTP
      // =====================================================

      if (
        err.code ===
        "auth/invalid-verification-code"
      ) {
        setError(
          "OTP चुकीचा आहे. कृपया पुन्हा तपासा."
        );


      // =====================================================
      // EXPIRED OTP
      // =====================================================

      } else if (
        err.code ===
        "auth/code-expired"
      ) {
        setError(
          "OTP ची वेळ संपली आहे. कृपया नवीन OTP मागवा."
        );


      // =====================================================
      // DEFAULT
      // =====================================================

      } else {
        setError(
          err.message ||
          "OTP verify करताना काहीतरी चूक झाली."
        );
      }

    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // RESEND OTP
  // =========================================================

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
      // =====================================================
      // CLEAR OLD RECAPTCHA
      // =====================================================

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {}

        window.recaptchaVerifier = null;
      }


      // =====================================================
      // SETUP NEW RECAPTCHA
      // =====================================================

      const appVerifier =
        setupRecaptcha();


      // =====================================================
      // CLEAN MOBILE
      // =====================================================

      const cleanMobile =
        mobile
          .replace(/\D/g, "")
          .trim();


      // =====================================================
      // SEND NEW OTP
      // =====================================================

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
        "Resend Signup OTP Error:",
        err
      );

      if (
        err.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "खूप प्रयत्न झाले आहेत. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
        );
      } else {
        setError(
          "OTP पुन्हा पाठवता आला नाही. कृपया थोड्या वेळाने प्रयत्न करा."
        );
      }

    } finally {
      setResending(false);
    }
  };


  // =========================================================
  // CHANGE MOBILE
  // =========================================================

  const handleChangeMobile =
    async () => {
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (error) {
        console.log(
          "Signout error:",
          error
        );
      }

      setOtpSent(false);
      setConfirmationResult(null);
      setOtp("");
      setError("");
      setCountdown(0);
    };


  // =========================================================
  // UI
  // =========================================================

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
            ✨
          </div>

          <h2>
            खाते तयार करा
          </h2>

          <p>
            आत्ताच सामील व्हा आणि{" "}

            <strong
              className="text-yellow"
            >
              १ फ्री स्पिन मिळवा!
            </strong>
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


        {!otpSent ? (

          /* =================================================
             STEP 1
             NAME + MOBILE + EMAIL + REFERRAL
          ================================================= */

          <div
            className="auth-form signup-form"
          >


            {/* =================================================
                NAME + MOBILE
            ================================================= */}

            <div
              className="signup-small-fields"
            >


              {/* NAME */}

              <div
                className="auth-input-group signup-small-field"
              >

                <label htmlFor="name">
                  पूर्ण नाव
                </label>

                <input
                  type="text"
                  id="name"
                  placeholder="राहुल पाटील"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  required
                  autoComplete="name"
                />

              </div>


              {/* MOBILE */}

              <div
                className="auth-input-group signup-small-field"
              >

                <label htmlFor="mobile">
                  मोबाईल नंबर
                </label>

                <input
                  type="tel"
                  id="mobile"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(
                      e.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                    )
                  }
                  maxLength="10"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />

              </div>


            </div>


            {/* =================================================
                EMAIL
            ================================================= */}

            <div
              className="auth-input-group"
            >

              <label htmlFor="email">
                Email ID
              </label>

              <input
                type="email"
                id="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                autoComplete="email"
                required
              />

            </div>


            {/* =================================================
                REFERRAL
            ================================================= */}

            <div
              className="auth-input-group signup-referral-field"
            >

              <label
                htmlFor="referralCode"
              >

                Referral Code

                <span
                  style={{
                    color: "#94a3b8",
                    fontSize: "9px",
                    marginLeft: "4px",
                    fontWeight: "400",
                  }}
                >
                  (Optional)
                </span>

              </label>


              <input
                type="text"
                id="referralCode"
                placeholder="OW7K4P2X"
                value={referralCode}
                onChange={(e) =>
                  setReferralCode(
                    e.target.value
                      .toUpperCase()
                  )
                }
                maxLength="10"
                readOnly={referralFromURL}
                style={
                  referralFromURL
                    ? {
                        cursor: "not-allowed",
                        opacity: 0.85,
                      }
                    : undefined
                }
              />


              <small>
                {referralFromURL
                  ? "Referral link मधून code आपोआप भरला आहे."
                  : "Refer केले असल्यास code टाका."}
              </small>

            </div>


            {/* =================================================
                SEND OTP
            ================================================= */}

            <button
              type="button"
              className="auth-btn signup-submit-btn"
              onClick={
                handleSendOTP
              }
              disabled={loading}
            >

              {loading
                ? "OTP पाठवत आहे..."
                : "OTP पाठवा"}

            </button>


            {/* RECAPTCHA */}

            <div
              id="signup-recaptcha-container"
            ></div>


          </div>

        ) : (

          /* =================================================
             STEP 2
             OTP
          ================================================= */

          <form
            onSubmit={
              handleVerifyOTP
            }
            className="auth-form signup-form"
          >


            <div
              className="auth-input-group"
            >

              <label htmlFor="signup-otp">
                OTP
              </label>

              <input
                type="text"
                id="signup-otp"
                placeholder="6 अंकी OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                  )
                }
                maxLength="6"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
              />

            </div>


            {/* OTP INFORMATION */}

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


            {/* VERIFY BUTTON */}

            <button
              type="submit"
              className="auth-btn signup-submit-btn"
              disabled={loading}
            >

              {loading
                ? "प्रोफाईल तयार होत आहे..."
                : "OTP Verify करा आणि खाते तयार करा"}

            </button>


            {/* =================================================
                RESEND
            ================================================= */}

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


            {/* =================================================
                CHANGE NUMBER
            ================================================= */}

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


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="auth-footer">

          आधीपासूनच खाते आहे का?{" "}

          <span
            onClick={
              onSwitchToLogin
            }
            className="auth-link"
          >
            लॉग इन करा
          </span>

        </div>


      </div>

    </div>
  );
}