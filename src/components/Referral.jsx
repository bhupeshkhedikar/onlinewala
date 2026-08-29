
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import "./Referral.css";

export default function Referral() {
  /* =========================================================
     STATES
  ========================================================= */

  const [userData, setUserData] = useState(null);

  const [referrals, setReferrals] = useState([]);

  const [loading, setLoading] = useState(true);

  const [copyMessage, setCopyMessage] =
    useState("");

  const [error, setError] = useState("");

  /* =========================================================
     LOAD REFERRAL DATA
  ========================================================= */

  useEffect(() => {
    loadReferralData();
  }, []);

  /* =========================================================
     FETCH USER + REFERRALS
  ========================================================= */

  const loadReferralData = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setError(
          "कृपया आधी लॉगिन करा."
        );

        setLoading(false);

        return;
      }

      /* =====================================================
         GET USER PROFILE
      ===================================================== */

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {
        setError(
          "User profile सापडला नाही."
        );

        setLoading(false);

        return;
      }

      const data =
        userSnap.data();

      setUserData(data);

      /* =====================================================
         GET REFERRALS WHERE CURRENT USER IS REFERRER
      ===================================================== */

      const referralQuery =
        query(
          collection(
            db,
            "referrals"
          ),
          where(
            "referrerId",
            "==",
            currentUser.uid
          )
        );

      const referralSnapshot =
        await getDocs(
          referralQuery
        );

      /* =====================================================
         CONVERT FIRESTORE DATA
      ===================================================== */

      const referralList =
        referralSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      /* =====================================================
         SORT NEWEST FIRST
      ===================================================== */

      referralList.sort(
        (a, b) => {
          const dateA =
            a.createdAt?.toDate?.() ||
            new Date(0);

          const dateB =
            b.createdAt?.toDate?.() ||
            new Date(0);

          return (
            dateB.getTime() -
            dateA.getTime()
          );
        }
      );

      setReferrals(
        referralList
      );
    } catch (err) {
      console.error(
        "Referral loading error:",
        err
      );

      setError(
        "Referral माहिती load करताना error आला."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     REFERRAL LINK
  ========================================================= */

  const referralCode =
    userData?.referralCode || "";

  const referralLink =
    `${window.location.origin}/signup?ref=${referralCode}`;

  /* =========================================================
     COPY TEXT
  ========================================================= */

  const copyToClipboard = async (
    text,
    message
  ) => {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopyMessage(message);

      setTimeout(() => {
        setCopyMessage("");
      }, 2500);
    } catch (err) {
      console.error(
        "Copy error:",
        err
      );

      setCopyMessage(
        "Copy नहीं हो पाया."
      );
    }
  };

  /* =========================================================
     SHARE ON WHATSAPP
  ========================================================= */

  const shareOnWhatsApp = () => {
    const message =
      `🎁 OnlineWalaa वर माझ्या referral link ने join करा!\n\n` +
      `तुम्ही OnlineWalaa च्या services वापरू शकता.\n\n` +
      `🔗 ${referralLink}`;

    const whatsappURL =
      `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      whatsappURL,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =========================================================
     SHARE NATIVE
  ========================================================= */

  const shareReferral = async () => {
    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            "OnlineWalaa Refer & Earn",
          text:
            "OnlineWalaa वर माझ्या referral link ने join करा!",
          url:
            referralLink,
        });
      } else {
        await copyToClipboard(
          referralLink,
          "Referral link copied!"
        );
      }
    } catch (err) {
      /*
       * User cancelled native share.
       * Don't show error.
       */
      console.log(
        "Share cancelled"
      );
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (timestamp) => {
    if (
      !timestamp ||
      !timestamp.toDate
    ) {
      return "—";
    }

    return timestamp
      .toDate()
      .toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
  };

  /* =========================================================
     CALCULATE STATS
  ========================================================= */

  const totalReferrals =
    referrals.length;

  const pendingReferrals =
    referrals.filter(
      (item) =>
        item.status ===
        "pending"
    ).length;

  const confirmedReferrals =
    referrals.filter(
      (item) =>
        item.status ===
        "confirmed"
    ).length;

  const rejectedReferrals =
    referrals.filter(
      (item) =>
        item.status ===
        "rejected"
    ).length;

  /* =========================================================
     PENDING EARNING
  ========================================================= */

  const pendingEarning =
    referrals
      .filter(
        (item) =>
          item.status ===
          "pending"
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.rewardAmount || 0
          ),
        0
      );

  /* =========================================================
     CONFIRMED EARNING
  ========================================================= */

  const confirmedEarning =
    referrals
      .filter(
        (item) =>
          item.status ===
          "confirmed"
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.rewardAmount || 0
          ),
        0
      );

  /* =========================================================
     TOTAL EARNING
  ========================================================= */

  const totalEarning =
    referrals.reduce(
      (total, item) =>
        total +
        Number(
          item.rewardAmount || 0
        ),
      0
    );

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="referral-page">

        <div className="referral-loading">

          <div className="referral-spinner"></div>

          <p>
            Referral माहिती load होत आहे...
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="referral-page">

        <div className="referral-error-box">

          <div className="referral-error-icon">
            ⚠️
          </div>

          <h3>
            काहीतरी चूक झाली
          </h3>

          <p>
            {error}
          </p>

          <button
            className="referral-retry-btn"
            onClick={
              loadReferralData
            }
          >
            पुन्हा प्रयत्न करा
          </button>

        </div>

      </div>
    );
  }

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div className="referral-page">

      <div className="referral-container">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="referral-hero">

          <div className="referral-hero-content">

            <div className="referral-icon">
              🎁
            </div>

            <div>

              <span className="referral-small-title">
                ONLINEWALAA
              </span>

              <h1>
                Refer & Earn
              </h1>

              <p>
                मित्रांना OnlineWalaa वर
                invite करा आणि
                <strong>
                  ₹10 ते ₹100
                </strong>{" "}
                पर्यंत reward मिळवा.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            WALLET SUMMARY
        ================================================= */}

        <section className="referral-wallet-card">

          <div className="wallet-card-left">

            <div className="wallet-icon">
              💰
            </div>

            <div>

              <span>
                Referral Earnings
              </span>

              <h2>
                ₹{totalEarning}
              </h2>

            </div>

          </div>

          <div className="wallet-card-right">

            <div>
              <span>
                Pending
              </span>

              <strong>
                ₹{pendingEarning}
              </strong>
            </div>

            <div>
              <span>
                Confirmed
              </span>

              <strong>
                ₹{confirmedEarning}
              </strong>
            </div>

          </div>

        </section>

        {/* =================================================
            REFERRAL CODE
        ================================================= */}

        <section className="referral-code-card">

          <div className="section-heading">

            <div>

              <span className="section-label">
                YOUR REFERRAL CODE
              </span>

              <h2>
                Share your code
              </h2>

            </div>

            <div className="code-gift">
              🎁
            </div>

          </div>

          <div className="referral-code-box">

            <span>
              {referralCode || "—"}
            </span>

            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  referralCode,
                  "Referral code copied!"
                )
              }
            >
              📋 Copy
            </button>

          </div>

          {/* COPY MESSAGE */}

          {copyMessage && (
            <div className="copy-success">
              ✓ {copyMessage}
            </div>
          )}

        </section>

        {/* =================================================
            REFERRAL LINK
        ================================================= */}

        <section className="referral-link-card">

          <div className="section-heading">

            <div>

              <span className="section-label">
                YOUR REFERRAL LINK
              </span>

              <h2>
                Invite your friends
              </h2>

            </div>

            <div className="link-icon">
              🔗
            </div>

          </div>

          <div className="referral-link-box">

            <input
              type="text"
              value={referralLink}
              readOnly
            />

            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  referralLink,
                  "Referral link copied!"
                )
              }
            >
              Copy
            </button>

          </div>

          {/* SHARE BUTTONS */}

          <div className="referral-share-buttons">

            <button
              type="button"
              className="share-whatsapp"
              onClick={
                shareOnWhatsApp
              }
            >
              <span>
                🟢
              </span>

              WhatsApp
            </button>

            <button
              type="button"
              className="share-button"
              onClick={
                shareReferral
              }
            >
              <span>
                📤
              </span>

              Share
            </button>

          </div>

        </section>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section className="how-referral-card">

          <div className="section-heading">

            <div>

              <span className="section-label">
                HOW IT WORKS
              </span>

              <h2>
                Refer & Earn
              </h2>

            </div>

          </div>

          <div className="referral-steps">

            <div className="referral-step">

              <div className="step-number">
                1
              </div>

              <div className="step-icon">
                🔗
              </div>

              <h3>
                Share
              </h3>

              <p>
                तुमचा referral link
                मित्रांसोबत share करा.
              </p>

            </div>

            <div className="referral-step">

              <div className="step-number">
                2
              </div>

              <div className="step-icon">
                👤
              </div>

              <h3>
                Join
              </h3>

              <p>
                तुमचा मित्र तुमच्या
                code ने signup करेल.
              </p>

            </div>

            <div className="referral-step">

              <div className="step-number">
                3
              </div>

              <div className="step-icon">
                🎲
              </div>

              <h3>
                Reward
              </h3>

              <p>
                तुम्हाला ₹10–₹100
                pending reward मिळेल.
              </p>

            </div>

            <div className="referral-step">

              <div className="step-number">
                4
              </div>

              <div className="step-icon">
                ✅
              </div>

              <h3>
                Confirm
              </h3>

              <p>
                मित्राने service book
                केल्यानंतर admin approve करेल.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="referral-stats">

          <div className="referral-stat-card">

            <div className="stat-icon blue">
              👥
            </div>

            <div>

              <span>
                Total Referrals
              </span>

              <strong>
                {totalReferrals}
              </strong>

            </div>

          </div>

          <div className="referral-stat-card">

            <div className="stat-icon orange">
              ⏳
            </div>

            <div>

              <span>
                Pending
              </span>

              <strong>
                {pendingReferrals}
              </strong>

            </div>

          </div>

          <div className="referral-stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div>

              <span>
                Confirmed
              </span>

              <strong>
                {confirmedReferrals}
              </strong>

            </div>

          </div>

          <div className="referral-stat-card">

            <div className="stat-icon red">
              ✕
            </div>

            <div>

              <span>
                Rejected
              </span>

              <strong>
                {rejectedReferrals}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            REFERRAL HISTORY
        ================================================= */}

        <section className="referral-history-card">

          <div className="section-heading">

            <div>

              <span className="section-label">
                REFERRAL HISTORY
              </span>

              <h2>
                Your Referrals
              </h2>

            </div>

            <span className="referral-count">
              {totalReferrals}
            </span>

          </div>

          {referrals.length === 0 ? (

            <div className="empty-referrals">

              <div className="empty-icon">
                🎁
              </div>

              <h3>
                अजून referrals नाहीत
              </h3>

              <p>
                तुमचा referral link
                share करून सुरुवात करा.
              </p>

              <button
                type="button"
                onClick={
                  shareReferral
                }
              >
                📤 Share Referral Link
              </button>

            </div>

          ) : (

            <div className="referral-list">

              {referrals.map(
                (referral) => (

                  <div
                    className="referral-item"
                    key={
                      referral.id
                    }
                  >

                    {/* USER ICON */}

                    <div className="referred-user-icon">
                      👤
                    </div>

                    {/* USER INFO */}

                    <div className="referred-user-info">

                      <strong>
                        Referred User
                      </strong>

                      <span>
                        {formatDate(
                          referral.createdAt
                        )}
                      </span>

                      {referral.serviceName && (
                        <small>
                          Service:{" "}
                          {
                            referral.serviceName
                          }
                        </small>
                      )}

                    </div>

                    {/* REWARD */}

                    <div className="referral-reward">

                      <strong>
                        +₹
                        {
                          referral.rewardAmount
                        }
                      </strong>

                      {/* STATUS */}

                      {referral.status ===
                        "pending" && (

                        <span className="status pending">
                          ⏳ Pending
                        </span>

                      )}

                      {referral.status ===
                        "confirmed" && (

                        <span className="status confirmed">
                          ✓ Confirmed
                        </span>

                      )}

                      {referral.status ===
                        "rejected" && (

                        <span className="status rejected">
                          ✕ Rejected
                        </span>

                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* =================================================
            IMPORTANT RULES
        ================================================= */}

        <section className="referral-rules">

          <div className="rules-icon">
            ℹ️
          </div>

          <div>

            <h3>
              Referral Rules
            </h3>

            <ul>

              <li>
                Reward फक्त referral
                करणाऱ्या user ला मिळेल.
              </li>

              <li>
                New user ला referral
                reward मिळणार नाही.
              </li>

              <li>
                Reward ₹10 ते ₹100
                दरम्यान random असेल.
              </li>

              <li>
                Reward सुरुवातीला
                pending राहील.
              </li>

              <li>
                Referred user ने OnlineWalaa
                वर service book केल्यानंतर
                admin referral approve करेल.
              </li>

              <li>
                Admin approval नंतरच reward
                available balance मध्ये
                transfer होईल.
              </li>

            </ul>

          </div>

        </section>

      </div>

    </div>
  );
}

