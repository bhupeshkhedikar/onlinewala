import React, {
  useEffect,
  useState,
  useMemo
} from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit
} from "firebase/firestore";

import {
  getFunctions,
  httpsCallable
} from "firebase/functions";

import { db } from "../../firebase";

import "./AdminWalletManager.css";

export default function AdminWalletManager() {
  // =========================================================
  // STATE
  // =========================================================

  const [users, setUsers] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [showBalance, setShowBalance] =
    useState(false);

  const [showAddMoney, setShowAddMoney] =
    useState(false);

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [modalError, setModalError] =
    useState("");

  const [recentTransactions, setRecentTransactions] =
    useState([]);

  const [transactionsLoading, setTransactionsLoading] =
    useState(false);

  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const usersQuery = query(
        collection(db, "users"),
        orderBy("createdAt", "desc")
      );

      const snapshot =
        await getDocs(usersQuery);

      const data =
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

      setUsers(data);

    } catch (err) {
      console.error(
        "Admin wallet users loading error:",
        err
      );

      setError(
        "Users माहिती load करताना काहीतरी चूक झाली."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadUsers();
  }, []);

  // =========================================================
  // SEARCH USERS
  // =========================================================

  const filteredUsers = useMemo(() => {
    const keyword =
      search
        .trim()
        .toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((user) => {
      const searchableText = [
        user.id,
        user.uid,
        user.name,
        user.userName,
        user.fullName,
        user.displayName,
        user.email,
        user.userEmail,
        user.mobile,
        user.phone,
        user.phoneNumber
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        keyword
      );
    });
  }, [users, search]);

  // =========================================================
  // GET USER NAME
  // =========================================================

  const getUserName = (user) => {
    return (
      user.userName ||
      user.name ||
      user.fullName ||
      user.displayName ||
      "ग्राहक"
    );
  };

  // =========================================================
  // GET USER EMAIL
  // =========================================================

  const getUserEmail = (user) => {
    return (
      user.userEmail ||
      user.email ||
      "Email उपलब्ध नाही"
    );
  };

  // =========================================================
  // GET USER MOBILE
  // =========================================================

  const getUserMobile = (user) => {
    return (
      user.mobile ||
      user.phone ||
      user.phoneNumber ||
      ""
    );
  };

  // =========================================================
  // GET WALLET BALANCE
  // =========================================================

  const getWalletBalance = (user) => {
    return Number(
      user.walletBalance || 0
    );
  };

  // =========================================================
  // GET AVAILABLE BALANCE
  // =========================================================

  const getAvailableBalance = (user) => {
    return Number(
      user.availableBalance ??
      user.walletBalance ??
      0
    );
  };

  // =========================================================
  // OPEN USER
  // =========================================================

  const selectUser = (user) => {
    setSelectedUser(user);
    setShowBalance(false);
    setMessage("");
    setModalError("");

    loadUserTransactions(
      user.id
    );
  };

  // =========================================================
  // CLOSE USER
  // =========================================================

  const closeUser = () => {
    if (saving) {
      return;
    }

    setSelectedUser(null);
    setShowBalance(false);
    setShowAddMoney(false);
    setAmount("");
    setNote("");
    setMessage("");
    setModalError("");
    setRecentTransactions([]);
  };

  // =========================================================
  // LOAD USER TRANSACTIONS
  // =========================================================

  const loadUserTransactions =
    async (uid) => {
      try {
        setTransactionsLoading(true);

        const transactionsQuery =
          query(
            collection(
              db,
              "walletTransactions"
            ),
            orderBy(
              "createdAt",
              "desc"
            ),
            limit(100)
          );

        const snapshot =
          await getDocs(
            transactionsQuery
          );

        const data =
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data()
            }))
            .filter(
              (transaction) =>
                transaction.userId ===
                  uid ||
                transaction.uid === uid
            )
            .slice(0, 10);

        setRecentTransactions(
          data
        );

      } catch (err) {
        console.error(
          "User wallet transactions error:",
          err
        );

        setRecentTransactions([]);

      } finally {
        setTransactionsLoading(
          false
        );
      }
    };

  // =========================================================
  // OPEN ADD MONEY
  // =========================================================

  const openAddMoney = () => {
    setAmount("");
    setNote("");
    setModalError("");
    setMessage("");
    setShowAddMoney(true);
  };

  // =========================================================
  // CLOSE ADD MONEY
  // =========================================================

  const closeAddMoney = () => {
    if (saving) {
      return;
    }

    setShowAddMoney(false);
    setAmount("");
    setNote("");
    setModalError("");
  };

  // =========================================================
  // ADD MONEY
  // =========================================================

  const handleAddMoney = async () => {
    setModalError("");
    setMessage("");

    if (!selectedUser) {
      setModalError(
        "कृपया आधी User निवडा."
      );
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !amount ||
      !Number.isFinite(
        numericAmount
      )
    ) {
      setModalError(
        "कृपया रक्कम भरा."
      );
      return;
    }

    if (
      numericAmount <= 0
    ) {
      setModalError(
        "रक्कम ₹1 पेक्षा जास्त असावी."
      );
      return;
    }

    if (
      !Number.isInteger(
        numericAmount
      )
    ) {
      setModalError(
        "रक्कम पूर्ण अंकात असावी."
      );
      return;
    }

    if (
      numericAmount > 500000
    ) {
      setModalError(
        "एका वेळी जास्तीत जास्त ₹5,00,000 add करता येतील."
      );
      return;
    }

    try {
      setSaving(true);

      const functions =
        getFunctions(
          undefined,
          "asia-south1"
        );

      const adminAddWalletMoney =
        httpsCallable(
          functions,
          "adminAddWalletMoney"
        );

      const result =
        await adminAddWalletMoney({
          uid:
            selectedUser.id,
          amount:
            numericAmount,
          note:
            note.trim() || null
        });

      const data =
        result.data;

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Money add करता आले नाही."
        );
      }

      // Update selected user locally
      const updatedWalletBalance =
        Number(
          data.walletBalance ??
            getWalletBalance(
              selectedUser
            ) +
              numericAmount
        );

      const updatedAvailableBalance =
        Number(
          data.availableBalance ??
            getAvailableBalance(
              selectedUser
            ) +
              numericAmount
        );

      const updatedUser = {
        ...selectedUser,
        walletBalance:
          updatedWalletBalance,
        availableBalance:
          updatedAvailableBalance
      };

      setSelectedUser(
        updatedUser
      );

      // Update user in list
      setUsers((previous) =>
        previous.map((user) =>
          user.id ===
          selectedUser.id
            ? {
                ...user,
                walletBalance:
                  updatedWalletBalance,
                availableBalance:
                  updatedAvailableBalance
              }
            : user
        )
      );

      setMessage(
        `₹${numericAmount.toLocaleString(
          "en-IN"
        )} wallet मध्ये यशस्वीरित्या add झाले.`
      );

      setAmount("");
      setNote("");

      setShowAddMoney(false);

      // Reload transactions
      await loadUserTransactions(
        selectedUser.id
      );

    } catch (err) {
      console.error(
        "Admin add wallet money error:",
        err
      );

      setModalError(
        err?.message ||
          "Money add करताना काहीतरी चूक झाली."
      );

    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    try {
      let date;

      if (
        typeof value.toDate ===
        "function"
      ) {
        date = value.toDate();
      } else if (
        typeof value.toMillis ===
        "function"
      ) {
        date = new Date(
          value.toMillis()
        );
      } else if (
        value.seconds !== undefined
      ) {
        date = new Date(
          value.seconds * 1000
        );
      } else {
        date = new Date(value);
      }

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
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

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (value) => {
    if (!value) {
      return "";
    }

    try {
      let date;

      if (
        typeof value.toDate ===
        "function"
      ) {
        date = value.toDate();
      } else if (
        typeof value.toMillis ===
        "function"
      ) {
        date = new Date(
          value.toMillis()
        );
      } else if (
        value.seconds !== undefined
      ) {
        date = new Date(
          value.seconds * 1000
        );
      } else {
        date = new Date(value);
      }

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="admin-wallet-page">

        <div className="admin-wallet-loading">

          <div className="admin-wallet-spinner"></div>

          <h3>
            Users load होत आहेत...
          </h3>

          <p>
            कृपया थोडा वेळ प्रतीक्षा करा.
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="admin-wallet-page">

        <div className="admin-wallet-error">

          <div className="admin-wallet-error-icon">
            ⚠️
          </div>

          <h3>
            Wallet Manager load झाला नाही
          </h3>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadUsers()
            }
          >
            पुन्हा प्रयत्न करा
          </button>

        </div>

      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="admin-wallet-page">

      <div className="admin-wallet-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-wallet-header">

          <div className="admin-wallet-heading">

            <div className="admin-wallet-icon">
              💰
            </div>

            <div>

              <span>
                WALLET MANAGEMENT
              </span>

              <h1>
                User Wallet Manager
              </h1>

              <p>
                Specific user च्या wallet मध्ये
                money add आणि balance manage करा.
              </p>

            </div>

          </div>

          <button
            type="button"
            className="admin-wallet-refresh"
            onClick={() =>
              loadUsers(true)
            }
            disabled={refreshing}
          >
            <span
              className={
                refreshing
                  ? "refresh-spinning"
                  : ""
              }
            >
              ↻
            </span>

            {refreshing
              ? "Refresh..."
              : "Refresh"}
          </button>

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="admin-wallet-search-box">

          <span className="admin-wallet-search-icon">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Name, Email, Mobile किंवा User ID शोधा..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>
          )}

        </div>

        {/* =================================================
            USER COUNT
        ================================================= */}

        <div className="admin-wallet-result-bar">

          <div>
            <strong>
              {filteredUsers.length}
            </strong>{" "}
            Users सापडले
          </div>

          <div>
            एकूण{" "}
            <strong>
              {users.length}
            </strong>{" "}
            Users
          </div>

        </div>

        {/* =================================================
            USER LIST
        ================================================= */}

        <div className="admin-wallet-user-list">

          {filteredUsers.length ===
          0 ? (

            <div className="admin-wallet-empty">

              <div>
                👤
              </div>

              <h3>
                User सापडला नाही
              </h3>

              <p>
                Name, Email, Mobile किंवा
                User ID वापरून पुन्हा शोधा.
              </p>

            </div>

          ) : (

            filteredUsers.map(
              (user) => {

                const walletBalance =
                  getWalletBalance(
                    user
                  );

                const availableBalance =
                  getAvailableBalance(
                    user
                  );

                return (
                  <div
                    className="admin-wallet-user-card"
                    key={user.id}
                  >

                    {/* USER INFO */}

                    <div className="admin-wallet-user-info">

                      <div className="admin-wallet-avatar">
                        {getUserName(
                          user
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="admin-wallet-user-details">

                        <strong>
                          {getUserName(
                            user
                          )}
                        </strong>

                        <span>
                          {getUserEmail(
                            user
                          )}
                        </span>

                        {getUserMobile(
                          user
                        ) && (
                          <small>
                            📱{" "}
                            {getUserMobile(
                              user
                            )}
                          </small>
                        )}

                        <small className="admin-wallet-user-id">
                          UID:{" "}
                          {user.id}
                        </small>

                      </div>

                    </div>

                    {/* WALLET HIDDEN */}

                    <div className="admin-wallet-hidden-balance">

                      <span>
                        Wallet Balance
                      </span>

                      <strong>
                        ••••••
                      </strong>

                    </div>

                    {/* ACTION */}

                    <div className="admin-wallet-user-action">

                      <button
                        type="button"
                        className="admin-wallet-see-btn"
                        onClick={() =>
                          selectUser(
                            user
                          )
                        }
                      >
                        👁️ See
                      </button>

                    </div>

                  </div>
                );
              }
            )

          )}

        </div>

      </div>

      {/* =====================================================
          USER WALLET MODAL
      ===================================================== */}

      {selectedUser && (
        <div
          className="admin-wallet-overlay"
          onClick={closeUser}
        >

          <div
            className="admin-wallet-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="admin-wallet-modal-header">

              <div className="admin-wallet-modal-user">

                <div className="admin-wallet-modal-avatar">
                  {getUserName(
                    selectedUser
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <h2>
                    {getUserName(
                      selectedUser
                    )}
                  </h2>

                  <p>
                    {getUserEmail(
                      selectedUser
                    )}
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="admin-wallet-close"
                onClick={
                  closeUser
                }
                disabled={saving}
              >
                ×
              </button>

            </div>

            {/* USER DETAILS */}

            <div className="admin-wallet-user-meta">

              <div>
                <span>
                  User ID
                </span>

                <strong>
                  {selectedUser.id}
                </strong>
              </div>

              {getUserMobile(
                selectedUser
              ) && (
                <div>
                  <span>
                    Mobile
                  </span>

                  <strong>
                    {getUserMobile(
                      selectedUser
                    )}
                  </strong>
                </div>
              )}

            </div>

            {/* =================================================
                BALANCE
            ================================================= */}

            <div className="admin-wallet-balance-card">

              <div className="admin-wallet-balance-top">

                <div>
                  <span>
                    एकूण Wallet Balance
                  </span>

                  <div className="admin-wallet-balance-value">

                    {showBalance ? (
                      <strong>
                        ₹
                        {getWalletBalance(
                          selectedUser
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    ) : (
                      <strong>
                        •••••••
                      </strong>
                    )}

                  </div>

                </div>

                <button
                  type="button"
                  className="admin-wallet-eye-btn"
                  onClick={() =>
                    setShowBalance(
                      (previous) =>
                        !previous
                    )
                  }
                >
                  {showBalance
                    ? "🙈 Hide"
                    : "👁️ See"}
                </button>

              </div>

              <div className="admin-wallet-balance-divider"></div>

              <div className="admin-wallet-available">

                <div>
                  <span>
                    Available Balance
                  </span>

                  <strong>
                    {showBalance
                      ? `₹${getAvailableBalance(
                          selectedUser
                        ).toLocaleString(
                          "en-IN"
                        )}`
                      : "••••••"}
                  </strong>
                </div>

                <div className="admin-wallet-balance-lock">
                  🔐
                </div>

              </div>

            </div>

            {/* =================================================
                SUCCESS MESSAGE
            ================================================= */}

            {message && (
              <div className="admin-wallet-success-message">
                ✓ {message}
              </div>
            )}

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="admin-wallet-actions">

              <button
                type="button"
                className="admin-wallet-add-money-btn"
                onClick={
                  openAddMoney
                }
              >
                <span>
                  ➕
                </span>

                <div>
                  <strong>
                    Wallet मध्ये Money Add करा
                  </strong>

                  <small>
                    User च्या wallet balance मध्ये
                    रक्कम जमा करा
                  </small>
                </div>
              </button>

            </div>

            {/* =================================================
                RECENT TRANSACTIONS
            ================================================= */}

            <div className="admin-wallet-transactions">

              <div className="admin-wallet-section-title">

                <div>
                  <span>
                    TRANSACTION HISTORY
                  </span>

                  <h3>
                    Recent Wallet Transactions
                  </h3>
                </div>

              </div>

              {transactionsLoading ? (

                <div className="admin-wallet-transactions-loading">
                  Transactions load होत आहेत...
                </div>

              ) : recentTransactions.length ===
                0 ? (

                <div className="admin-wallet-no-transactions">
                  अजून कोणतेही transactions नाहीत.
                </div>

              ) : (

                <div className="admin-wallet-transaction-list">

                  {recentTransactions.map(
                    (transaction) => {

                      const amount =
                        Number(
                          transaction.amount ||
                            0
                        );

                      const type =
                        String(
                          transaction.type ||
                            ""
                        ).toUpperCase();

                      const isCredit =
                        transaction.isCredit ===
                          true ||
                        type ===
                          "CREDIT" ||
                        type ===
                          "RECHARGE" ||
                        type ===
                          "REFERRAL" ||
                        type ===
                          "REFERRAL_REWARD" ||
                        type ===
                          "CASHBACK" ||
                        type ===
                          "REFUND" ||
                        type ===
                          "ADMIN_WALLET_CREDIT";

                      return (
                        <div
                          className="admin-wallet-transaction"
                          key={
                            transaction.id
                          }
                        >

                          <div className="admin-wallet-transaction-icon">
                            {isCredit
                              ? "↗"
                              : "↘"}
                          </div>

                          <div className="admin-wallet-transaction-info">

                            <strong>
                              {transaction.description ||
                                transaction.serviceName ||
                                transaction.service ||
                                transaction.type ||
                                "Wallet Transaction"}
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

                          </div>

                          <strong
                            className={
                              isCredit
                                ? "admin-wallet-credit"
                                : "admin-wallet-debit"
                            }
                          >
                            {isCredit
                              ? "+"
                              : "-"}
                            ₹
                            {amount.toLocaleString(
                              "en-IN"
                            )}
                          </strong>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          ADD MONEY MODAL
      ===================================================== */}

      {showAddMoney &&
        selectedUser && (
          <div
            className="admin-wallet-overlay admin-wallet-add-overlay"
            onClick={
              closeAddMoney
            }
          >

            <div
              className="admin-wallet-add-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                type="button"
                className="admin-wallet-close"
                onClick={
                  closeAddMoney
                }
                disabled={saving}
              >
                ×
              </button>

              <div className="admin-wallet-add-icon">
                💰
              </div>

              <h2>
                Wallet मध्ये Money Add करा
              </h2>

              <p className="admin-wallet-add-user">
                {getUserName(
                  selectedUser
                )}
                <br />
                <span>
                  {getUserEmail(
                    selectedUser
                  )}
                </span>
              </p>

              {/* CURRENT BALANCE */}

              <div className="admin-wallet-current-small">

                <span>
                  Current Balance
                </span>

                <strong>
                  ₹
                  {getWalletBalance(
                    selectedUser
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              {/* AMOUNT */}

              <label>
                Add Amount
                <span className="admin-wallet-required">
                  *
                </span>
              </label>

              <div className="admin-wallet-amount-input">

                <span>
                  ₹
                </span>

                <input
                  type="number"
                  min="1"
                  max="500000"
                  step="1"
                  inputMode="numeric"
                  placeholder="उदा. 1000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  disabled={
                    saving
                  }
                />

              </div>

              {/* NOTE */}

              <label>
                Note
                <span className="admin-wallet-optional">
                  Optional
                </span>
              </label>

              <textarea
                placeholder="उदा. Manual wallet recharge"
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
                disabled={
                  saving
                }
                rows={3}
              />

              {/* ERROR */}

              {modalError && (
                <div className="admin-wallet-modal-error">
                  ⚠️ {modalError}
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="button"
                className="admin-wallet-save-btn"
                onClick={
                  handleAddMoney
                }
                disabled={
                  saving ||
                  !amount
                }
              >
                {saving ? (
                  <>
                    <span className="admin-wallet-btn-spinner"></span>
                    Money add होत आहे...
                  </>
                ) : (
                  <>
                    ➕ ₹
                    {amount
                      ? Number(
                          amount
                        ).toLocaleString(
                          "en-IN"
                        )
                      : "0"}{" "}
                    Add करा
                  </>
                )}
              </button>

            </div>

          </div>
        )}

    </div>
  );
}