import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import {
  getFunctions,
  httpsCallable
} from "firebase/functions";

import "./Wallet.css";

import AddMoney from "./AddMoney";
import Withdraw from "./Withdraw";


export default function Wallet() {

  const [wallet, setWallet] = useState({
    walletBalance: 0,
    availableBalance: 0,
    pendingReferralAmount: 0
  });


  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const [showAddMoney, setShowAddMoney] =
    useState(false);

  const [showWithdraw, setShowWithdraw] =
    useState(false);


  /* =====================================================
     ONLINEWALAA PAYMENT
  ===================================================== */

  const [showPayment, setShowPayment] =
    useState(false);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [paymentMessage, setPaymentMessage] =
    useState("");

  const [paymentError, setPaymentError] =
    useState("");

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);


  /* =====================================================
     LOAD WALLET
  ===================================================== */

  useEffect(() => {
    loadWallet();
  }, []);


  /* =====================================================
     TIME HELPER
  ===================================================== */

  const getTime = (value) => {

    if (!value) return 0;

    if (
      typeof value.toMillis ===
      "function"
    ) {
      return value.toMillis();
    }

    if (
      typeof value.toDate ===
      "function"
    ) {
      return value.toDate().getTime();
    }

    const time =
      new Date(value).getTime();

    return Number.isNaN(time)
      ? 0
      : time;
  };


  /* =====================================================
     LOAD WALLET
  ===================================================== */

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

        return;
      }


      const userRef =
        doc(
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

        return;
      }


      const userData =
        userSnap.data();


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
          )

      });


      const allTransactions = [];


      /* -----------------------------------------------
         WALLET TRANSACTIONS
      ----------------------------------------------- */

      try {

        const walletQuery =
          query(
            collection(
              db,
              "walletTransactions"
            ),
            where(
              "userId",
              "==",
              currentUser.uid
            )
          );


        const walletSnapshot =
          await getDocs(
            walletQuery
          );


        walletSnapshot.forEach(
          (item) => {

            allTransactions.push({

              id:
                item.id,

              source:
                "wallet",

              ...item.data()

            });

          }
        );

      } catch (err) {

        console.error(
          "walletTransactions error:",
          err
        );

      }


      /* -----------------------------------------------
         WITHDRAWALS
      ----------------------------------------------- */

      try {

        const withdrawalQuery =
          query(
            collection(
              db,
              "withdrawals"
            ),
            where(
              "userId",
              "==",
              currentUser.uid
            )
          );


        const withdrawalSnapshot =
          await getDocs(
            withdrawalQuery
          );


        withdrawalSnapshot.forEach(
          (item) => {

            const data =
              item.data();


            allTransactions.push({

              id:
                `withdrawal_${item.id}`,

              withdrawalId:
                item.id,

              source:
                "withdrawal",

              type:
                "WITHDRAWAL",

              amount:
                Number(
                  data.amount || 0
                ),

              status:
                data.status ||
                "pending",

              description:
                "Withdrawal",

              isCredit:
                false,

              ...data

            });

          }
        );

      } catch (err) {

        console.error(
          "withdrawals error:",
          err
        );

      }


      /* -----------------------------------------------
         SORT
      ----------------------------------------------- */

      allTransactions.sort(
        (a, b) =>
          getTime(
            b.createdAt
          ) -
          getTime(
            a.createdAt
          )
      );


      setTransactions(
        allTransactions
      );

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


  /* =====================================================
     DATE
  ===================================================== */

  const formatDate = (
    timestamp
  ) => {

    if (!timestamp) return "—";

    try {

      const date =
        typeof timestamp.toDate ===
        "function"
          ? timestamp.toDate()
          : new Date(timestamp);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "—";
      }


      return date.toLocaleDateString(
        "mr-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    } catch {

      return "—";

    }

  };


  /* =====================================================
     TIME
  ===================================================== */

  const formatTime = (
    timestamp
  ) => {

    if (!timestamp) return "";

    try {

      const date =
        typeof timestamp.toDate ===
        "function"
          ? timestamp.toDate()
          : new Date(timestamp);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }


      return date.toLocaleTimeString(
        "mr-IN",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    } catch {

      return "";

    }

  };


  /* =====================================================
     WITHDRAWAL CHECK
  ===================================================== */

  const isWithdrawal = (
    transaction
  ) => {

    return (
      transaction.source ===
        "withdrawal" ||

      String(
        transaction.type || ""
      ).toUpperCase() ===
        "WITHDRAWAL"
    );

  };


  /* =====================================================
     CREDIT CHECK
  ===================================================== */

  const isCredit = (
    transaction
  ) => {

    if (
      isWithdrawal(transaction)
    ) {
      return false;
    }


    const type =
      String(
        transaction.type || ""
      ).toUpperCase();


    return (

      transaction.isCredit === true ||

      type === "CREDIT" ||

      type === "REFERRAL" ||

      type ===
        "REFERRAL_REWARD" ||

      type === "RECHARGE" ||

      type === "CASHBACK" ||

      type === "REFUND"

    );

  };


  /* =====================================================
     ICON
  ===================================================== */

  const getIcon = (
    transaction
  ) => {

    if (
      isWithdrawal(transaction)
    ) {
      return "↘";
    }


    return isCredit(transaction)
      ? "↗"
      : "↘";

  };


  /* =====================================================
     TITLE
  ===================================================== */

  const getTitle = (
    transaction
  ) => {

    if (
      isWithdrawal(transaction)
    ) {

      const status =
        String(
          transaction.status || ""
        ).toLowerCase();


      if (
        status === "pending"
      ) {
        return "पैसे काढण्याची विनंती";
      }


      if (
        status === "approved"
      ) {
        return "पैसे काढणे मंजूर";
      }


      if (
        status === "paid"
      ) {
        return "पैसे काढले";
      }


      if (
        status === "rejected"
      ) {
        return "पैसे काढण्याची विनंती नाकारली";
      }


      return "पैसे काढणे";

    }


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
      case "REFERRAL_REWARD":
        return "रेफरल बक्षीस";


      case "RECHARGE":
        return "वॉलेटमध्ये पैसे जमा";


      case "CASHBACK":
        return "कॅशबॅक";


      case "REFUND":
        return "परतावा";


      case "ONLINEWALAA_PAYMENT":
      case "SERVICE_PAYMENT":
      case "PAYMENT":
        return "OnlineWalaa ला पेमेंट";


      case "DEBIT":
        return "वॉलेटमधून पैसे वजा";


      case "CREDIT":
        return "वॉलेटमध्ये पैसे जमा";


      default:
        return "वॉलेट व्यवहार";

    }

  };


  /* =====================================================
     STATUS
  ===================================================== */

  const getStatus = (
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
        text: "प्रलंबित",
        className: "pending"
      };

    }


    if (
      status === "rejected" ||
      status === "failed"
    ) {

      return {
        text: "अयशस्वी",
        className: "failed"
      };

    }


    if (
      status === "approved"
    ) {

      return {
        text: "मंजूर",
        className: "success"
      };

    }


    if (
      status === "paid"
    ) {

      return {
        text: "पूर्ण",
        className: "success"
      };

    }


    return {
      text: "यशस्वी",
      className: "success"
    };

  };


  /* =====================================================
     OPEN PAYMENT
  ===================================================== */

  const openPayment = () => {

    setPaymentAmount("");
    setPaymentError("");
    setPaymentMessage("");
    setPaymentSuccess(false);

    setShowPayment(true);

  };


  /* =====================================================
     CLOSE PAYMENT
  ===================================================== */

  const closePayment = () => {

    if (paymentLoading) {
      return;
    }

    setShowPayment(false);

  };


  /* =====================================================
     PAY ONLINEWALAA
  ===================================================== */

  const handleOnlineWalaaPayment =
    async () => {

      setPaymentError("");
      setPaymentMessage("");


      const amount =
        Number(
          paymentAmount
        );


      if (
        !paymentAmount ||
        !Number.isFinite(amount)
      ) {

        setPaymentError(
          "कृपया पेमेंटची रक्कम भरा."
        );

        return;

      }


      if (
        amount <= 0
      ) {

        setPaymentError(
          "रक्कम ₹1 पेक्षा जास्त असावी."
        );

        return;

      }


      if (
        !Number.isInteger(amount)
      ) {

        setPaymentError(
          "रक्कम पूर्ण अंकात असावी."
        );

        return;

      }


      if (
        amount >
        wallet.availableBalance
      ) {

        setPaymentError(
          `तुमच्या वॉलेटमध्ये फक्त ₹${wallet.availableBalance.toLocaleString(
            "en-IN"
          )} उपलब्ध आहेत.`
        );

        return;

      }


      if (
        amount > 50000
      ) {

        setPaymentError(
          "एका पेमेंटची कमाल मर्यादा ₹50,000 आहे."
        );

        return;

      }


      try {

        setPaymentLoading(true);


        const functions =
          getFunctions(
            undefined,
            "asia-south1"
          );


        const payOnlineWalaa =
          httpsCallable(
            functions,
            "payOnlineWalaaFromWallet"
          );


        const result =
          await payOnlineWalaa({
            amount
          });


        const data =
          result.data;


        if (
          !data?.success
        ) {

          throw new Error(
            "पेमेंट पूर्ण झाले नाही."
          );

        }


        setPaymentSuccess(
          true
        );


        setPaymentMessage(
          `🎉 ₹${amount.toLocaleString(
            "en-IN"
          )} चे पेमेंट OnlineWalaa ला यशस्वी झाले.`
        );


        setPaymentAmount("");


        await loadWallet();


        setTimeout(() => {

          setShowPayment(false);
          setPaymentSuccess(false);
          setPaymentMessage("");

        }, 1800);


      } catch (err) {

        console.error(
          "OnlineWalaa payment error:",
          err
        );


        const message =
          err?.message ||
          err?.details ||
          "पेमेंट करताना काहीतरी चूक झाली.";


        setPaymentError(
          message
        );

      } finally {

        setPaymentLoading(false);

      }

    };


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (

      <div className="wallet-page">

        <div className="wallet-loading">

          <div className="wallet-spinner"></div>

          <p>
            वॉलेट लोड होत आहे...
          </p>

        </div>

      </div>

    );

  }


  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {

    return (

      <div className="wallet-page">

        <div className="wallet-error-box">

          <div className="wallet-error-icon">
            ⚠️
          </div>

          <h3>
            वॉलेट लोड झाले नाही
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


  /* =====================================================
     RETURN
  ===================================================== */

  return (

    <div className="wallet-page">

      <div className="wallet-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="wallet-page-header">

          <div>

            <span className="wallet-label">
              ONLINEWALAA
            </span>

            <h1>
              माझे वॉलेट
            </h1>

            <p>
              तुमचे OnlineWalaa वॉलेट व्यवस्थापित करा.
            </p>

          </div>

          <div className="wallet-header-icon">
            💰
          </div>

        </div>


        {/* =================================================
            MAIN WALLET
        ================================================= */}

        <section className="main-wallet-card">

          <div className="wallet-card-top">

            <div>

              <span>
                वॉलेटमधील एकूण शिल्लक
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
                उपलब्ध शिल्लक
              </span>

              <strong>
                ₹
                {wallet.availableBalance.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                सेवा / पेमेंटसाठी उपलब्ध
              </small>

            </div>


            <div className="balance-divider"></div>


            <div className="balance-info-item pending-balance">

              <span>
                प्रलंबित रेफरल रक्कम
              </span>

              <strong>
                ₹
                {wallet.pendingReferralAmount.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                प्रशासकाच्या मंजुरीची प्रतीक्षा
              </small>

            </div>

          </div>

        </section>


        {/* =================================================
            PENDING REFERRAL
        ================================================= */}

        {wallet.pendingReferralAmount > 0 && (

          <section className="pending-wallet-notice">

            <div className="pending-notice-icon">
              ⏳
            </div>

            <div className="pending-notice-content">

              <h3>
                रेफरल बक्षीस प्रलंबित
              </h3>

              <p>
                ₹
                {wallet.pendingReferralAmount.toLocaleString(
                  "en-IN"
                )}{" "}
                रेफरल रक्कम सध्या उपलब्ध नाही.
              </p>

              <small>
                प्रशासकाच्या मंजुरीनंतर ही रक्कम
                उपलब्ध शिल्लकमध्ये जमा होईल.
              </small>

            </div>

          </section>

        )}


        {/* =================================================
            BREAKDOWN
        ================================================= */}

        <section className="wallet-breakdown">

          <div className="wallet-breakdown-card">

            <div className="breakdown-icon available">
              ✓
            </div>

            <div>

              <span>
                उपलब्ध
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
                प्रलंबित
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
                एकूण
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
            ADD MONEY
        ================================================= */}

        <section className="wallet-action-card">

          <div className="action-icon">
            ➕
          </div>

          <div className="action-content">

            <h3>
              पैसे जमा करा
            </h3>

            <p>
              UPI / कार्ड / नेट बँकिंगद्वारे
              वॉलेटमध्ये पैसे जमा करा.
            </p>

          </div>

          <button
            type="button"
            className="add-money-btn"
            onClick={() =>
              setShowAddMoney(true)
            }
          >
            + पैसे जमा करा
          </button>

        </section>


        {/* =================================================
            ONLINEWALAA PAYMENT
        ================================================= */}

        <section className="wallet-action-card onlinewalaa-payment-card">

          <div className="action-icon onlinewalaa-payment-icon">
            💳
          </div>

          <div className="action-content">

            <h3>
              OnlineWalaa ला पेमेंट करा
            </h3>

            <p>
              तुमच्या उपलब्ध वॉलेट शिल्लक रकमेतून
              OnlineWalaa ला सुरक्षितपणे पेमेंट करा.
            </p>

          </div>

          <button
            type="button"
            className="onlinewalaa-pay-btn"
            onClick={openPayment}
            disabled={
              wallet.availableBalance <= 0
            }
          >
            ₹ पेमेंट करा
          </button>

        </section>


        {/* =================================================
            WITHDRAW
        ================================================= */}

        <section className="wallet-action-card">

          <div className="action-icon">
            💸
          </div>

          <div className="action-content">

            <h3>
              पैसे काढा
            </h3>

            <p>
              उपलब्ध शिल्लक तुमच्या UPI खात्यात
              काढा.
            </p>

          </div>

          <button
            type="button"
            className="withdraw-btn"
            onClick={() =>
              setShowWithdraw(true)
            }
            disabled={
              wallet.availableBalance < 100
            }
          >
            पैसे काढा
          </button>

        </section>


        {/* =================================================
            ADD MONEY MODAL
        ================================================= */}

        {showAddMoney && (

          <AddMoney
            onClose={() =>
              setShowAddMoney(false)
            }

            onSuccess={async () => {

              setShowAddMoney(false);

              await loadWallet();

            }}

          />

        )}


        {/* =================================================
            WITHDRAW MODAL
        ================================================= */}

        {showWithdraw && (

          <Withdraw
            user={auth.currentUser}

            availableBalance={
              wallet.availableBalance
            }

            onClose={() =>
              setShowWithdraw(false)
            }

            onSuccess={async () => {

              setShowWithdraw(false);

              await loadWallet();

            }}

          />

        )}


        {/* =================================================
            ONLINEWALAA PAYMENT MODAL
        ================================================= */}

        {showPayment && (

          <div
            className="wallet-payment-overlay"
            onClick={closePayment}
          >

            <div
              className="wallet-payment-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                type="button"
                className="wallet-payment-close"
                onClick={closePayment}
                disabled={paymentLoading}
              >
                ×
              </button>


              {!paymentSuccess ? (

                <>

                  <div className="wallet-payment-icon">
                    💳
                  </div>


                  <h2>
                    OnlineWalaa ला पेमेंट
                  </h2>


                  <p className="wallet-payment-subtitle">
                    तुमच्या वॉलेटमधून पेमेंट करा
                  </p>


                  <div className="wallet-payment-balance">

                    <span>
                      उपलब्ध शिल्लक
                    </span>

                    <strong>
                      ₹
                      {wallet.availableBalance.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>


                  <label
                    className="wallet-payment-label"
                    htmlFor="onlinewalaa-payment-amount"
                  >
                    पेमेंटची रक्कम
                  </label>


                  <div className="wallet-payment-input-wrapper">

                    <span>
                      ₹
                    </span>

                    <input
                      id="onlinewalaa-payment-amount"
                      type="number"
                      min="1"
                      max="50000"
                      step="1"
                      inputMode="numeric"
                      placeholder="उदा. 100"
                      value={
                        paymentAmount
                      }
                      onChange={(e) =>
                        setPaymentAmount(
                          e.target.value
                        )
                      }
                      disabled={
                        paymentLoading
                      }
                    />

                  </div>


                  {paymentError && (

                    <div className="wallet-payment-error">
                      ⚠️ {paymentError}
                    </div>

                  )}


                  {paymentMessage && (

                    <div className="wallet-payment-message">
                      {paymentMessage}
                    </div>

                  )}


                  <div className="wallet-payment-warning">

                    🔐 हे पेमेंट तुमच्या वॉलेटमधून
                    थेट OnlineWalaa कडे जमा होईल.

                  </div>


                  <button
                    type="button"
                    className="wallet-confirm-pay-btn"
                    onClick={
                      handleOnlineWalaaPayment
                    }
                    disabled={
                      paymentLoading ||
                      !paymentAmount
                    }
                  >

                    {paymentLoading
                      ? "पेमेंट होत आहे..."
                      : "पेमेंट निश्चित करा"}

                  </button>

                </>

              ) : (

                <div className="wallet-payment-success">

                  <div className="payment-success-icon">
                    ✓
                  </div>

                  <h2>
                    पेमेंट यशस्वी!
                  </h2>

                  <p>
                    {paymentMessage}
                  </p>

                </div>

              )}

            </div>

          </div>

        )}


        {/* =================================================
            TRANSACTIONS
        ================================================= */}

        <section className="wallet-transactions">

          <div className="wallet-section-header">

            <div>

              <span>
                व्यवहार इतिहास
              </span>

              <h2>
                अलीकडील व्यवहार
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


          {transactions.length === 0 ? (

            <div className="empty-transactions">

              <div className="empty-transaction-icon">
                💳
              </div>

              <h3>
                अजून कोणताही व्यवहार नाही
              </h3>

              <p>
                तुमच्या वॉलेटमध्ये व्यवहार झाल्यावर
                ते येथे दिसतील.
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
                    getStatus(
                      transaction
                    );


                  return (

                    <div
                      className="transaction-item"
                      key={
                        transaction.id
                      }
                    >

                      <div
                        className={`transaction-icon ${
                          credit
                            ? "credit"
                            : "debit"
                        }`}
                      >
                        {getIcon(
                          transaction
                        )}
                      </div>


                      <div className="transaction-details">

                        <strong>
                          {getTitle(
                            transaction
                          )}
                        </strong>


                        <span>

                          {formatDate(
                            transaction.createdAt
                          )}

                          {formatTime(
                            transaction.createdAt
                          ) && (

                            <>
                              {" • "}

                              {formatTime(
                                transaction.createdAt
                              )}

                            </>

                          )}

                        </span>


                        {transaction.referenceId && (

                          <small>
                            संदर्भ:{" "}
                            {
                              transaction.referenceId
                            }
                          </small>

                        )}


                        {transaction.upiId && (

                          <small>
                            UPI:{" "}
                            {
                              transaction.upiId
                            }
                          </small>

                        )}


                        {transaction.withdrawalId && (

                          <small>
                            विनंती:{" "}
                            {
                              transaction.withdrawalId
                            }
                          </small>

                        )}


                        {transaction.rejectionReason && (

                          <small>
                            कारण:{" "}
                            {
                              transaction.rejectionReason
                            }
                          </small>

                        )}

                      </div>


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
                            : "-"}₹

                          {Number(
                            transaction.amount ||
                            0
                          ).toLocaleString(
                            "en-IN"
                          )}

                        </strong>


                        <span
                          className={`transaction-status ${status.className}`}
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
            WALLET INFORMATION
        ================================================= */}

        <section className="wallet-rules">

          <div className="wallet-rules-icon">
            🔐
          </div>

          <div>

            <h3>
              वॉलेटची माहिती
            </h3>

            <ul>

              <li>
                उपलब्ध शिल्लक सेवा आणि पेमेंटसाठी वापरता येईल.
              </li>

              <li>
                प्रलंबित रेफरल रक्कम सध्या वापरता किंवा काढता येणार नाही.
              </li>

              <li>
                रेफरल बक्षीस प्रशासकाच्या पडताळणीनंतर उपलब्ध होईल.
              </li>

              <li>
                पैसे जमा करणे, रेफरल, कॅशबॅक, परतावा,
                OnlineWalaa पेमेंट आणि पैसे काढणे यांचे व्यवहार
                येथे दिसतील.
              </li>

            </ul>

          </div>

        </section>


      </div>

    </div>

  );

}

