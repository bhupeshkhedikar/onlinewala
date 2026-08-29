
import { useState } from "react";
import { auth, db } from "./firebase";

import {
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDocs,
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

  /* =========================================================
     STATES
  ========================================================= */

  const [name, setName] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [referralCode, setReferralCode] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  /* =========================================================
     RANDOM REFERRAL CODE
     
     Example:
     OW8K4P2X
  ========================================================= */

  const generateReferralCode = () => {

    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "OW";

    for (
      let i = 0;
      i < 6;
      i++
    ) {
      code +=
        characters[
          Math.floor(
            Math.random() *
              characters.length
          )
        ];
    }

    return code;
  };


  /* =========================================================
     RANDOM REWARD
     
     ₹10 - ₹100
  ========================================================= */

  const generateReward = () => {

    return (
      Math.floor(
        Math.random() * 10
      ) * 10 + 10
    );

  };


  /* =========================================================
     FIND REFERRER
  ========================================================= */

  const findReferrer = async (
    code
  ) => {

    if (!code) {
      return null;
    }

    const normalizedCode =
      code
        .trim()
        .toUpperCase();

    const referralQuery =
      query(
        collection(
          db,
          "users"
        ),
        where(
          "referralCode",
          "==",
          normalizedCode
        )
      );

    const snapshot =
      await getDocs(
        referralQuery
      );

    if (
      snapshot.empty
    ) {
      return null;
    }

    const referrerDoc =
      snapshot.docs[0];

    return {
      id:
        referrerDoc.id,

      data:
        referrerDoc.data(),
    };
  };


  /* =========================================================
     HANDLE SIGNUP
  ========================================================= */

  const handleSignup =
    async (e) => {

      e.preventDefault();

      setError("");

      setLoading(true);


      try {

        /* ================================================
           BASIC VALIDATION
        ================================================= */

        const cleanName =
          name.trim();

        const cleanMobile =
          mobile.trim();

        const cleanEmail =
          email.trim()
            .toLowerCase();

        const cleanReferralCode =
          referralCode
            .trim()
            .toUpperCase();


        if (
          cleanName.length < 2
        ) {
          throw new Error(
            "कृपया योग्य नाव टाका."
          );
        }


        if (
          !/^[0-9]{10}$/.test(
            cleanMobile
          )
        ) {
          throw new Error(
            "कृपया 10 अंकी मोबाईल नंबर टाका."
          );
        }


        /* ================================================
           FIND REFERRER BEFORE CREATING ACCOUNT
        ================================================= */

        let referrer = null;

        if (
          cleanReferralCode
        ) {

          referrer =
            await findReferrer(
              cleanReferralCode
            );


          if (!referrer) {
            throw new Error(
              "Referral code चुकीचा आहे."
            );
          }

        }


        /* ================================================
           CREATE FIREBASE AUTH USER
        ================================================= */

        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password
          );

        const user =
          userCredential.user;


        /* ================================================
           GENERATE OWN REFERRAL CODE
        ================================================= */

        const ownReferralCode =
          generateReferralCode();


        /* ================================================
           INITIAL USER PROFILE
           
           IMPORTANT:
           New user gets NO referral reward.
        ================================================= */

        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {

            name:
              cleanName,

            mobile:
              cleanMobile,

            email:
              cleanEmail,

            role:
              "user",

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
                password:password,

            tickets:
              1,

            /* =========================================
               WALLET
            ========================================= */

            walletBalance:
              0,

            availableBalance:
              0,

            pendingReferralAmount:
              0,

            createdAt:
              serverTimestamp(),

          }
        );


        /* ================================================
           CREATE PENDING REFERRAL

           ONLY REFERRER GETS REWARD.

           NEW USER = ₹0
        ================================================= */

        if (referrer) {

          const rewardAmount =
            generateReward();


          await setDoc(
            doc(
              collection(
                db,
                "referrals"
              )
            ),
            {

              /* =======================================
                 REFERRER
              ======================================= */

              referrerId:
                referrer.id,

              referrerName:
                referrer.data.name ||
                "",

              referrerEmail:
                referrer.data.email ||
                "",


              /* =======================================
                 REFERRED USER
              ======================================= */

              referredUserId:
                user.uid,

              referredUserName:
                cleanName,

              referredUserEmail:
                cleanEmail,


              /* =======================================
                 REFERRAL
              ======================================= */

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


          /* ==========================================
             ADD PENDING AMOUNT TO REFERRER

             NOTE:
             This is only a pending amount.

             It CANNOT be used for payment/withdrawal
             until admin approves.
          ========================================== */

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

              /*
               * walletBalance shows total wallet
               * including pending reward.
               */
              walletBalance:
                currentWallet +
                rewardAmount,

            },
            {
              merge: true,
            }
          );

        }


        /* ================================================
           LOGIN SUCCESS
        ================================================= */

        if (
          onLoginSuccess
        ) {
          onLoginSuccess(
            user
          );
        }

      } catch (err) {

        console.error(
          "Signup Error:",
          err
        );


        /* ================================================
           FIREBASE ERRORS
        ================================================= */

        if (
          err.code ===
          "auth/email-already-in-use"
        ) {

          setError(
            "हा ईमेल आधीच नोंदणीकृत आहे. कृपया लॉग इन करा."
          );

        } else if (
          err.code ===
          "auth/weak-password"
        ) {

          setError(
            "पासवर्ड किमान ६ अक्षरांचा असावा."
          );

        } else if (
          err.code ===
          "auth/invalid-email"
        ) {

          setError(
            "कृपया योग्य ईमेल आयडी टाका."
          );

        } else {

          setError(
            err.message ||
              "काहीतरी चूक झाली आहे, कृपया पुन्हा प्रयत्न करा."
          );

        }

      } finally {

        setLoading(false);

      }

    };


  /* =========================================================
     UI
  ========================================================= */

  return (

    <div className="auth-wrapper">

      {/* BACKGROUND */}

      <div className="glow-orb orb-1"></div>

      <div className="glow-orb orb-2"></div>


      <div className="auth-card fade-in">


        {/* HEADER */}

        <div className="auth-header">

          <div className="auth-logo">
            ✨
          </div>

          <h2>
            खाते तयार करा
          </h2>

          <p>
            आत्ताच सामील व्हा आणि{" "}
            <strong className="text-yellow">
              १ फ्री स्पिन मिळवा!
            </strong>
          </p>

        </div>


        {/* ERROR */}

        {error && (

          <div className="auth-error">
            {error}
          </div>

        )}


        {/* FORM */}

        <form
          onSubmit={
            handleSignup
          }
          className="auth-form"
        >


          {/* NAME */}

          <div className="auth-input-group">

            <label htmlFor="name">
              पूर्ण नाव
            </label>

            <input
              type="text"
              id="name"
              placeholder="उदा. राहुल पाटील"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              required
            />

          </div>


          {/* EMAIL */}

          <div className="auth-input-group">

            <label htmlFor="email">
              ईमेल आयडी
            </label>

            <input
              type="email"
              id="email"
              placeholder="rahul@example.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />

          </div>


          {/* MOBILE */}

          <div className="auth-input-group">

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
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              maxLength="10"
              required
            />

          </div>


          {/* PASSWORD */}

          <div className="auth-input-group">

            <label htmlFor="password">
              सुरक्षित पासवर्ड
            </label>

            <div className="password-wrapper">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                minLength="6"
              />

              <span
                className="toggle-password"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword
                  ? "🙈"
                  : "👁️"}
              </span>

            </div>

          </div>


          {/* REFERRAL CODE */}

          <div className="auth-input-group">

            <label htmlFor="referralCode">

              Referral Code

              <span
                style={{
                  color:
                    "#94a3b8",
                  fontSize:
                    "10px",
                  marginLeft:
                    "5px",
                  fontWeight:
                    "400",
                }}
              >
                (Optional)
              </span>

            </label>

            <input
              type="text"
              id="referralCode"
              placeholder="उदा. OW7K4P2X"
              value={
                referralCode
              }
              onChange={(e) =>
                setReferralCode(
                  e.target.value
                    .toUpperCase()
                )
              }
              maxLength="10"
            />

            <small
              style={{
                display:
                  "block",
                marginTop:
                  "5px",
                color:
                  "#64748b",
                fontSize:
                  "10px",
              }}
            >
              अगर किसी मित्र ने refer किया है
              तो उनका referral code डालें।
            </small>

          </div>


          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-btn"
            disabled={
              loading
            }
          >

            {loading
              ? "प्रोफाईल तयार होत आहे..."
              : "साइन अप करा आणि स्पिन मिळवा"}

          </button>

        </form>


        {/* FOOTER */}

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

