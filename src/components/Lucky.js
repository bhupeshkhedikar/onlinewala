import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase"; 
import { useNavigate } from "react-router-dom"; // 🔥 React Router Import
import "./Lucky.css"; 

export default function Lucky({ user }) {
  const navigate = useNavigate(); // 🔥 Navigation Hook

  const [tickets, setTickets] = useState(0); 
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  
  const [myWinnings, setMyWinnings] = useState([]);
  const [loadingWinnings, setLoadingWinnings] = useState(false);

  const [activeTab, setActiveTab] = useState("spin"); 
  const [winningsFilter, setWinningsFilter] = useState("all");

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.uid) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setTickets(userSnap.data().tickets || 0);
          }
          fetchMyWinnings(user.uid);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
      setLoadingTickets(false);
    };

    fetchUserData();
  }, [user]);

  const fetchMyWinnings = async (uid) => {
    setLoadingWinnings(true);
    try {
      const q = query(collection(db, "winnings"), where("userId", "==", uid));
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

  // 🔥 बक्षिसांची नावे मराठीत
  const prizes = [
    { name: "५ पाने मोफत स्कॅन", type: "high", color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", textCol: "#881337" },
    { name: "५ मोफत B&W प्रिंट्स", type: "mid", color: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", textCol: "#4c1d95" },
    { name: "५ मोफत कलर प्रिंट्स", type: "low", color: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", textCol: "#065f46" },
    { name: "३० मिनिट फ्री WiFi ", type: "mid", color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", textCol: "#78350f" },
    { name: "पुन्हा प्रयत्न करा", type: "none", color: "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)", textCol: "#475569" },
    { name: "कोणत्याही फॉर्मवर १०% सूट", type: "low", color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", textCol: "#1e3a8a" }
  ];

  const handleSpin = async () => {
    // 🔥 If user is not logged in, redirect to login page
    if (!user) {
      navigate("/login"); // अपनी लॉगिन रूट के अनुसार इसे बदलें
      return;
    }

    if (tickets <= 0 || isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setTickets((prev) => prev - 1);

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { tickets: increment(-1) });
    } catch (error) {
      console.error("Error deducting ticket:", error);
      alert("डेटाबेस एरर. कृपया पुन्हा प्रयत्न करा.");
      setTickets((prev) => prev + 1); 
      setIsSpinning(false);
      return;
    }

    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const sliceAngle = 360 / prizes.length;
    const offset = sliceAngle / 2; 
    const targetAngle = 360 - (prizeIndex * sliceAngle + offset);
    const extraSpins = 5 * 360;
    const newRotation = rotation + extraSpins + targetAngle - (rotation % 360);
    
    setRotation(newRotation);

    setTimeout(async () => {
      const wonPrize = prizes[prizeIndex];
      setResult(wonPrize);
      setIsSpinning(false);
      
      if (wonPrize.type !== "none") {
        try {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 5); 

          await addDoc(collection(db, "winnings"), {
            userId: user.uid,
            userName: user.name || "Customer",
            userMobile: user.mobile || "", 
            prizeName: wonPrize.name,
            status: "active",
            wonAt: new Date(),
            expiresAt: expiryDate
          });

          fetchMyWinnings(user.uid);
        } catch (error) {
          console.error("Error saving winning:", error);
        }
      }
    }, 4000); 
  };

  const handleHowToRedeem = () => {
    alert("ℹ️ कसे रिडीम करावे:\n\nकृपया काउंटरवर तुमचा नोंदणीकृत मोबाईल नंबर सांगा किंवा ही स्क्रीन कॅफे स्टाफला दाखवा. स्टाफ त्यांच्या सिस्टममधून हे रिडीम करून तुम्हाला सर्विस देतील!");
  };

  const wheelBackground = `conic-gradient(
    #ff9a9e 0deg 60deg,
    #a18cd1 60deg 120deg,
    #84fab0 120deg 180deg,
    #f6d365 180deg 240deg,
    #cfd9df 240deg 300deg,
    #a8edea 300deg 360deg
  )`;

  const getFilteredWinnings = () => {
    const now = new Date();
    return myWinnings.filter((win) => {
      const diffTime = win.expiresAt - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      const isExpired = win.status === "expired" || (win.status === "active" && diffTime < 0);
      const isRedeemed = win.status === "redeemed";
      const isActive = win.status === "active" && !isExpired;
      const isExpiringSoon = isActive && diffDays <= 2;

      if (winningsFilter === "active") return isActive;
      if (winningsFilter === "expiring_soon") return isExpiringSoon;
      if (winningsFilter === "redeemed") return isRedeemed;
      if (winningsFilter === "expired") return isExpired;
      return true; 
    });
  };

  const filteredWinnings = getFilteredWinnings();

  return (
    <div className="lucky-wrapper">
      <div className="lucky-premium-card">
        
        {/* 🔥 TABS */}
        <div className="lucky-tabs">
          <button 
            className={`l-tab-btn ${activeTab === "spin" ? "active" : ""}`}
            onClick={() => setActiveTab("spin")}
          >
            <span className="icon">🎡</span> स्पिन आणि जिंका
          </button>
          <button 
            className={`l-tab-btn ${activeTab === "winnings" ? "active" : ""}`}
            onClick={() => setActiveTab("winnings")}
          >
            <span className="icon">🏆</span> माझी बक्षिसे
            {myWinnings.length > 0 && <span className="tab-badge">{myWinnings.length}</span>}
          </button>
        </div>

        {/* ----------------- TAB 1: SPIN WHEEL ----------------- */}
        {activeTab === "spin" && (
          <div className="lucky-spin-container fade-in">
            <div className="lucky-header-text">
              <h2>व्हील फिरवा</h2>
              <p>खास प्रिंटिंग आणि स्कॅनिंग ऑफर्स जिंका!</p>
            </div>

            {/* Tickets */}
            <div className="lucky-ticket-bar">
              <div className="ticket-info">
                <span className="t-icon">🎟️</span>
                <span className="t-text">शिल्लक स्पिन्स</span>
              </div>
              <div className="ticket-value">
                {loadingTickets ? "..." : tickets}
              </div>
            </div>

            {/* Wheel */}
            <div className="wheel-main-container">
              <div className="wheel-glow-effect"></div>
              <div className="wheel-pointer"></div>
              
              <div className="wheel-body" style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }}>
                {prizes.map((prize, i) => {
                  const angle = (i * 60 + 30) - 90; 
                  return (
                    <div key={i} className="wheel-slice-text" style={{ transform: `rotate(${angle}deg)` }}>
                      <span style={{color: prize.textCol}}>{prize.name}</span>
                    </div>
                  );
                })}
                <div className="wheel-center-dot">
                  <div className="wheel-center-inner"></div>
                </div>
              </div>
            </div>

            {/* Result Popup */}
            <div className="lucky-result-area">
              {result && (
                <div className={`result-popup ${result.type === 'none' ? 'loss' : 'win'}`}>
                  {result.type === 'none' ? (
                    <>😔 अरेरे! पुढच्या वेळी नक्की प्रयत्न करा.</>
                  ) : (
                    <>🎉 अभिनंदन! तुम्ही <strong>{result.name}</strong> जिंकलात!</>
                  )}
                </div>
              )}
            </div>

            {/* 🔥 Spin Button (Updated) */}
            <button 
              // अगर यूज़र नहीं है तो बटन disabled नहीं रहेगा, ताकि क्लिक करने पर रिडायरेक्ट हो सके
              className={`btn-spin-now ${isSpinning || (user && tickets === 0) || loadingTickets ? 'disabled' : ''}`}
              onClick={handleSpin} 
              disabled={isSpinning || (user && tickets === 0) || loadingTickets}
            >
              <div className="btn-glow"></div>
              <span>{!user ? "स्पिनसाठी लॉग इन करा" : isSpinning ? "फिरत आहे..." : "आता स्पिन करा"}</span>
            </button>
            
            {tickets === 0 && user && !isSpinning && (
              <p className="no-ticket-text">अधिक स्पिन्स मिळवण्यासाठी सर्विस बुक करा!</p>
            )}
          </div>
        )}

        {/* ----------------- TAB 2: MY WINNINGS ----------------- */}
        {activeTab === "winnings" && (
          <div className="lucky-winnings-container fade-in">
            
            <div className="winnings-header">
              <div className="w-texts">
                <h2>तुमचे वॉलेट</h2>
                <p>रिडीम करण्यासाठी काउंटरवर दाखवा</p>
              </div>
              
              {user && myWinnings.length > 0 && (
                <div className="w-filter-wrapper">
                  <select 
                    className="w-filter"
                    value={winningsFilter} 
                    onChange={(e) => setWinningsFilter(e.target.value)}
                  >
                    <option value="all">सर्व बक्षिसे</option>
                    <option value="active">🟢 सक्रिय (Active)</option>
                    <option value="expiring_soon">🟠 लवकरच कालबाह्य</option>
                    <option value="redeemed">🔵 वापरलेले (Used)</option>
                    <option value="expired">🔴 कालबाह्य (Expired)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="winnings-list-area">
              {!user ? (
                <div className="empty-state">
                  <span className="empty-icon">🔒</span>
                  <p>तुमचे वॉलेट पाहण्यासाठी कृपया लॉग इन करा.</p>
                </div>
              ) : myWinnings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🎁</span>
                  <p>तुमचे वॉलेट रिक्त आहे.<br/>बक्षिसे जिंकण्यासाठी व्हील फिरवा!</p>
                </div>
              ) : filteredWinnings.length === 0 ? (
                <div className="empty-state">
                  <p>या फिल्टरसाठी कोणतीही बक्षिसे आढळली नाहीत.</p>
                </div>
              ) : (
                <div className="winnings-list">
                  {filteredWinnings.map((win) => {
                    const now = new Date();
                    const diffTime = win.expiresAt - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                    let isExpired = win.status === "expired" || (win.status === "active" && diffTime < 0);
                    let isRedeemed = win.status === "redeemed";
                    
                    let statusClass = "active";
                    let statusText = `${diffDays} दिवसांत कालबाह्य होईल`;

                    if (isRedeemed) { statusClass = "redeemed"; statusText = "वापरले"; }
                    else if (isExpired) { statusClass = "expired"; statusText = "कालबाह्य झाले"; }
                    else if (diffDays <= 2) { statusClass = "warning"; statusText = `फक्त ${diffDays} दिवस बाकी!`; }

                    return (
                      <div key={win.id} className={`reward-card ${statusClass}`}>
                        <div className="r-icon">🎁</div>
                        <div className="r-details">
                          <h4>{win.prizeName}</h4>
                          <span className={`r-badge ${statusClass}`}>{statusText}</span>
                          <span className="r-date">जिंकल्याची तारीख: {win.wonAt.toLocaleDateString()}</span>
                        </div>
                        
                        {!isRedeemed && !isExpired && (
                          <button className="r-redeem-btn" onClick={handleHowToRedeem}>
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