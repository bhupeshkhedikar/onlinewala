import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where
} from "firebase/firestore";

import { db } from "../../firebase";
import "./AdminPayments.css";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================================================
  // LOAD PAYMENTS
  // =========================================================

  const loadPayments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const paymentsQuery = query(
        collection(db, "walletTransactions"),
        where("type", "in", [
          "ONLINEWALAA_PAYMENT",
          "SERVICE_PAYMENT",
          "PAYMENT"
        ]),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(paymentsQuery);

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      setPayments(data);
    } catch (err) {
      console.error("Admin payments loading error:", err);

      setError(
        "Payments माहिती load करताना काहीतरी चूक झाली."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // =========================================================
  // DATE / TIME
  // =========================================================

  const getDateObject = (value) => {
    if (!value) return null;

    try {
      if (typeof value.toDate === "function") {
        return value.toDate();
      }

      if (typeof value.toMillis === "function") {
        return new Date(value.toMillis());
      }

      if (value.seconds) {
        return new Date(value.seconds * 1000);
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  };

  const formatDate = (value) => {
    const date = getDateObject(value);

    if (!date) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatTime = (value) => {
    const date = getDateObject(value);

    if (!date) return "";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // =========================================================
  // PAYMENT STATUS
  // =========================================================

  const getStatus = (payment) => {
    const status = String(
      payment.status || "success"
    ).toLowerCase();

    if (
      status === "success" ||
      status === "completed" ||
      status === "paid"
    ) {
      return {
        text: "यशस्वी",
        className: "success"
      };
    }

    if (status === "pending") {
      return {
        text: "प्रलंबित",
        className: "pending"
      };
    }

    if (
      status === "failed" ||
      status === "rejected"
    ) {
      return {
        text: "अयशस्वी",
        className: "failed"
      };
    }

    return {
      text: status,
      className: "pending"
    };
  };

  // =========================================================
  // FILTER
  // =========================================================

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const status = getStatus(payment);

      const matchesStatus =
        statusFilter === "all" ||
        status.className === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchableText = [
        payment.userId,
        payment.userName,
        payment.name,
        payment.email,
        payment.userEmail,
        payment.referenceId,
        payment.transactionId,
        payment.razorpayPaymentId,
        payment.razorpayOrderId,
        payment.description
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [payments, search, statusFilter]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const statistics = useMemo(() => {
    let total = 0;
    let successful = 0;
    let pending = 0;
    let failed = 0;

    payments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      const status = getStatus(payment);

      if (status.className === "success") {
        total += amount;
        successful += 1;
      }

      if (status.className === "pending") {
        pending += 1;
      }

      if (status.className === "failed") {
        failed += 1;
      }
    });

    return {
      total,
      successful,
      pending,
      failed
    };
  }, [payments]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="admin-payments-page">
        <div className="admin-payments-loading">
          <div className="admin-payment-spinner"></div>
          <h3>Payments load होत आहेत...</h3>
          <p>कृपया थोडा वेळ प्रतीक्षा करा.</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="admin-payments-page">
        <div className="admin-payments-error">
          <div className="admin-payment-error-icon">
            ⚠️
          </div>

          <h3>Payments load झाले नाहीत</h3>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => loadPayments()}
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
    <div className="admin-payments-page">

      <div className="admin-payments-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-payments-header">

          <div className="admin-payments-heading">

            <div className="admin-payments-icon">
              💳
            </div>

            <div>
              <span className="admin-payments-overline">
                ONLINEWALAA
              </span>

              <h1>
                OnlineWalaa Payments
              </h1>

              <p>
                ग्राहकांनी OnlineWalaa ला केलेल्या
                सर्व payments येथे पहा.
              </p>
            </div>

          </div>

          <button
            type="button"
            className="admin-payments-refresh"
            onClick={() => loadPayments(true)}
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
              ? "Refresh होत आहे..."
              : "Refresh"}
          </button>

        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="admin-payment-stats">

          <div className="payment-stat-card total">

            <div className="payment-stat-icon">
              ₹
            </div>

            <div>
              <span>
                एकूण प्राप्त रक्कम
              </span>

              <strong>
                ₹
                {statistics.total.toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>

          </div>

          <div className="payment-stat-card success">

            <div className="payment-stat-icon">
              ✓
            </div>

            <div>
              <span>
                यशस्वी Payments
              </span>

              <strong>
                {statistics.successful}
              </strong>
            </div>

          </div>

          <div className="payment-stat-card pending">

            <div className="payment-stat-icon">
              ⏳
            </div>

            <div>
              <span>
                प्रलंबित
              </span>

              <strong>
                {statistics.pending}
              </strong>
            </div>

          </div>

          <div className="payment-stat-card failed">

            <div className="payment-stat-icon">
              !
            </div>

            <div>
              <span>
                अयशस्वी
              </span>

              <strong>
                {statistics.failed}
              </strong>
            </div>

          </div>

        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="admin-payment-filters">

          <div className="payment-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="User, Email, Transaction ID शोधा..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}

          </div>

          <div className="payment-status-filter">

            <button
              type="button"
              className={
                statusFilter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter("all")
              }
            >
              सर्व
            </button>

            <button
              type="button"
              className={
                statusFilter === "success"
                  ? "active success-filter"
                  : ""
              }
              onClick={() =>
                setStatusFilter("success")
              }
            >
              यशस्वी
            </button>

            <button
              type="button"
              className={
                statusFilter === "pending"
                  ? "active pending-filter"
                  : ""
              }
              onClick={() =>
                setStatusFilter("pending")
              }
            >
              प्रलंबित
            </button>

            <button
              type="button"
              className={
                statusFilter === "failed"
                  ? "active failed-filter"
                  : ""
              }
              onClick={() =>
                setStatusFilter("failed")
              }
            >
              अयशस्वी
            </button>

          </div>

        </div>

        {/* =================================================
            PAYMENT LIST
        ================================================= */}

        <section className="admin-payment-list-section">

          <div className="admin-payment-list-header">

            <div>
              <span>
                PAYMENT HISTORY
              </span>

              <h2>
                Payment Transactions
              </h2>
            </div>

            <strong>
              {filteredPayments.length} Transactions
            </strong>

          </div>

          {filteredPayments.length === 0 ? (

            <div className="admin-payments-empty">

              <div>
                💳
              </div>

              <h3>
                कोणतेही Payments सापडले नाहीत
              </h3>

              <p>
                तुमच्या निवडीनुसार कोणतेही
                payment transactions उपलब्ध नाहीत.
              </p>

            </div>

          ) : (

            <div className="admin-payment-list">

              {filteredPayments.map((payment) => {

                const status =
                  getStatus(payment);

                const amount =
                  Number(payment.amount || 0);

                return (
                  <div
                    className="admin-payment-row"
                    key={payment.id}
                  >

                    {/* ICON */}

                    <div className="admin-payment-row-icon">
                      💰
                    </div>

                    {/* USER */}

                    <div className="admin-payment-user">

                      <strong>
                        {payment.userName ||
                          payment.name ||
                          "ग्राहक"}
                      </strong>

                      <span>
                        {payment.userEmail ||
                          payment.email ||
                          "Email उपलब्ध नाही"}
                      </span>

                      <small>
                        User ID:{" "}
                        {payment.userId || "—"}
                      </small>

                    </div>

                    {/* PAYMENT INFO */}

                    <div className="admin-payment-info">

                      <strong>
                        OnlineWalaa Payment
                      </strong>

                      <span>
                        {formatDate(
                          payment.createdAt
                        )}

                        {formatTime(
                          payment.createdAt
                        ) && (
                          <>
                            {" • "}
                            {formatTime(
                              payment.createdAt
                            )}
                          </>
                        )}
                      </span>

                      {payment.referenceId && (
                        <small>
                          Ref:{" "}
                          {payment.referenceId}
                        </small>
                      )}

                    </div>

                    {/* AMOUNT */}

                    <div className="admin-payment-amount">

                      <strong>
                        +₹
                        {amount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <span
                        className={`admin-payment-status ${status.className}`}
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

      </div>

    </div>
  );
}