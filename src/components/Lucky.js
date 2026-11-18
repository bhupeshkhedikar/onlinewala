import React, { useState, useEffect, useRef } from "react";

import {

  doc,

  getDoc,

  onSnapshot,

  collection,

  query,

  where,

  getDocs
} from "firebase/firestore";

import { db } from "./firebase";

import { getFunctions, httpsCallable } from "firebase/functions";

import { useNavigate } from "react-router-dom";

import "./Lucky.css";

export default function Lucky({ user }) {

  const navigate = useNavigate();

  const [tickets, setTickets] = useState(0);

  const [isSpinning, setIsSpinning] = useState(false);

  const [rotation, setRotation] = useState(0);

  const [wheelPreview, setWheelPreview] = useState(false);

  const wheelRef = useRef(null);

  const [result, setResult] = useState(null);

  const [showCelebration, setShowCelebration] = useState(false);

  const [loadingTickets, setLoadingTickets] = useState(true);

  const [myWinnings, setMyWinnings] = useState([]);

  const [loadingWinnings, setLoadingWinnings] = useState(false);

  const [activeTab, setActiveTab] = useState("spin");

  const [winningsFilter, setWinningsFilter] = useState("all");

  /* =========================================================

     FETCH USER DATA

  ========================================================= */

  useEffect(() => {

    let unsubscribeTickets = null;

    let cancelled = false;

    const resolveUserProfile = async () => {

      if (!user?.uid) {

        setTickets(0);

        setLoadingTickets(false);

        return;

      }

      setLoadingTickets(true);

      try {

        const directRef = doc(db, "users", user.uid);

        const directSnap = await getDoc(directRef);

        let profileRef = directRef;

        // Some accounts have a Firestore profile ID different from Auth UID.

        if (!directSnap.exists()) {

          const rawPhone =

            user.phoneNumber ||

            user.mobile ||

            user.mobileNumber ||

            user.phone ||

            "";

          const digits = String(rawPhone).replace(/\D/g, "");

          const tenDigit = digits.length >= 10

            ? digits.slice(-10)

            : digits;

          if (tenDigit.length !== 10) {

            throw new Error("Could not identify this user's profile. Please login again.");

          }

          const phoneValues = [

            tenDigit,

            `+91${tenDigit}`,

            `+91 ${tenDigit}`,

            String(rawPhone).trim()

          ].filter(Boolean);

          const phoneFields = ["mobile", "phoneNumber", "mobileNumber"];

          const matchedDocs = new Map();

          for (const field of phoneFields) {

            for (const value of [...new Set(phoneValues)]) {

              const snap = await getDocs(

                query(collection(db, "users"), where(field, "==", value))

              );

              snap.docs.forEach((item) => matchedDocs.set(item.id, item));

            }

          }

          const numericSnap = await getDocs(

            query(collection(db, "users"), where("mobile", "==", Number(tenDigit)))

          );

          numericSnap.docs.forEach((item) => matchedDocs.set(item.id, item));

          if (matchedDocs.size === 1) {

            profileRef = matchedDocs.values().next().value.ref;

          } else if (matchedDocs.size > 1) {

            throw new Error("Multiple profiles match this mobile number. Please ask admin to check duplicate profiles.");

          } else {

            throw new Error("User profile was not found. Please contact admin.");

          }

        }

        if (cancelled) return;

        // Live listener ensures admin credits show without page reload.

        unsubscribeTickets = onSnapshot(

          profileRef,

          (profileSnap) => {

            const value = profileSnap.exists()

              ? Number(profileSnap.data().tickets ?? 0)

              : 0;

            setTickets(Number.isFinite(value) && value > 0 ? value : 0);

            setLoadingTickets(false);

          },

          (error) => {

            console.error("Ticket listener error:", error);

            setLoadingTickets(false);

          }

        );

        fetchMyWinnings(profileRef.id);

      } catch (error) {

        console.error("Error resolving user ticket profile:", error);

        setTickets(0);

        setLoadingTickets(false);

      }

    };

    resolveUserProfile();

    return () => {

      cancelled = true;

      if (unsubscribeTickets) unsubscribeTickets();

    };

  }, [user]);

  /* =========================================================

     FETCH MY WINNINGS

  ========================================================= */

  const fetchMyWinnings = async (uid) => {

    setLoadingWinnings(true);

    try {

      const q = query(

        collection(db, "winnings"),

        where("userId", "==", uid)

      );

      const querySnapshot = await getDocs(q);

      const winningsData = [];

      querySnapshot.forEach((document) => {

        const data = document.data();

        winningsData.push({

          id: document.id,

          ...data,

          wonAt: data.wonAt?.toDate() || new Date(),

          expiresAt: data.expiresAt?.toDate() || new Date()

        });

      });

      winningsData.sort((a, b) => b.wonAt - a.wonAt);

      setMyWinnings(winningsData);

    } catch (error) {

      console.error("Error fetching winnings:", error);

    } finally {

      setLoadingWinnings(false);

    }

  };

  /* =========================================================

     PRIZES

  ========================================================= */

  const defaultPrizes = [
    { id: "shoes", name: "पोलीस भरती शूज – ₹४९९ फ्री", type: "high", image: "/shoes.png", color: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)", sliceColor: "#2563eb", textCol: "#ffffff", weight: 1, enabled: true },
    { id: "scan", name: "५ पाने मोफत स्कॅन", type: "high", color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", sliceColor: "#ff9a9e", textCol: "#881337", weight: 1, enabled: true },
    { id: "bw-prints", name: "५ मोफत B&W प्रिंट्स", type: "mid", color: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", sliceColor: "#a18cd1", textCol: "#4c1d95", weight: 1, enabled: true },
    { id: "book", name: "पोलीस भरती बुक – ₹४९९ फ्री", type: "high", image: "/policebhartibook.jpg", color: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)", sliceColor: "#7c3aed", textCol: "#ffffff", weight: 1, enabled: true },
    { id: "color-prints", name: "५ मोफत कलर प्रिंट्स", type: "low", color: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", sliceColor: "#84fab0", textCol: "#065f46", weight: 1, enabled: true },
    { id: "wifi", name: "३० मिनिट फ्री WiFi", type: "mid", color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", sliceColor: "#f6d365", textCol: "#78350f", weight: 1, enabled: true },
    { id: "try-again", name: "पुन्हा प्रयत्न करा", type: "none", color: "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)", sliceColor: "#cfd9df", textCol: "#475569", weight: 2, enabled: true },
    { id: "discount", name: "कोणत्याही फॉर्मवर १०% सूट", type: "low", color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", sliceColor: "#a8edea", textCol: "#1e3a8a", weight: 1, enabled: true }
  ];

  const [prizes, setPrizes] = useState(defaultPrizes);

  useEffect(() => {
    const luckyDrawRef = doc(db, "settings", "luckyDraw");
    const unsubscribe = onSnapshot(luckyDrawRef, (snapshot) => {
      const configured = snapshot.exists() ? snapshot.data().prizes : null;
      if (Array.isArray(configured) && configured.length >= 2) {
        const enabledPrizes = configured.filter((item) => item.enabled !== false);
        if (enabledPrizes.length >= 2) setPrizes(enabledPrizes);
      }
    }, (error) => console.error("Lucky draw config listener:", error));
    return () => unsubscribe();
  }, []);

  const sliceAngle = 360 / prizes.length;

  /* =========================================================

     WHEEL BACKGROUND

  ========================================================= */

  const wheelBackground = `conic-gradient(${prizes.map((prize, index) => {
    const from = index * sliceAngle;
    const to = (index + 1) * sliceAngle;
    return `${prize.sliceColor || "#64748b"} ${from}deg ${to}deg`;
  }).join(", ")})`;

  /* =========================================================

     HANDLE SPIN

  ========================================================= */

  const getVisibleWheelAngle = () => {

    const wheel = wheelRef.current;

    if (!wheel) return rotation % 360;

    const transform = window.getComputedStyle(wheel).transform;

    if (!transform || transform === "none") return rotation % 360;

    try {

      const matrix = new DOMMatrixReadOnly(transform);

      const angle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);

      return (angle + 360) % 360;

    } catch (error) {

     const values = transform.match(/matrix\(([^)]+)\)/);

      if (values) {

        const [a, b] = values[1].split(",").map(Number);

        return (Math.atan2(b, a) * (180 / Math.PI) + 360) % 360;

      }

      return rotation % 360;

    }

  };

  const stopPreviewWheel = () => {

    const currentAngle = getVisibleWheelAngle();

    setRotation(currentAngle);

    setWheelPreview(false);

  };

  const handleSpin = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (tickets <= 0 || isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setShowCelebration(false);
    setWheelPreview(true);

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    let spinData;
    try {
      const functions = getFunctions(undefined, "asia-south1");
      const startSpin = httpsCallable(functions, "startLuckyDrawSpin");
      const response = await startSpin({});
      spinData = response.data || {};
      const remaining = Number(spinData.remainingTickets);
      if (Number.isFinite(remaining)) setTickets(remaining);
    } catch (error) {
      console.error("Could not start lucky draw spin:", error);
      alert(error?.message || "स्पिन सुरू करता आला नाही. कृपया पुन्हा प्रयत्न करा.");
      stopPreviewWheel();
      setIsSpinning(false);
      return;
    }

    const winningPrize = spinData.prize;
    const globalSpinNumber = Number(spinData.spinNumber);
    const prizeIndex = prizes.findIndex((item) => item.id === winningPrize?.id);

    if (!winningPrize || prizeIndex < 0 || !Number.isFinite(globalSpinNumber)) {
      console.error("Invalid spin response:", spinData);
      alert("Prize configuration बदलली आहे. कृपया पेज refresh करा.");
      stopPreviewWheel();
      setIsSpinning(false);
      return;
    }

    const currentAngle = getVisibleWheelAngle();
    setRotation(currentAngle);
    setWheelPreview(false);

    const offset = sliceAngle / 2;
    const targetAngle = 360 - (prizeIndex * sliceAngle + offset);
    const extraSpins = 5 * 360;
    const finalRotation =
      currentAngle + extraSpins + targetAngle - (currentAngle % 360);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRotation(finalRotation);

        setTimeout(async () => {
          setResult(winningPrize);
          setIsSpinning(false);

          if (winningPrize.type !== "none") setShowCelebration(true);

          try {
            const functions = getFunctions(undefined, "asia-south1");
            const completeSpin = httpsCallable(functions, "completeLuckyDrawSpin");
            const completed = await completeSpin({ spinId: spinData.spinId });
            const resolvedUserId = completed.data?.userId || user.uid;
            if (winningPrize.type !== "none") {
              await fetchMyWinnings(resolvedUserId);
            }
          } catch (error) {
            console.error("Could not finalize spin record:", error);
          }
        }, 4000);
      });
    });
  };

  /* =========================================================

     CLOSE CELEBRATION

  ========================================================= */

  const closeCelebration = () => {

    setShowCelebration(false);

  };

  /* =========================================================

     VIEW MY WINNINGS

  ========================================================= */

  const viewMyWinnings = () => {

    setShowCelebration(false);

    setActiveTab("winnings");

  };

  /* =========================================================

     HOW TO REDEEM

  ========================================================= */

  const handleHowToRedeem = () => {

    alert(

      "ℹ️ कसे रिडीम करावे:\n\n" +

        "कृपया काउंटरवर तुमचा नोंदणीकृत मोबाईल नंबर सांगा " +

        "किंवा ही स्क्रीन कॅफे स्टाफला दाखवा. " +

        "स्टाफ त्यांच्या सिस्टममधून हे रिडीम करून तुम्हाला सर्विस किंवा बक्षीस देतील!"

    );

  };

  /* =========================================================

     FILTER WINNINGS

  ========================================================= */

  const getFilteredWinnings = () => {

    const now = new Date();

    return myWinnings.filter((win) => {

      const diffTime = win.expiresAt - now;

      const diffDays = Math.ceil(

        diffTime / (1000 * 60 * 60 * 24)

      );

      const isExpired =

        win.status === "expired" ||

        (win.status === "active" && diffTime < 0);

      const isRedeemed = win.status === "redeemed";

      const isActive =

        win.status === "active" && !isExpired;

      const isExpiringSoon =

        isActive && diffDays <= 2;

      if (winningsFilter === "active") {

        return isActive;

      }

      if (winningsFilter === "expiring_soon") {

        return isExpiringSoon;

      }

      if (winningsFilter === "redeemed") {

        return isRedeemed;

      }

      if (winningsFilter === "expired") {

        return isExpired;

      }

      return true;

    });

  };

  const filteredWinnings = getFilteredWinnings();

  /* =========================================================

     JSX

  ========================================================= */

  return (

    <div className="lucky-wrapper">

      <div className="lucky-premium-card">

        {/* ===================================================

            TABS

        =================================================== */}

        <div className="lucky-tabs">

          <button

            className={`l-tab-btn ${

              activeTab === "spin" ? "active" : ""

            }`}

            onClick={() => setActiveTab("spin")}

          >

            <span className="icon">🎡</span>

            स्पिन आणि जिंका

          </button>

          <button

            className={`l-tab-btn ${

              activeTab === "winnings" ? "active" : ""

            }`}

            onClick={() => setActiveTab("winnings")}

          >

            <span className="icon">🏆</span>

            माझी बक्षिसे

            {myWinnings.length > 0 && (

              <span className="tab-badge">

                {myWinnings.length}

              </span>

            )}

          </button>

        </div>

        {/* ===================================================

            SPIN TAB

        =================================================== */}

        {activeTab === "spin" && (

          <div className="lucky-spin-container fade-in">

            {/* HEADER */}

            <div className="lucky-header-text">

              <h2>व्हील फिरवा</h2>

              <p>

                खास प्रिंटिंग, स्कॅनिंग आणि मेगा बक्षिसे जिंका!

              </p>

            </div>

            {/* TICKETS */}

            <div className="lucky-ticket-bar">

              <div className="ticket-info">

                <span className="t-icon">🎟️</span>

                <span className="t-text">

                  शिल्लक स्पिन्स

                </span>

              </div>

              <div className="ticket-value">

                {loadingTickets

                  ? "..."

                  : Math.max(0, tickets)}

              </div>

            </div>

            {/* =================================================

                WHEEL

            ================================================= */}

            <div className="wheel-main-container">

              <div className="wheel-glow-effect"></div>

              <div className="wheel-pointer"></div>

              <div

                ref={wheelRef}

                className={`wheel-body ${wheelPreview ? "wheel-preview-spinning" : ""}`}

                style={{

                  background: wheelBackground,

                  transform: `rotate(${rotation}deg)`,

                  "--wheel-start-angle": `${rotation % 360}deg`

                }}

              >

                {prizes.map((prize, i) => {

                  const angle =

                    i * sliceAngle +

                    sliceAngle / 2 -

                    90;

                  return (

                    <div

                      key={i}

                      className="wheel-slice-text"

                      style={{

                        transform: `rotate(${angle}deg)`

                      }}

                    >

                      <div className="wheel-slice-content">

                        {prize.image && (

                          <img

                            src={prize.image}

                            alt=""

                            className="wheel-prize-img"

                          />

                        )}

                        <span

                          style={{

                            color: prize.textCol

                          }}

                        >

                          {prize.name}

                        </span>

                      </div>

                    </div>

                  );

                })}

                <div className="wheel-center-dot">

                  <div className="wheel-center-inner"></div>

                </div>

              </div>

            </div>

            {/* =================================================

                SMALL RESULT

            ================================================= */}

            <div className="lucky-result-area">

              {result && (

                <div

                  className={`result-popup ${

                    result.type === "none"

                      ? "loss"

                      : "win"

                  }`}

                >

                  {result.type === "none" ? (

                    <>

                      😔 अरेरे! पुढच्या वेळी नक्की प्रयत्न करा.

                    </>

                  ) : (

                    <>

                      🎉 अभिनंदन! तुम्ही{" "}

                      <strong>{result.name}</strong>{" "}

                      जिंकलात!

                    </>

                  )}

                </div>

              )}

            </div>

            {/* =================================================

                CELEBRATION MODAL

            ================================================= */}

            {showCelebration &&

              result &&

              result.type !== "none" && (

              <div

                className="win-celebration-overlay"

                role="dialog"

                aria-modal="true"

                aria-label="Winning celebration"

                onClick={closeCelebration}

              >

                <div

                  className="confetti-layer"

                  aria-hidden="true"

                >

                  {Array.from({ length: 40 }).map(

                    (_, i) => (

                      <span

                        key={i}

                        className="confetti-piece"

                        style={{

                          "--x": `${(i * 29) % 100}%`,

                          "--delay": `${

                            (i % 12) * 0.08

                          }s`,

                          "--drift": `${

                            ((i * 17) % 160) - 80

                          }px`,

                          "--rotate": `${

                            (i * 47) % 360

                          }deg`

                        }}

                      />

                    )

                  )}

                </div>

                <div

                  className="win-celebration-card"

                  onClick={(e) =>

                    e.stopPropagation()

                  }

                >

                  {/* CLOSE */}

                  <button

                    className="celebration-close"

                    onClick={closeCelebration}

                    aria-label="Close"

                  >

                    ×

                  </button>

                  {/* CROWN */}

                  <div className="celebration-crown">

                    👑

                  </div>

                  {/* SPARKLES */}

                  <div className="celebration-sparkles">

                    <span>✨</span>

                    <span>⭐</span>

                    <span>✨</span>

                  </div>

                  {/* TROPHY */}

                  <div className="celebration-trophy">

                    🏆

                  </div>

                  {/* TITLE */}

                  <div className="celebration-small-title">

                    CONGRATULATIONS

                  </div>

                  <h3

                    style={{

                      fontSize: "18px",

                      margin: "15px"

                    }}

                  >

                    तुम्ही जिंकलात! 🎉

                  </h3>

                  <p className="celebration-subtitle">

                    तुमच्यासाठी खास बक्षीस!

                  </p>

                  {/* WINNING PRIZE */}

                  <div className="winning-prize-box">

                    {result.image ? (

                      <img

                        src={result.image}

                        alt={result.name}

                        className="winning-prize-photo"

                      />

                    ) : (

                      <span className="winning-prize-icon">

                        🎁

                      </span>

                    )}

                    <strong>

                      {result.name}

                    </strong>

                  </div>

                  {/* MESSAGE */}

                  <div className="celebration-message">

                    <span>🎊</span>

                    <span>

                      हे बक्षीस तुमच्या वॉलेटमध्ये सेव्ह झाले आहे.

                    </span>

                    <span>🎊</span>

                  </div>

                  {/* VIEW WINNINGS */}

                  <button

                    className="celebration-redeem-btn"

                    onClick={viewMyWinnings}

                  >

                    🏆 माझे बक्षीस पहा

                  </button>

                  {/* CONTINUE */}

                  <button

                    className="celebration-continue-btn"

                    onClick={closeCelebration}

                  >

                    नंतर पाहू

                  </button>

                </div>

              </div>

            )}

            {/* =================================================

                SPIN BUTTON

            ================================================= */}

            <button

              className={`btn-spin-now ${

                isSpinning ||

                (user && tickets <= 0) ||

                loadingTickets

                  ? "disabled"

                  : ""

              }`}

              onClick={handleSpin}

              disabled={

                isSpinning ||

                (user && tickets <= 0) ||

                loadingTickets

              }

            >

              <div className="btn-glow"></div>

              <span>

                {!user

                  ? "स्पिनसाठी लॉग इन करा"

                  : isSpinning

                  ? "फिरत आहे..."

                  : "आता स्पिन करा"}

              </span>

            </button>

            {/* =================================================

                TERMS & CONDITIONS

            ================================================= */}

            <div className="lucky-terms-text">

              नियम आणि शर्तें- पोलीस भरती शूज – ₹४९९ फ्री  आणि

              पोलीस भरती बुक – ₹४९९ फ्री आमच्याकडे फॉर्म

              भरल्यानंतरच मिळतील.

            </div>

            {/* NO TICKET */}

            {tickets <= 0 &&

              user &&

              !isSpinning && (

                <p className="no-ticket-text">

                  अधिक स्पिन्स मिळवण्यासाठी सर्विस बुक करा!

                </p>

              )}

          </div>

        )}

        {/* ===================================================

            MY WINNINGS TAB

        =================================================== */}

        {activeTab === "winnings" && (

          <div className="lucky-winnings-container fade-in">

            {/* HEADER */}

            <div className="winnings-header">

              <div className="w-texts">

                <h2>तुमचे वॉलेट</h2>

                <p>

                  रिडीम करण्यासाठी काउंटरवर दाखवा

                </p>

              </div>

              {user &&

                myWinnings.length > 0 && (

                <div className="w-filter-wrapper">

                  <select

                    className="w-filter"

                    value={winningsFilter}

                    onChange={(e) =>

                      setWinningsFilter(

                        e.target.value

                      )

                    }

                  >

                    <option value="all">

                      सर्व बक्षिसे

                    </option>

                    <option value="active">

                      🟢 सक्रिय (Active)

                    </option>

                    <option value="expiring_soon">

                      🟠 लवकरच कालबाह्य

                    </option>

                    <option value="redeemed">

                      🔵 वापरलेले (Used)

                    </option>

                    <option value="expired">

                      🔴 कालबाह्य (Expired)

                    </option>

                  </select>

                </div>

              )}

            </div>

            {/* WINNINGS LIST */}

            <div className="winnings-list-area">

              {!user ? (

                <div className="empty-state">

                  <span className="empty-icon">

                    🔒

                  </span>

                  <p>

                    तुमचे वॉलेट पाहण्यासाठी कृपया

                    लॉग इन करा.

                  </p>

                </div>

              ) : myWinnings.length === 0 ? (

                <div className="empty-state">

                  <span className="empty-icon">

                    🎁

                  </span>

                  <p>

                    तुमचे वॉलेट रिक्त आहे.

                    <br />

                    बक्षिसे जिंकण्यासाठी व्हील फिरवा!

                  </p>

                </div>

              ) : filteredWinnings.length === 0 ? (

                <div className="empty-state">

                  <p>

                    या फिल्टरसाठी कोणतीही बक्षिसे

                    आढळली नाहीत.

                  </p>

                </div>

              ) : (

                <div className="winnings-list">

                  {filteredWinnings.map((win) => {

                    const now = new Date();

                    const diffTime =

                      win.expiresAt - now;

                    const diffDays =

                      Math.ceil(

                        diffTime /

                          (1000 * 60 * 60 * 24)

                      );

                    const isExpired =

                      win.status === "expired" ||

                      (win.status === "active" &&

                        diffTime < 0);

                    const isRedeemed =

                      win.status === "redeemed";

                    let statusClass = "active";

                    let statusText =

                      `${diffDays} दिवसांत कालबाह्य होईल`;

                    if (isRedeemed) {

                      statusClass = "redeemed";

                      statusText = "वापरले";

                    } else if (isExpired) {

                      statusClass = "expired";

                      statusText = "कालबाह्य झाले";

                    } else if (diffDays <= 2) {

                      statusClass = "warning";

                      statusText =

                        `फक्त ${diffDays} दिवस बाकी!`;

                    }

                    return (

                      <div

                        key={win.id}

                        className={`reward-card ${statusClass}`}

                      >

                        {/* ICON */}

                        <div className="r-icon">

                          {win.prizeImage ? (

                            <img

                              src={win.prizeImage}

                              alt=""

                              className="r-custom-img"

                            />

                          ) : (

                            "🎁"

                          )}

                        </div>

                        {/* DETAILS */}

                        <div className="r-details">

                          <h4>

                            {win.prizeName}

                          </h4>

                          <span

                            className={`r-badge ${statusClass}`}

                          >

                            {statusText}

                          </span>

                          <span className="r-date">

                            जिंकल्याची तारीख:{" "}

                            {win.wonAt.toLocaleDateString()}

                          </span>

                          {/* SPECIAL SPIN NUMBER */}

                          {win.winningSpinNumber && (

                            <span className="r-date">

                              स्पिन क्रमांक:{" "}

                              {win.winningSpinNumber}

                            </span>

                          )}

                        </div>

                        {/* REDEEM BUTTON */}

                        {!isRedeemed &&

                          !isExpired && (

                          <button

                            className="r-redeem-btn"

                            onClick={handleHowToRedeem}

                          >

                            वापरा

                          </button>

                        )}

                      </div>

                    );

                  })}

                </div>

              )}

            </div>

          </div>

        )}

      </div>

    </div>

  );

}