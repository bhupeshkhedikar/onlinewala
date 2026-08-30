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
import "./Wallet.css";
import AddMoney from "./AddMoney";
import Withdraw from "./Withdraw";

export default function Wallet() {
  const [wallet, setWallet] = useState({
    walletBalance: 0,
    availableBalance: 0,
    pendingReferralAmount: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const getTime = (value) => {
    if (!value) return 0;

    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }

    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const loadWallet = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("कृपया आधी लॉगिन करा.");
        return;
      }

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("Wallet profile सापडला नाही.");
        return;
      }

      const userData = userSnap.data();

      setWallet({
        walletBalance: Number(userData.walletBalance || 0),
        availableBalance: Number(userData.availableBalance || 0),
        pendingReferralAmount: Number(
          userData.pendingReferralAmount || 0
        )
      });

      const allTransactions = [];

      try {
        const walletQuery = query(
          collection(db, "walletTransactions"),
          where("userId", "==", currentUser.uid)
        );

        const walletSnapshot = await getDocs(walletQuery);

        walletSnapshot.forEach((item) => {
          allTransactions.push({
            id: item.id,
            source: "wallet",
            ...item.data()
          });
        });
      } catch (err) {
        console.error(
          "walletTransactions error:",
          err
        );
      }

      try {
        const withdrawalQuery = query(
          collection(db, "withdrawals"),
          where("userId", "==", currentUser.uid)
        );

        const withdrawalSnapshot =
          await getDocs(withdrawalQuery);

        withdrawalSnapshot.forEach((item) => {
          const data = item.data();

          allTransactions.push({
            id: `withdrawal_${item.id}`,
            withdrawalId: item.id,
            source: "withdrawal",
            type: "WITHDRAWAL",
            amount: Number(data.amount || 0),
            status: data.status || "pending",
            description: "Withdrawal",
            isCredit: false,
            ...data
          });
        });
      } catch (err) {
        console.error(
          "withdrawals error:",
          err
        );
      }

      allTransactions.sort(
        (a, b) =>
          getTime(b.createdAt) -
          getTime(a.createdAt)
      );

      setTransactions(allTransactions);
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

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

    try {
      const date =
        typeof timestamp.toDate === "function"
          ? timestamp.toDate()
          : new Date(timestamp);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleDateString(
        "en-IN",
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

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      const date =
        typeof timestamp.toDate === "function"
          ? timestamp.toDate()
          : new Date(timestamp);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return date.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );
    } catch {
      return "";
    }
  };

  const isWithdrawal = (transaction) => {
    return (
      transaction.source === "withdrawal" ||
      String(transaction.type || "").toUpperCase() ===
        "WITHDRAWAL"
    );
  };

  const isCredit = (transaction) => {
    if (isWithdrawal(transaction)) {
      return false;
    }

    const type = String(
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

  const getIcon = (transaction) => {
    if (isWithdrawal(transaction)) {
      return "↘";
    }

    return isCredit(transaction) ? "↗" : "↘";
  };

  const getTitle = (transaction) => {
    if (isWithdrawal(transaction)) {
      const status = String(
        transaction.status || ""
      ).toLowerCase();

      if (status === "pending") {
        return "Withdrawal Request";
      }

      if (status === "approved") {
        return "Withdrawal Approved";
      }

      if (status === "paid") {
        return "Withdrawal Paid";
      }

      if (status === "rejected") {
        return "Withdrawal Rejected";
      }

      return "Withdrawal";
    }

    if (transaction.description) {
      return transaction.description;
    }

    const type = String(
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
      case "DEBIT":
        return "Wallet Debit";
      case "CREDIT":
        return "Wallet Credit";
      default:
        return "Wallet Transaction";
    }
  };

  const getStatus = (transaction) => {
    const status = String(
      transaction.status || ""
    ).toLowerCase();

    if (status === "pending") {
      return {
        text: "Pending",
        className: "pending"
      };
    }

    if (
      status === "rejected" ||
      status === "failed"
    ) {
      return {
        text: "Rejected",
        className: "failed"
      };
    }

    if (status === "approved") {
      return {
        text: "Approved",
        className: "success"
      };
    }

    if (status === "paid") {
      return {
        text: "Paid",
        className: "success"
      };
    }

    return {
      text: "Success",
      className: "success"
    };
  };

  if (loading) {
    return (
      <div className="wallet-page">
        <div className="wallet-loading">
          <div className="wallet-spinner"></div>
          <p>Wallet load होत आहे...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-page">
        <div className="wallet-error-box">
          <div className="wallet-error-icon">
            ⚠️
          </div>

          <h3>Wallet load झाला नाही</h3>

          <p>{error}</p>

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

  return (
    <div className="wallet-page">
      <div className="wallet-container">

        <div className="wallet-page-header">
          <div>
            <span className="wallet-label">
              ONLINEWALAA
            </span>

            <h1>My Wallet</h1>

            <p>
              तुमचा OnlineWalaa balance manage करा.
            </p>
          </div>

          <div className="wallet-header-icon">
            💰
          </div>
        </div>

        <section className="main-wallet-card">
          <div className="wallet-card-top">
            <div>
              <span>Total Wallet Balance</span>

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
              <span>Available Balance</span>

              <strong>
                ₹
                {wallet.availableBalance.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                Services / payments के लिए available
              </small>
            </div>

            <div className="balance-divider"></div>

            <div className="balance-info-item pending-balance">
              <span>Pending Referral</span>

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

        {wallet.pendingReferralAmount > 0 && (
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
                referral reward अभी available नहीं है।
              </p>

              <small>
                Admin approval के बाद यह amount
                available balance में चला जाएगा।
              </small>
            </div>
          </section>
        )}

        <section className="wallet-breakdown">
          <div className="wallet-breakdown-card">
            <div className="breakdown-icon available">
              ✓
            </div>

            <div>
              <span>Available</span>

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
              <span>Pending</span>

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
              <span>Total</span>

              <strong>
                ₹
                {wallet.walletBalance.toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="wallet-action-card">
          <div className="action-icon">
            ➕
          </div>

          <div className="action-content">
            <h3>Add Money</h3>

            <p>
              UPI / Card / Net Banking से wallet
              में पैसे add करें.
            </p>
          </div>

          <button
            type="button"
            className="add-money-btn"
            onClick={() =>
              setShowAddMoney(true)
            }
          >
            + Add Money
          </button>
        </section>

        <section className="wallet-action-card">
          <div className="action-icon">
            💸
          </div>

          <div className="action-content">
            <h3>Withdraw Money</h3>

            <p>
              Available balance अपने UPI account
              में withdraw करें.
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
            Withdraw
          </button>
        </section>

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

          {transactions.length === 0 ? (
            <div className="empty-transactions">
              <div className="empty-transaction-icon">
                💳
              </div>

              <h3>
                No transactions yet
              </h3>

              <p>
                तुमच्या wallet मध्ये transactions
                झाल्यावर त्या इथे दिसतील.
              </p>
            </div>
          ) : (
            <div className="transaction-list">
              {transactions.map((transaction) => {
                const credit =
                  isCredit(transaction);

                const status =
                  getStatus(transaction);

                return (
                  <div
                    className="transaction-item"
                    key={transaction.id}
                  >
                    <div
                      className={`transaction-icon ${
                        credit
                          ? "credit"
                          : "debit"
                      }`}
                    >
                      {getIcon(transaction)}
                    </div>

                    <div className="transaction-details">
                      <strong>
                        {getTitle(transaction)}
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
                          ID:{" "}
                          {transaction.referenceId}
                        </small>
                      )}

                      {transaction.upiId && (
                        <small>
                          UPI:{" "}
                          {transaction.upiId}
                        </small>
                      )}

                      {transaction.withdrawalId && (
                        <small>
                          Request:{" "}
                          {transaction.withdrawalId}
                        </small>
                      )}

                      {transaction.rejectionReason && (
                        <small>
                          Reason:{" "}
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
                        {credit ? "+" : "-"}₹
                        {Number(
                          transaction.amount || 0
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
              })}
            </div>
          )}
        </section>

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
                Available Balance services/payment
                साठी वापरता येईल.
              </li>

              <li>
                Pending Referral amount सध्या
                withdraw करता येणार नाही.
              </li>

              <li>
                Referral reward admin verification
                नंतर available होईल.
              </li>

              <li>
                Add Money, Referral, Cashback,
                Refund, Payment आणि Withdrawal
                transactions history मध्ये दिसतील.
              </li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}