import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
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
  const [userData, setUserData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
  const [error, setError] = useState("");

  // Listen for Firebase authentication changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // Guest user: show public referral information
        setUserData(null);
        setReferrals([]);
        setError("");
        setLoading(false);
        return;
      }

      await loadReferralData(currentUser);
    });

    return () => unsubscribe();
  }, []);

  /* =========================================================
     FETCH USER + REFERRALS
  ========================================================= */

  const loadReferralData = async (currentUser = auth.currentUser) => {
    if (!currentUser) {
      setUserData(null);
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      let profileData = null;
      let profileId = currentUser.uid;

      // Find user profile using Firebase Auth UID
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        profileData = userSnap.data();
        profileId = userSnap.id;
      }

      // Find profile using mobile number if UID profile not found
      if (!profileData) {
        const rawPhone = String(
          currentUser.phoneNumber || ""
        ).replace(/\D/g, "");

        const cleanMobile =
          rawPhone.length >= 10 ? rawPhone.slice(-10) : "";

        if (cleanMobile) {
          const mobileQuery = query(
            collection(db, "users"),
            where("mobile", "==", cleanMobile)
          );

          const mobileSnapshot = await getDocs(mobileQuery);

          if (!mobileSnapshot.empty) {
            const profileDoc = mobileSnapshot.docs[0];
            profileId = profileDoc.id;
            profileData = profileDoc.data();
          }
        }
      }

      // Find profile using +91 phone number
      if (!profileData) {
        const rawPhone = String(
          currentUser.phoneNumber || ""
        ).replace(/\D/g, "");

        const cleanMobile =
          rawPhone.length >= 10 ? rawPhone.slice(-10) : "";

        if (cleanMobile) {
          const phoneQuery = query(
            collection(db, "users"),
            where("phoneNumber", "==", `+91${cleanMobile}`)
          );

          const phoneSnapshot = await getDocs(phoneQuery);

          if (!phoneSnapshot.empty) {
            const profileDoc = phoneSnapshot.docs[0];
            profileId = profileDoc.id;
            profileData = profileDoc.data();
          }
        }
      }

      if (!profileData) {
        setError("User profile सापडला नाही.");
        setUserData(null);
        setReferrals([]);
        return;
      }

      setUserData({
        ...profileData,
        profileId,
        authUid: currentUser.uid,
      });

      // Fetch referrals using Auth UID and profile ID
      const referralUserIds = [
        currentUser.uid,
        profileId,
      ].filter(
        (id, index, arr) =>
          id && arr.indexOf(id) === index
      );

      let referralList = [];

      for (const referralUserId of referralUserIds) {
        try {
          const referralQuery = query(
            collection(db, "referrals"),
            where("referrerId", "==", referralUserId)
          );

          const referralSnapshot = await getDocs(referralQuery);

          referralSnapshot.docs.forEach((item) => {
            const alreadyAdded = referralList.some(
              (referral) => referral.id === item.id
            );

            if (!alreadyAdded) {
              referralList.push({
                id: item.id,
                ...item.data(),
              });
            }
          });
        } catch (referralError) {
          console.error(
            "Referral query error:",
            referralError
          );
        }
      }

      // Sort newest referrals first
      referralList.sort((a, b) => {
        const dateA =
          a.createdAt?.toDate?.() || new Date(0);

        const dateB =
          b.createdAt?.toDate?.() || new Date(0);

        return dateB.getTime() - dateA.getTime();
      });

      setReferrals(referralList);
    } catch (err) {
      console.error("Referral loading error:", err);
      setError("Referral माहिती load करताना error आला.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     REFERRAL LINK
  ========================================================= */

  const referralCode = userData?.referralCode || "";

  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(
        referralCode
      )}`
    : "";

  /* =========================================================
     LOGIN / SIGNUP
  ========================================================= */

  const goToLogin = () => {
    window.location.href = "/login?redirect=%2Freferral";
  };

  const goToSignup = () => {
    window.location.href = "/signup?redirect=%2Freferral";
  };

  /* =========================================================
     COPY TO CLIPBOARD
  ========================================================= */

  const copyToClipboard = async (text, message) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(message);

      setTimeout(() => {
        setCopyMessage("");
      }, 2500);
    } catch (err) {
      console.error("Copy error:", err);
      setCopyMessage("कॉपी करता आली नाही.");
    }
  };

  /* =========================================================
     SHARE ON WHATSAPP
  ========================================================= */

  const shareOnWhatsApp = () => {
    if (!referralLink) return;

    const message =
      `🎁 OnlineWalaa वर माझ्या referral link ने join करा!\n\n` +
      `1. माझ्या लिंकवरून नवीन account तयार करा.\n` +
      `2. OnlineWalaa वरील कोणतीही उपलब्ध सेवा निवडा.\n` +
      `3. त्या सेवेसाठी आवश्यक अर्ज/फॉर्म भरा.\n` +
      `4. OnlineWalaa टीम referral आणि service details verify करेल.\n` +
      `5. Referral approve झाल्यानंतर मला ₹10 ते ₹100 पर्यंत reward मिळू शकतो.\n\n` +
      `🔗 ${referralLink}`;

    const whatsappURL =
      `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(
      whatsappURL,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =========================================================
     NATIVE SHARE
  ========================================================= */

  const shareReferral = async () => {
    if (!referralLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "OnlineWalaa Refer & Earn",
          text:
            "माझ्या referral link वरून OnlineWalaa वर account तयार करा, उपलब्ध सेवांपैकी कोणतीही सेवा घ्या आणि verification पूर्ण करा!",
          url: referralLink,
        });
      } else {
        await copyToClipboard(
          referralLink,
          "Referral link कॉपी झाली!"
        );
      }
    } catch (err) {
      // User cancelled share
      console.log("Share cancelled");
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return "—";
    }

    return timestamp.toDate().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =========================================================
     REFERRAL STATS
  ========================================================= */

  const totalReferrals = referrals.length;

  const pendingReferrals = referrals.filter(
    (item) => item.status === "pending"
  ).length;

  const confirmedReferrals = referrals.filter(
    (item) => item.status === "confirmed"
  ).length;

  const rejectedReferrals = referrals.filter(
    (item) => item.status === "rejected"
  ).length;

  const pendingEarning = referrals
    .filter((item) => item.status === "pending")
    .reduce(
      (total, item) =>
        total + Number(item.rewardAmount || 0),
      0
    );

  const confirmedEarning = referrals
    .filter((item) => item.status === "confirmed")
    .reduce(
      (total, item) =>
        total + Number(item.rewardAmount || 0),
      0
    );

  const totalEarning = referrals.reduce(
    (total, item) =>
      total + Number(item.rewardAmount || 0),
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
          <p>Referral माहिती load होत आहे...</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
     Only show errors for authenticated users
  ========================================================= */

  if (error && auth.currentUser) {
    return (
      <div className="referral-page">
        <div className="referral-error-box">
          <div className="referral-error-icon">⚠️</div>

          <h3>काहीतरी चूक झाली</h3>
          <p>{error}</p>

          <button
            className="referral-retry-btn"
            onClick={() => loadReferralData(auth.currentUser)}
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

        {/* HERO - Visible to everyone */}
        <section className="referral-hero">
          <div className="referral-hero-content">
            <div className="referral-icon">🎁</div>

            <div>
              <span className="referral-small-title">
                ONLINEWALAA
              </span>

              <h1>मित्रांना रेफर करा आणि रिवॉर्ड मिळवा!</h1>

              <p>
                तुमची referral link मित्रांसोबत शेअर करा.
                मित्राने तुमच्या लिंकवरून OnlineWalaa वर
                account तयार करून उपलब्ध सेवांपैकी कोणतीही
                सेवा घेण्यासाठी अर्ज/फॉर्म भरल्यानंतर,
                OnlineWalaa टीम त्याची पडताळणी करेल.
                Referral approve झाल्यावर तुम्हाला
                <strong> ₹10 ते ₹100 </strong>
                पर्यंत reward मिळू शकतो.
              </p>
            </div>
          </div>
        </section>

        {/* PERSONAL REFERRAL DETAILS - Logged-in users only */}
        {userData ? (
          <>
            {/* WALLET SUMMARY */}
            <section className="referral-wallet-card">
              <div className="wallet-card-left">
                <div className="wallet-icon">💰</div>

                <div>
                  <span>एकूण Referral Earnings</span>
                  <h2>₹{totalEarning}</h2>
                </div>
              </div>

              <div className="wallet-card-right">
                <div>
                  <span>प्रलंबित रिवॉर्ड</span>
                  <strong>₹{pendingEarning}</strong>
                </div>

                <div>
                  <span>मंजूर रिवॉर्ड</span>
                  <strong>₹{confirmedEarning}</strong>
                </div>
              </div>
            </section>

            {/* REFERRAL CODE */}
            <section className="referral-code-card">
              <div className="section-heading">
                <div>
                  <span className="section-label">
                    तुमचा REFERRAL CODE
                  </span>

                  <h2>तुमचा कोड शेअर करा</h2>
                </div>

                <div className="code-gift">🎁</div>
              </div>

              <div className="referral-code-box">
                <span>{referralCode || "कोड उपलब्ध नाही"}</span>

                <button
                  type="button"
                  disabled={!referralCode}
                  onClick={() =>
                    copyToClipboard(
                      referralCode,
                      "Referral code कॉपी झाला!"
                    )
                  }
                >
                  📋 कॉपी करा
                </button>
              </div>

              {copyMessage && (
                <div className="copy-success">
                  ✓ {copyMessage}
                </div>
              )}
            </section>

            {/* REFERRAL LINK */}
            <section className="referral-link-card">
              <div className="section-heading">
                <div>
                  <span className="section-label">
                    तुमची REFERRAL LINK
                  </span>

                  <h2>मित्रांना आमंत्रित करा</h2>
                </div>

                <div className="link-icon">🔗</div>
              </div>

              <div className="referral-link-box">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  placeholder="Referral link उपलब्ध नाही"
                />

                <button
                  type="button"
                  disabled={!referralLink}
                  onClick={() =>
                    copyToClipboard(
                      referralLink,
                      "Referral link कॉपी झाली!"
                    )
                  }
                >
                  कॉपी
                </button>
              </div>

              <div className="referral-share-buttons">
                <button
                  type="button"
                  className="share-whatsapp"
                  disabled={!referralLink}
                  onClick={shareOnWhatsApp}
                >
                  <span>🟢</span>
                  WhatsApp वर शेअर करा
                </button>

                <button
                  type="button"
                  className="share-button"
                  disabled={!referralLink}
                  onClick={shareReferral}
                >
                  <span>📤</span>
                  शेअर करा
                </button>
              </div>
            </section>
          </>
        ) : (
          /* GUEST LOGIN / SIGNUP PROMPT */
          <section className="referral-login-prompt">
            <div className="login-prompt-icon">🔐</div>

            <h2>तुमचा Referral Code तयार करा</h2>

            <p>
              Referral Program मध्ये सहभागी होण्यासाठी आणि
              तुमचा Referral Code व Link तयार करण्यासाठी
              कृपया Login किंवा Sign Up करा.
            </p>

            <div className="login-prompt-buttons">
              <button
                type="button"
                className="referral-login-btn"
                onClick={goToLogin}
              >
                Login करा
              </button>

              <button
                type="button"
                className="referral-signup-btn"
                onClick={goToSignup}
              >
                Sign Up करा
              </button>
            </div>

            <small>
              Account तयार केल्यानंतर तुम्ही तुमचा referral
              link share करून rewards मिळवू शकता.
            </small>
          </section>
        )}

        {/* HOW IT WORKS - Visible to everyone */}
        <section className="how-referral-card">
          <div className="section-heading">
            <div>
              <span className="section-label">
                REFERRAL PROCESS
              </span>

              <h2>रेफरल कसे काम करते?</h2>
            </div>
          </div>

          <div className="referral-steps">
            <div className="referral-step">
              <div className="step-number">1</div>
              <div className="step-icon">🔗</div>

              <h3>Referral Link शेअर करा</h3>

              <p>
                तुमची referral link किंवा code मित्रांसोबत
                WhatsApp किंवा इतर माध्यमातून शेअर करा.
              </p>
            </div>

            <div className="referral-step">
              <div className="step-number">2</div>
              <div className="step-icon">👤</div>

              <h3>Account तयार करा</h3>

              <p>
                तुमचा मित्र तुमच्या referral link वरून
                OnlineWalaa वर नवीन account तयार करेल.
              </p>
            </div>

            <div className="referral-step">
              <div className="step-number">3</div>
              <div className="step-icon">📝</div>

              <h3>कोणतीही सेवा निवडा</h3>

              <p>
                Account तयार केल्यानंतर मित्राने
                OnlineWalaa वर उपलब्ध असलेल्या कोणत्याही
                एका सेवेसाठी अर्ज/फॉर्म भरून सेवा घेणे
                आवश्यक आहे.
              </p>
            </div>

            <div className="referral-step">
              <div className="step-number">4</div>
              <div className="step-icon">🔍</div>

              <h3>OnlineWalaa टीम Verification</h3>

              <p>
                सेवा अर्ज/फॉर्म भरल्यानंतर OnlineWalaa टीम
                referral आणि service details तपासेल.
                पडताळणी पूर्ण झाल्यानंतर referral approve
                किंवा reject केला जाईल.
              </p>
            </div>

            <div className="referral-step">
              <div className="step-number">5</div>
              <div className="step-icon">🎉</div>

              <h3>Reward Confirm होईल</h3>

              <p>
                Referral approve झाल्यानंतरच तुमचा reward
                Confirmed होईल आणि उपलब्ध balance मध्ये
                जोडला जाईल.
              </p>
            </div>
          </div>
        </section>

        {/* STATISTICS - Logged-in users only */}
        {userData && (
          <section className="referral-stats">
            <div className="referral-stat-card">
              <div className="stat-icon blue">👥</div>

              <div>
                <span>एकूण Referrals</span>
                <strong>{totalReferrals}</strong>
              </div>
            </div>

            <div className="referral-stat-card">
              <div className="stat-icon orange">⏳</div>

              <div>
                <span>प्रलंबित</span>
                <strong>{pendingReferrals}</strong>
              </div>
            </div>

            <div className="referral-stat-card">
              <div className="stat-icon green">✓</div>

              <div>
                <span>मंजूर</span>
                <strong>{confirmedReferrals}</strong>
              </div>
            </div>

            <div className="referral-stat-card">
              <div className="stat-icon red">✕</div>

              <div>
                <span>नामंजूर</span>
                <strong>{rejectedReferrals}</strong>
              </div>
            </div>
          </section>
        )}

        {/* REFERRAL HISTORY - Logged-in users only */}
        {userData && (
          <section className="referral-history-card">
            <div className="section-heading">
              <div>
                <span className="section-label">
                  REFERRAL HISTORY
                </span>

                <h2>तुमचे Referrals</h2>
              </div>

              <span className="referral-count">
                {totalReferrals}
              </span>
            </div>

            {referrals.length === 0 ? (
              <div className="empty-referrals">
                <div className="empty-icon">🎁</div>

                <h3>अजून referrals नाहीत</h3>

                <p>
                  तुमची referral link मित्रांसोबत शेअर करा.
                  मित्राने account तयार करून OnlineWalaa वरील
                  कोणतीही सेवा घेतल्यानंतर referral
                  verification साठी पुढे जाईल.
                </p>

                <button
                  type="button"
                  onClick={shareReferral}
                  disabled={!referralLink}
                >
                  📤 Referral Link शेअर करा
                </button>
              </div>
            ) : (
              <div className="referral-list">
                {referrals.map((referral) => (
                  <div
                    className="referral-item"
                    key={referral.id}
                  >
                    <div className="referred-user-icon">
                      👤
                    </div>

                    <div className="referred-user-info">
                      <strong>
                        तुमच्यामार्फत आलेला User
                      </strong>

                      <span>
                        {formatDate(referral.createdAt)}
                      </span>

                      {referral.serviceName && (
                        <small>
                          सेवा: {referral.serviceName}
                        </small>
                      )}

                      {referral.status === "pending" && (
                        <small>
                          Referral आणि सेवा पडताळणी प्रलंबित
                        </small>
                      )}
                    </div>

                    <div className="referral-reward">
                      <strong>
                        +₹{referral.rewardAmount}
                      </strong>

                      {referral.status === "pending" && (
                        <span className="status pending">
                          ⏳ पडताळणी प्रलंबित
                        </span>
                      )}

                      {referral.status === "confirmed" && (
                        <span className="status confirmed">
                          ✓ रिवॉर्ड मंजूर
                        </span>
                      )}

                      {referral.status === "rejected" && (
                        <span className="status rejected">
                          ✕ रेफरल मंजूर नाही
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* IMPORTANT RULES - Visible to everyone */}
        <section className="referral-rules">
          <div className="rules-icon">ℹ️</div>

          <div>
            <h3>रेफरलचे महत्त्वाचे नियम</h3>

            <ul>
              <li>
                Referral link वापरून नवीन user ने
                OnlineWalaa वर account तयार करणे आवश्यक आहे.
              </li>

              <li>
                Account तयार केल्यानंतर referred user ने
                OnlineWalaa वरील उपलब्ध सेवांपैकी
                कोणतीही एक सेवा निवडून अर्ज/फॉर्म भरावा.
              </li>

              <li>
                फक्त account तयार केल्याने किंवा referral
                link वापरल्याने reward approve होत नाही.
              </li>

              <li>
                सेवा अर्ज/फॉर्म भरल्यानंतर OnlineWalaa टीम
                referral आणि service details ची पडताळणी करेल.
              </li>

              <li>
                Verification पूर्ण झाल्यानंतर OnlineWalaa टीम
                referral approve किंवा reject करेल.
              </li>

              <li>
                Verification आणि approval होईपर्यंत reward
                Pending स्थितीत राहील.
              </li>

              <li>
                Referral approve झाल्यानंतरच reward Confirmed
                होईल आणि उपलब्ध balance मध्ये जोडला जाईल.
              </li>

              <li>
                Referral reward ₹10 ते ₹100 दरम्यान असू शकतो.
              </li>

              <li>
                Referral reward फक्त referral करणाऱ्या user ला
                मिळेल. नवीन user ला referral reward मिळणार नाही.
              </li>

              <li>
                चुकीची माहिती, duplicate account किंवा
                संशयास्पद referral आढळल्यास referral
                नामंजूर केला जाऊ शकतो.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}