
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MobileMenu.css";

/* ================= ICONS ================= */

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V21h13V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);

const PrintDeliveryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M6 9V3h12v6" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v7H6z" />
    <path d="M17 12h.01" />
  </svg>
);

const AadhaarPanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5.8 15.5c.6-1.2 1.4-1.8 2.2-1.8s1.6.6 2.2 1.8" />
    <path d="M13 9h4.5M13 12h4.5M13 15h3" />
  </svg>
);

const ResumeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M14 3v5h5M9 13h6M9 17h5" />
  </svg>
);

const BiodataIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="8" r="3" />
    <path d="M6 21c.7-4 2.7-6 6-6s5.3 2 6 6" />
    <rect x="3" y="3" width="18" height="18" rx="3" />
  </svg>
);

const MobileRechargeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M10 18h4M9 6h6" />
    <path d="m12 9-2 3h2l-1 3 3-4h-2l1-2" />
  </svg>
);

const AgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ReferralIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
    <path d="M12 21V5M4 8h16v4H4z" />
    <path d="M12 5c-1.5-4-6-3-5 0 .6 2 3.5 2 5 2" />
    <path d="M12 5c1.5-4 6-3 5 0-.6 2-3.5 2-5 2" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
    <path d="M4 6V4h14a2 2 0 0 1 2 2M16 13h6" />
    <circle cx="16" cy="13" r="1" fill="currentColor" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 21c.8-4.2 3.1-6.3 7-6.3s6.2 2.1 7 6.3" />
  </svg>
);

/* ================= HAMBURGER ICON ================= */

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="m18 6-12 12M6 6l12 12" />
  </svg>
);

/* ================= MOBILE MENU ================= */

export default function MobileMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const items = [
    {
      name: "मुखपृष्ठ",
      path: "/",
      icon: <HomeIcon />,
    },
    {
      name: "प्रिंट डिलिव्हरी",
      path: "/print",
      icon: <PrintDeliveryIcon />,
      isNew: true,
    },
    {
      name: "मोबाइल रिचार्ज",
      path: "/mobile-recharge",
      icon: <MobileRechargeIcon />,
      isNew: true,
    },
    // {
    //   name: "आधार वरून पॅन कार्ड शोधा",
    //   path: "/aadhaar-to-pan",
    //   icon: <AadhaarPanIcon />,
    //   isNew: true,
    // },
    {
      name: "रेजूम",
      path: "/resume-builder",
      icon: <ResumeIcon />,
      free: true,
    },
    {
      name: "बायोडाटा",
      path: "/biodata-builder",
      icon: <BiodataIcon />,
      free: true,
    },
    {
      name: "वय मोजा",
      path: "/age-calculator",
      icon: <AgeIcon />,
      free: true,
    },
    {
      name: "रेफर",
      path: "/referral",
      icon: <ReferralIcon />,
    },
    {
      name: "वॉलेट",
      path: "/wallet",
      icon: <WalletIcon />,
    },
    {
      name: "प्रोफाइल",
      path: "/dashboard",
      icon: <ProfileIcon />,
    },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path;
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const getItemClass = (item) => {
    return [
      "mobile-top-item",
      isActive(item.path) ? "active" : "",
      item.path === "/wallet" ? "wallet-item" : "",
      item.path === "/referral" ? "referral-item" : "",
      item.path === "/aadhaar-to-pan" ? "aadhaar-pan-item" : "",
      item.path === "/quick-print" ? "print-delivery-item" : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div className="mobile-top-menu">

      {/* ALWAYS VISIBLE HORIZONTAL MENU */}

      <div className="mobile-menu-scroll">
        {items.map((item) => (
          <button
            key={item.path}
            type="button"
            className={getItemClass(item)}
            onClick={() => handleNavigation(item.path)}
          >
            {item.isNew && (
              <span className="free-chip">NEW</span>
            )}

            {item.free && (
              <span className="free-chip">FREE</span>
            )}

            <span className="mobile-top-icon">
              {item.icon}
            </span>

            <span className="mobile-top-label">
              {item.name}
            </span>
          </button>
        ))}
      </div>

      {/* MOBILE HAMBURGER BUTTON */}

      {/* <div className="mobile-hamburger-wrapper">
        <button
          type="button"
          className={`mobile-hamburger-btn ${menuOpen ? "opened" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
          <span>{menuOpen ? "बंद करा" : "सर्व मेनू"}</span>
        </button>
      </div> */}

      {/* EXPANDABLE MENU */}

      {menuOpen && (
        <div className="mobile-hamburger-panel">

          <div className="mobile-hamburger-heading">
            <div>
              <strong>सर्व सेवा</strong>
              <small>ऑनलाइनवाला - तुमच्या सेवेत</small>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mobile-hamburger-grid">
            {items.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`mobile-hamburger-item ${
                  isActive(item.path) ? "active" : ""
                } ${
                  item.path === "/quick-print" ? "print-delivery-item" : ""
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="mobile-hamburger-icon">
                  {item.icon}
                </span>

                <span className="mobile-hamburger-label">
                  {item.name}
                </span>

                {item.isNew && (
                  <small className="hamburger-new-chip">NEW</small>
                )}

                {item.free && (
                  <small className="hamburger-free-chip">FREE</small>
                )}
              </button>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
