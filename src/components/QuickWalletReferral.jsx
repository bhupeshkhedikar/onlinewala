
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import "./QuickWalletReferral.css";

export default function QuickWalletReferral({ user }) {
  const navigate = useNavigate();

  const isLoggedIn = !!user;

  const [walletBalance, setWalletBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [walletUserId, setWalletUserId] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setWalletBalance(0);
      setAvailableBalance(0);
      setWalletUserId("");
      setWalletLoading(false);
      return;
    }

    let cancelled = false;

    const unsubscribers = [];

    setWalletLoading(true);

    const currentAuthUser = auth.currentUser;

    const authUid =
      currentAuthUser?.uid ||
      user?.uid ||
      "";

    const authPhone =
      currentAuthUser?.phoneNumber ||
      user?.phoneNumber ||
      user?.mobileNumber ||
      user?.mobile ||
      user?.phone ||
      "";

    console.log("====================================");
    console.log("QuickWalletReferral wallet listener");
    console.log("Auth UID:", authUid);
    console.log("Auth Phone:", authPhone);
    console.log("====================================");

    /*
     * =========================================================
     * COMMON USER DATA HANDLER
     * =========================================================
     */

    const updateWalletFromData = (data, profileId) => {
      if (cancelled || !data) {
        return;
      }

      console.log(
        "QuickWalletReferral user profile:",
        profileId,
        data
      );

      /*
       * -------------------------------------------------------
       * WALLET BALANCE
       * -------------------------------------------------------
       */

      const walletValue = Number(
        data.walletBalance ??
        data.balance ??
        data.wallet ??
        0
      );

      /*
       * -------------------------------------------------------
       * AVAILABLE BALANCE
       *
       * This is the balance that should be shown as:
       * "वॉलेटमधील सध्याची शिल्लक"
       * -------------------------------------------------------
       */

      const availableValue = Number(
        data.availableBalance ??
        walletValue
      );

      const safeWalletBalance =
        Number.isFinite(walletValue)
          ? walletValue
          : 0;

      const safeAvailableBalance =
        Number.isFinite(availableValue)
          ? availableValue
          : safeWalletBalance;

      console.log(
        "Realtime walletBalance:",
        safeWalletBalance
      );

      console.log(
        "Realtime availableBalance:",
        safeAvailableBalance
      );

      setWalletBalance(safeWalletBalance);

      setAvailableBalance(safeAvailableBalance);

      setWalletUserId(profileId);

      setWalletLoading(false);
    };

    /*
     * =========================================================
     * 1. FIRST TRY FIREBASE AUTH UID
     * =========================================================
     */

    if (authUid) {
      const uidRef = doc(
        db,
        "users",
        authUid
      );

      const unsubscribeUid = onSnapshot(
        uidRef,
        (snapshot) => {
          if (cancelled) {
            return;
          }

          if (snapshot.exists()) {
            console.log(
              "Wallet profile found by Auth UID:",
              authUid
            );

            updateWalletFromData(
              snapshot.data(),
              snapshot.id
            );
          } else {
            console.log(
              "No users document found for Auth UID:",
              authUid
            );
          }
        },
        (error) => {
          console.warn(
            "UID wallet snapshot error:",
            error
          );
        }
      );

      unsubscribers.push(
        unsubscribeUid
      );
    }

    /*
     * =========================================================
     * 2. NORMALIZE MOBILE NUMBER
     * =========================================================
     */

    const rawPhone =
      String(authPhone || "").trim();

    const onlyDigits =
      rawPhone.replace(/\D/g, "");

    let tenDigitPhone = "";

    if (onlyDigits.length >= 10) {
      tenDigitPhone =
        onlyDigits.slice(-10);
    }

    /*
     * =========================================================
     * 3. PHONE BASED USER PROFILE
     * =========================================================
     */

    if (tenDigitPhone) {
      const phoneVariants = [
        tenDigitPhone,
        `+91${tenDigitPhone}`,
        `+91 ${tenDigitPhone}`,
      ];

      const phoneFields = [
        "mobile",
        "mobileNumber",
        "phoneNumber",
        "phone",
      ];

      phoneFields.forEach(
        (field) => {
          phoneVariants.forEach(
            (phoneValue) => {
              const phoneQuery =
                query(
                  collection(
                    db,
                    "users"
                  ),
                  where(
                    field,
                    "==",
                    phoneValue
                  )
                );

              const unsubscribePhone =
                onSnapshot(
                  phoneQuery,
                  (snapshot) => {
                    if (cancelled) {
                      return;
                    }

                    if (
                      snapshot.empty
                    ) {
                      return;
                    }

                    /*
                     * Avoid randomly selecting a profile
                     * if duplicate mobile numbers exist.
                     */

                    if (
                      snapshot.size > 1
                    ) {
                      console.warn(
                        "Multiple users found:",
                        field,
                        phoneValue
                      );

                      return;
                    }

                    const profileDoc =
                      snapshot.docs[0];

                    console.log(
                      "Wallet profile found by phone:",
                      field,
                      phoneValue,
                      profileDoc.id
                    );

                    updateWalletFromData(
                      profileDoc.data(),
                      profileDoc.id
                    );
                  },
                  (error) => {
                    console.warn(
                      `Phone snapshot error for ${field}:`,
                      error
                    );
                  }
                );

              unsubscribers.push(
                unsubscribePhone
              );
            }
          );
        }
      );
    }

    /*
     * =========================================================
     * LOADING TIMEOUT
     * =========================================================
     */

    const loadingTimer =
      setTimeout(() => {
        if (!cancelled) {
          setWalletLoading(false);
        }
      }, 5000);

    /*
     * =========================================================
     * CLEANUP
     * =========================================================
     */

    return () => {
      cancelled = true;

      clearTimeout(
        loadingTimer
      );

      unsubscribers.forEach(
        (unsubscribe) => {
          try {
            unsubscribe();
          } catch (error) {
            console.warn(
              "Wallet listener cleanup error:",
              error
            );
          }
        }
      );
    };
  }, [isLoggedIn, user]);

  /*
   * =========================================================
   * LOGIN WARNING
   * =========================================================
   */

  const showLoginWarning = () => {
    alert(
      "कृपया प्रथम साइन इन करा किंवा नवीन खाते तयार करा.\n\nरेफर आणि कमवा व माझे वॉलेट पाहण्यासाठी लॉगिन आवश्यक आहे."
    );
  };

  /*
   * =========================================================
   * REFERRAL
   * =========================================================
   */

  const handleReferral = () => {
    if (!isLoggedIn) {
      showLoginWarning();
      return;
    }

    navigate("/referral");
  };

  /*
   * =========================================================
   * WALLET
   * =========================================================
   */

  const handleWallet = () => {
    if (!isLoggedIn) {
      showLoginWarning();
      return;
    }

    navigate("/wallet");
  };

  /*
   * =========================================================
   * UI
   * =========================================================
   */

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
            प्रत्येक रेफर वर ₹10 ते ₹100 पर्यंतचे रिवॉर्ड मिळवा तसेच
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
            वॉलेटमधील सध्याची शिल्लक
          </small>

        </div>


        {/* =================================================
            AVAILABLE BALANCE
        ================================================= */}

        <div className="quick-wallet-balance">

          <span>
            शिल्लक
          </span>

          <strong>
            ₹
            {isLoggedIn
              ? availableBalance.toLocaleString(
                  "en-IN"
                )
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
