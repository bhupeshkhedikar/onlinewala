import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MobileMenu.css";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V21h13V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </svg>
);

const ResumeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h5" />
  </svg>
);

const BiodataIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="3" />
    <path d="M6 21c.7-4 2.7-6 6-6s5.3 2 6 6" />
    <rect x="3" y="3" width="18" height="18" rx="3" />
  </svg>
);

const AgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ReferralIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
    <path d="M12 21V5" />
    <path d="M4 8h16v4H4z" />
    <path d="M12 5c-1.5-4-6-3-5 0 .6 2 3.5 2 5 2" />
    <path d="M12 5c1.5-4 6-3 5 0-.6 2-3.5 2-5 2" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
    <path d="M4 6V4h14a2 2 0 0 1 2 2" />
    <path d="M16 13h6" />
    <circle cx="16" cy="13" r="1" fill="currentColor" />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 21c.8-4.2 3.1-6.3 7-6.3s6.2 2.1 7 6.3" />
  </svg>
);

export default function MobileMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      name: "मुखपृष्ठ",
      path: "/",
      icon: <HomeIcon />
    },
    {
      name: "रेजूम",
      path: "/resume-builder",
      icon: <ResumeIcon />
    },
    {
      name: "बायोडाटा",
      path: "/biodata-builder",
      icon: <BiodataIcon />
    },
    {
      name: "वय मोजा",
      path: "/age-calculator",
      icon: <AgeIcon />
    },
    {
      name: "Refer & Earn",
      path: "/referral",
      icon: <ReferralIcon />
    },
    {
      name: "वॉलेट",
      path: "/wallet",
      icon: <WalletIcon />
    },
    {
      name: "प्रोफाइल",
      path: "/dashboard",
      icon: <ProfileIcon />
    }
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path;
  };

  return (
    <div className="mobile-top-menu">
      <div className="mobile-menu-scroll">
        {items.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`mobile-top-item ${
              isActive(item.path) ? "active" : ""
            } ${
              item.path === "/wallet"
                ? "wallet-item"
                : ""
            } ${
              item.path === "/referral"
                ? "referral-item"
                : ""
            }`}
            onClick={() => navigate(item.path)}
          >
            <span className="mobile-top-icon">
              {item.icon}
            </span>

            <span className="mobile-top-label">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}