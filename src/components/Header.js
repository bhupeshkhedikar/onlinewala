import "./Header.css";
import MobileMenu from "./MobileMenu";

export default function Header({ authUser, onLogout }) {
  return (
    <header className="site-header">
      <div className="header-top">
        <div
          className="logo" style={{textAlign:'center'}}
          onClick={() => (window.location.href = "/")}
        >
          <h2>
            ऑनलाइन<span>वाला</span>
          </h2>

          <p className="logo-subtitle" style={{textAlign:'center'}}>
            सर्व ऑनलाइन कामे,एकाच ठिकाणी
          </p>

          <span className="logo-tagline" style={{fontSize:'10px',fontWeight:'bold',textAlign:'center'}}>
            फास्ट,अचूक,विश्वासार्ह
          </span>
        </div>

        <div className="header-right">
          <div className="phone-pill">
            <span className="phone-icon">📞</span>
            <span className="phone-text">
              +91 98765 43210
            </span>
          </div>

          <div className="auth-actions">
            {authUser ? (
              <>
                <button
                  className="cta-btn primary"
                  onClick={() =>
                    (window.location.href = "/dashboard")
                  }
                >
                  <span>▣</span>
                  डॅशबोर्ड
                  <b>→</b>
                </button>

                <button
                  className="cta-btn secondary"
                  onClick={onLogout}
                >
                  <span>↪</span>
                  लॉगआउट
                </button>
              </>
            ) : (
              <button
                className="cta-btn primary"
                onClick={() =>
                  (window.location.href = "/login")
                }
              >
                <span>👤</span>
                साइन इन / साइन अप
                <b>→</b>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* <MobileMenu /> */}
    </header>
  );
}