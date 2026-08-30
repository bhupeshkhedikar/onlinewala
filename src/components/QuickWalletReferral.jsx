import React from "react";
import { useNavigate } from "react-router-dom";
import "./QuickWalletReferral.css";
export default function QuickWalletReferral({ user }) {
  const navigate = useNavigate();

  const isLoggedIn = !!user;

  const walletBalance = Number(
    user?.walletBalance ??
    user?.balance ??
    0
  );

  const showLoginWarning = () => {
    alert(
      "कृपया प्रथम साइन इन करा किंवा नवीन खाते तयार करा.\n\nRefer & Earn आणि My Wallet पाहण्यासाठी लॉगिन आवश्यक आहे."
    );
  };

  const handleReferral = () => {
    if (!isLoggedIn) {
      showLoginWarning();
      return;
    }

    navigate("/referral");
  };

  const handleWallet = () => {
    if (!isLoggedIn) {
      showLoginWarning();
      return;
    }

    navigate("/wallet");
  };

  return (
    <div className="quick-wallet-referral">
      <button
        type="button"
        className="quick-referral-card"
        onClick={handleReferral}
      >
        <div className="quick-action-icon">
          🎁
        </div>

        <div className="quick-action-content">
          <span>ONLINEWALAA</span>
          <strong>Refer & Earn</strong>
          <small>
            मित्रांना OnlineWalaa वर invite करा आणि₹10 ते ₹100 पर्यंत reward मिळवा व फ्री स्पिन
          </small>
        </div>

        <div className="quick-action-arrow">
          ›
        </div>
      </button>

      <button
        type="button"
        className="quick-wallet-card"
        onClick={handleWallet}
      >
        <div className="quick-action-icon">
          💰
        </div>

        <div className="quick-action-content">
          <span>MY WALLET</span>
          <strong>My Wallet</strong>
          <small>
            Available balance
          </small>
        </div>

        <div className="quick-wallet-balance">
          <span>Balance</span>
          <strong>
            ₹{isLoggedIn
              ? walletBalance.toLocaleString("en-IN")
              : "0"}
          </strong>
        </div>

        <div className="quick-action-arrow">
          ›
        </div>
      </button>
    </div>
  );
}