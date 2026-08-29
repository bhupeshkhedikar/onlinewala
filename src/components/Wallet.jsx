
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

import "./Wallet.css";

export default function Wallet() {
  /* =========================================================
     STATES
  ========================================================= */

  const [wallet, setWallet] = useState({
    walletBalance: 0,
    availableBalance: 0,
    pendingReferralAmount: 0,
  });

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =========================================================
     LOAD WALLET
  ========================================================= */

  useEffect(() => {
    loadWallet();
  }, []);

  /* =========================================================
     FETCH WALLET DATA
  ========================================================= */

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setError(
          "कृपया आधी लॉगिन करा."
        );

        setLoading(false);

        return;
      }

      /* =====================================================
         GET USER WALLET
      ===================================================== */

      const userRef = doc(
        db,
        "users",
        currentUser.uid
      );

      const userSnap =
        await getDoc(userRef);

      if (!userSnap.exists()) {
        setError(
          "Wallet profile सापडला नाही."
        );

        setLoading(false);

        return;
      }

      const userData =
        userSnap.data();

      /* =====================================================
         WALLET VALUES
      ===================================================== */

      setWallet({
        walletBalance:
          Number(
            userData.walletBalance || 0
          ),

        availableBalance:
          Number(
            userData.availableBalance || 0
          ),

        pendingReferralAmount:
          Number(
            userData.pendingReferralAmount ||
              0
          ),
      });

      /* =====================================================
         GET TRANSACTIONS

         Collection:

         walletTransactions/{transactionId}
      ===================================================== */

      try {
        const transactionQuery =
          query(
            collection(
              db,
              "walletTransactions"
            ),
            where(
              "userId",
              "==",
              currentUser.uid
            ),
            orderBy(
              "createdAt",
              "desc"
            ),
            limit(50)
          );

        const transactionSnapshot =
          await getDocs(
            transactionQuery
          );

        const transactionList =
          transactionSnapshot.docs.map(
            (transaction) => ({
              id: transaction.id,
              ...transaction.data(),
            })
          );

        setTransactions(
          transactionList
        );
      } catch (
        transactionError
      ) {
        /*
         * If Firestore index is not created yet,
         * wallet should still load.
         */

        console.warn(
          "Transaction loading error:",
          transactionError
        );

        setTransactions([]);
      }
    } catch (err) {
      console.error(
        "Wallet loading error:",
        err
      );

      setError(
        "Wallet माहिती load करताना error आला."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (timestamp) => {
    if (
      !timestamp ||
      !timestamp.toDate
    ) {
      return "—";
    }

    return timestamp
      .toDate()
      .toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
  };

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatTime = (timestamp) => {
    if (
      !timestamp ||
      !timestamp.toDate
    ) {
      return "";
    }

    return timestamp
      .toDate()
      .toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
  };

  /* =========================================================
     GET TRANSACTION ICON
  ========================================================= */

  const getTransactionIcon = (
    transaction
  ) => {
    const type =
      String(
        transaction.type || ""
      ).toUpperCase();

    if (
      type === "CREDIT" ||
      type === "REFERRAL" ||
      type === "RECHARGE" ||
      type === "CASHBACK" ||
      type === "REFUND"
    ) {
      return "↗";
    }

    if (
      type === "DEBIT" ||
      type === "PAYMENT" ||
      type === "SERVICE_PAYMENT"
    ) {
      return "↘";
    }

    return "₹";
  };

  /* =========================================================
     GET TRANSACTION TITLE
  ========================================================= */

  const getTransactionTitle = (
    transaction
  ) => {
    if (
      transaction.description
    ) {
      return transaction.description;
    }

    const type =
      String(
        transaction.type || ""
      ).toUpperCase();

    switch (type) {
      case "REFERRAL":
        return "Referral Reward";

      case "RECHARGE":
        return "Wallet Recharge";

      case "CASHBACK":
        return "Cashback";

      case "REFUND":
        return "Refund";

      case "PAYMENT":
      case "SERVICE_PAYMENT":
        return "Service Payment";

      default:
        return "Wallet Transaction";
    }
  };

  /* =========================================================
     CHECK CREDIT / DEBIT
  ========================================================= */

  const isCredit = (
    transaction
  ) => {
    const type =
      String(
        transaction.type || ""
      ).toUpperCase();

    return (
      transaction.isCredit === true ||
      type === "CREDIT" ||
      type === "REFERRAL" ||
      type === "RECHARGE" ||
      type === "CASHBACK" ||
      type === "REFUND"
    );
  };

  /* =========================================================
     GET STATUS
  ========================================================= */

  const getTransactionStatus = (
    transaction
  ) => {
    const status =
      String(
        transaction.status || ""
      ).toLowerCase();

    if (
      status === "pending"
    ) {
      return {
        text: "Pending",
        className: "pending",
      };
    }

    if (
      status === "failed" ||
      status === "rejected"
    ) {
      return {
        text: "Failed",
        className: "failed",
      };
    }

    return {
      text: "Success",
      className: "success",
    };
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="wallet-page">

        <div className="wallet-loading">

          <div className="wallet-spinner"></div>

          <p>
            Wallet load होत आहे...
          </p>

        </div>

      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="wallet-page">

        <div className="wallet-error-box">

          <div className="wallet-error-icon">
            ⚠️
          </div>

          <h3>
            Wallet load झाला नाही
          </h3>

          <p>
            {error}
          </p>

          <button
            onClick={loadWallet}
            className="wallet-retry-btn"
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
    <div className="wallet-page">

      <div className="wallet-container">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="wallet-page-header">

          <div>

            <span className="wallet-label">
              ONLINEWALAA
            </span>

            <h1>
              My Wallet
            </h1>

            <p>
              तुमचा OnlineWalaa balance
              manage करा.
            </p>

          </div>

          <div className="wallet-header-icon">
            💰
          </div>

        </div>


        {/* =================================================
            MAIN BALANCE
        ================================================= */}

        <section className="main-wallet-card">

          <div className="wallet-card-top">

            <div>

              <span>
                Total Wallet Balance
              </span>

              <h2>
                ₹
                {wallet.walletBalance.toLocaleString(
                  "en-IN"
                )}
              </h2>

            </div>

            <div className="wallet-big-icon">
              💰
            </div>

          </div>

          <div className="wallet-balance-info">

            <div className="balance-info-item">

              <span>
                Available Balance
              </span>

              <strong>
                ₹
                {wallet.availableBalance.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                Services / payments के लिए
                available
              </small>

            </div>


            <div className="balance-divider"></div>


            <div className="balance-info-item pending-balance">

              <span>
                Pending Referral
              </span>

              <strong>
                ₹
                {wallet.pendingReferralAmount.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                Admin approval pending
              </small>

            </div>

          </div>

        </section>


        {/* =================================================
            PENDING WARNING
        ================================================= */}

        {wallet.pendingReferralAmount >
          0 && (

          <section className="pending-wallet-notice">

            <div className="pending-notice-icon">
              ⏳
            </div>

            <div className="pending-notice-content">

              <h3>
                Referral Reward Pending
              </h3>

              <p>
                ₹
                {wallet.pendingReferralAmount.toLocaleString(
                  "en-IN"
                )}{" "}
                referral reward आपके wallet
                में दिखाई दे रहा है, लेकिन
                अभी available नहीं है।
              </p>

              <small>
                Referred user के service book
                करने के बाद admin manually
                verify करेगा। Approval के बाद
                यह amount available balance
                में चला जाएगा।
              </small>

            </div>

          </section>
        )}


        {/* =================================================
            BALANCE BREAKDOWN
        ================================================= */}

        <section className="wallet-breakdown">

          <div className="wallet-breakdown-card">

            <div className="breakdown-icon available">
              ✓
            </div>

            <div>

              <span>
                Available
              </span>

              <strong>
                ₹
                {wallet.availableBalance.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>


          <div className="wallet-breakdown-card">

            <div className="breakdown-icon pending">
              ⏳
            </div>

            <div>

              <span>
                Pending
              </span>

              <strong>
                ₹
                {wallet.pendingReferralAmount.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>


          <div className="wallet-breakdown-card">

            <div className="breakdown-icon total">
              ₹
            </div>

            <div>

              <span>
                Total
              </span>

              <strong>
                ₹
                {wallet.walletBalance.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

        </section>


        {/* =================================================
            ADD MONEY / PAYMENT

            Currently disabled placeholder.
            Payment gateway will be connected
            in next component.
        ================================================= */}

        <section className="wallet-action-card">

          <div className="action-icon">
            ➕
          </div>

          <div className="action-content">

            <h3>
              Add Money
            </h3>

            <p>
              UPI / Card / Net Banking से
              wallet में पैसे add करें.
            </p>

          </div>

          <button
            type="button"
            className="add-money-btn"
            onClick={() => {
              alert(
                "Payment Gateway next step में connect किया जाएगा."
              );
            }}
          >
            + Add Money
          </button>

        </section>


        {/* =================================================
            TRANSACTION HISTORY
        ================================================= */}

        <section className="wallet-transactions">

          <div className="wallet-section-header">

            <div>

              <span>
                TRANSACTION HISTORY
              </span>

              <h2>
                Recent Transactions
              </h2>

            </div>

            <button
              type="button"
              onClick={loadWallet}
              className="refresh-wallet-btn"
              title="Refresh"
            >
              ↻
            </button>

          </div>


          {transactions.length ===
          0 ? (

            <div className="empty-transactions">

              <div className="empty-transaction-icon">
                💳
              </div>

              <h3>
                No transactions yet
              </h3>

              <p>
                तुमच्या wallet मध्ये
                transactions झाल्यावर
                त्या इथे दिसतील.
              </p>

            </div>

          ) : (

            <div className="transaction-list">

              {transactions.map(
                (transaction) => {

                  const credit =
                    isCredit(
                      transaction
                    );

                  const status =
                    getTransactionStatus(
                      transaction
                    );

                  return (
                    <div
                      className="transaction-item"
                      key={
                        transaction.id
                      }
                    >

                      {/* ICON */}

                      <div
                        className={
                          `transaction-icon ${
                            credit
                              ? "credit"
                              : "debit"
                          }`
                        }
                      >
                        {getTransactionIcon(
                          transaction
                        )}
                      </div>


                      {/* DETAILS */}

                      <div className="transaction-details">

                        <strong>
                          {getTransactionTitle(
                            transaction
                          )}
                        </strong>

                        <span>
                          {formatDate(
                            transaction.createdAt
                          )}

                          {" • "}

                          {formatTime(
                            transaction.createdAt
                          )}
                        </span>

                        {transaction.referenceId && (
                          <small>
                            ID:{" "}
                            {
                              transaction.referenceId
                            }
                          </small>
                        )}

                      </div>


                      {/* AMOUNT */}

                      <div className="transaction-amount">

                        <strong
                          className={
                            credit
                              ? "credit-text"
                              : "debit-text"
                          }
                        >
                          {credit
                            ? "+"
                            : "-"}
                          ₹
                          {Number(
                            transaction.amount ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                        <span
                          className={
                            `transaction-status ${status.className}`
                          }
                        >
                          {status.text}
                        </span>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>


        {/* =================================================
            WALLET RULES
        ================================================= */}

        <section className="wallet-rules">

          <div className="wallet-rules-icon">
            🔐
          </div>

          <div>

            <h3>
              Wallet Information
            </h3>

            <ul>

              <li>
                Available Balance ही
                services/payment साठी
                वापरता येईल.
              </li>

              <li>
                Pending Referral amount
                सध्या वापरता किंवा withdraw
                करता येणार नाही.
              </li>

              <li>
                Referral reward admin
                verification नंतर available
                होईल.
              </li>

              <li>
                सर्व wallet transactions
                history मध्ये record केले जातील.
              </li>

            </ul>

          </div>

        </section>

      </div>

    </div>
  );
}

