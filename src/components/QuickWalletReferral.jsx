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
      "कृपया प्रथम साइन इन करा किंवा नवीन खाते तयार करा.\n\nरेफर आणि कमवा व माझे वॉलेट पाहण्यासाठी लॉगिन आवश्यक आहे."
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

      {/* =====================================================
          REFER & EARN
      ===================================================== */}

      <button
        type="button"
        className="quick-referral-card"
        onClick={handleReferral}
      >

        <div className="quick-action-icon">
          🎁
        </div>

        <div className="quick-action-content">

          <span>
            ऑनलाइनवाला
          </span>

          <strong>
            रेफर करा आणि ₹100 पर्यंत कमवा
          </strong>

          <small>
            मित्रांना ऑनलाइनवाला वर आमंत्रित करा आणि
            ₹10 ते ₹100 पर्यंतचे रिवॉर्ड मिळवा तसेच
            मोफत स्पिन मिळवा.
          </small>

        </div>

        <div className="quick-action-arrow">
          ›
        </div>

      </button>


      {/* =====================================================
          MY WALLET
      ===================================================== */}

      <button
        type="button"
        className="quick-wallet-card"
        onClick={handleWallet}
      >

        <div className="quick-action-icon">
          💰
        </div>

        <div className="quick-action-content">

          <span>
            माझे वॉलेट
          </span>

          <strong>
            वॉलेट
          </strong>

          <small>
            उपलब्ध शिल्लक
          </small>

        </div>


        <div className="quick-wallet-balance">

          <span>
            शिल्लक
          </span>

          <strong>
            ₹
            {isLoggedIn
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