import "./Header.css";
import Navbar from "./Navbar";

export default function Header({ authUser, onLogout }) {
  return (
    <>
      <header className="header-top">
        {/* 🔥 PREMIUM LOGO SECTION */}
        <div className="logo" onClick={() => window.location.href = "/"}>
          <h2>
            ऑनलाइन<span>वाला</span>
          </h2>
          <p>सर्व ऑनलाइन कामे,एकाच ठिकाणी <center style={{color:'#f59e0b'}}>फास्ट,अचूक,विश्वासार्ह</center></p>
        </div>

        {/* 🔥 RIGHT ACTIONS */}
        <div className="header-right">
          <div className="phone-pill">
            <span className="phone-icon">📞</span> 
            <span className="phone-text">+91 98765 43210</span>
          </div>

          <div className="auth-actions">
            {authUser ? (
              <>
                <button
                  className="cta-btn primary"
                  onClick={() => window.location.href = "/dashboard"}
                >
                  Dashboard ➔
                </button>
                <button
                  className="cta-btn secondary"
                  onClick={onLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                className="cta-btn primary"
                onClick={() => window.location.href = "/login"}
              >
                <span className="user-icon">👤</span> Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Navbar below header */}
      <Navbar />
    </>
  );
}