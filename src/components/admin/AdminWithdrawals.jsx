import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db, app } from "../firebase";
import "./AdminWithdrawals.css";

const functions = getFunctions(app, "asia-south1");

const approveWithdrawal = httpsCallable(
  functions,
  "adminApproveWithdrawal"
);

const rejectWithdrawal = httpsCallable(
  functions,
  "adminRejectWithdrawal"
);

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const withdrawalsQuery = query(
      collection(db, "withdrawals"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      withdrawalsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        setWithdrawals(data);
        setLoading(false);
      },
      (err) => {
        console.error("Withdrawal listener error:", err);
        setError("Withdrawal requests load नहीं हो सकीं.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  };

  const formatAmount = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "approved":
        return "Approved";
      case "paid":
        return "Paid";
      case "rejected":
        return "Rejected";
      default:
        return status || "Unknown";
    }
  };

  const filteredWithdrawals =
    filter === "all"
      ? withdrawals
      : withdrawals.filter(
          (item) => item.status === filter
        );

  const pendingCount = withdrawals.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = withdrawals.filter(
    (item) => item.status === "approved"
  ).length;

  const paidCount = withdrawals.filter(
    (item) => item.status === "paid"
  ).length;

  const rejectedCount = withdrawals.filter(
    (item) => item.status === "rejected"
  ).length;

  const totalAmount = withdrawals
    .filter((item) => item.status === "paid")
    .reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  const handleApprove = async (withdrawal) => {
    if (!withdrawal?.id) return;

    const confirmed = window.confirm(
      `Approve withdrawal of ${formatAmount(
        withdrawal.amount
      )} to ${withdrawal.upiId}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setProcessingId(withdrawal.id);

      await approveWithdrawal({
        withdrawalId: withdrawal.id
      });

      setSelected(null);
    } catch (err) {
      console.error(
        "Approve withdrawal error:",
        err
      );

      setError(
        err?.details ||
          err?.message ||
          "Withdrawal approve नहीं हो सकी."
      );
    } finally {
      setProcessingId("");
    }
  };

  const handleReject = async () => {
    if (!selected?.id) return;

    const reason =
      rejectReason.trim() ||
      "Withdrawal rejected by admin.";

    const confirmed = window.confirm(
      "क्या आप यह withdrawal reject करना चाहते हैं?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setProcessingId(selected.id);

      await rejectWithdrawal({
        withdrawalId: selected.id,
        reason
      });

      setSelected(null);
      setRejectReason("");
    } catch (err) {
      console.error(
        "Reject withdrawal error:",
        err
      );

      setError(
        err?.details ||
          err?.message ||
          "Withdrawal reject नहीं हो सकी."
      );
    } finally {
      setProcessingId("");
    }
  };

  return (
    <div className="admin-withdrawals">
      <div className="admin-withdrawals-header">
        <div>
          <span className="admin-withdrawals-eyebrow">
            WALLET MANAGEMENT
          </span>

          <h1>Withdrawal Requests</h1>

          <p>
            Users की withdrawal requests manage करें.
          </p>
        </div>

        <div className="admin-withdrawals-user">
          {auth.currentUser?.email || "Admin"}
        </div>
      </div>

      {error && (
        <div className="admin-withdrawals-error">
          ⚠️ {error}
        </div>
      )}

      <div className="withdrawal-stats">
        <button
          type="button"
          className={`withdrawal-stat-card ${
            filter === "all" ? "active" : ""
          }`}
          onClick={() => setFilter("all")}
        >
          <span>Total Requests</span>
          <strong>{withdrawals.length}</strong>
        </button>

        <button
          type="button"
          className={`withdrawal-stat-card pending ${
            filter === "pending" ? "active" : ""
          }`}
          onClick={() => setFilter("pending")}
        >
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </button>

        <button
          type="button"
          className={`withdrawal-stat-card approved ${
            filter === "approved" ? "active" : ""
          }`}
          onClick={() => setFilter("approved")}
        >
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </button>

        <button
          type="button"
          className={`withdrawal-stat-card paid ${
            filter === "paid" ? "active" : ""
          }`}
          onClick={() => setFilter("paid")}
        >
          <span>Paid</span>
          <strong>{paidCount}</strong>
        </button>

        <button
          type="button"
          className={`withdrawal-stat-card rejected ${
            filter === "rejected" ? "active" : ""
          }`}
          onClick={() => setFilter("rejected")}
        >
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
        </button>

        <div className="withdrawal-stat-card amount">
          <span>Total Paid</span>
          <strong>{formatAmount(totalAmount)}</strong>
        </div>
      </div>

      <div className="withdrawal-panel">
        <div className="withdrawal-panel-header">
          <div>
            <h2>
              {filter === "all"
                ? "All Withdrawals"
                : `${getStatusLabel(filter)} Withdrawals`}
            </h2>

            <span>
              {filteredWithdrawals.length} requests
            </span>
          </div>

          <button
            type="button"
            className="withdrawal-refresh"
            onClick={() => window.location.reload()}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="withdrawal-loading">
            <div className="withdrawal-loading-spinner" />
            <p>Withdrawal requests loading...</p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="withdrawal-empty">
            <div className="withdrawal-empty-icon">
              💸
            </div>

            <h3>No Withdrawal Requests</h3>

            <p>
              इस filter में अभी कोई withdrawal request नहीं है.
            </p>
          </div>
        ) : (
          <div className="withdrawal-table-wrap">
            <table className="withdrawal-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>UPI ID</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredWithdrawals.map(
                  (withdrawal) => (
                    <tr key={withdrawal.id}>
                      <td>
                        <div className="withdrawal-user-cell">
                          <div className="withdrawal-avatar">
                            {(withdrawal.userId ||
                              "U")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {withdrawal.userName ||
                                withdrawal.name ||
                                "User"}
                            </strong>

                            <small>
                              {withdrawal.userId}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong className="withdrawal-amount">
                          {formatAmount(
                            withdrawal.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span className="withdrawal-upi">
                          {withdrawal.upiId || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`withdrawal-status ${withdrawal.status}`}
                        >
                          <i />
                          {getStatusLabel(
                            withdrawal.status
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="withdrawal-date">
                          {formatDate(
                            withdrawal.createdAt
                          )}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="withdrawal-view-btn"
                          onClick={() =>
                            setSelected(withdrawal)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="withdrawal-modal-overlay"
          onMouseDown={() =>
            !processingId &&
            setSelected(null)
          }
        >
          <div
            className="withdrawal-modal"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <div className="withdrawal-modal-header">
              <div>
                <span>
                  WITHDRAWAL REQUEST
                </span>

                <h2>
                  {formatAmount(
                    selected.amount
                  )}
                </h2>
              </div>

              <button
                type="button"
                className="withdrawal-modal-close"
                onClick={() =>
                  !processingId &&
                  setSelected(null)
                }
              >
                ×
              </button>
            </div>

            <div className="withdrawal-detail-status">
              <span
                className={`withdrawal-status ${selected.status}`}
              >
                <i />
                {getStatusLabel(
                  selected.status
                )}
              </span>
            </div>

            <div className="withdrawal-details">
              <div>
                <span>User ID</span>
                <strong>
                  {selected.userId || "—"}
                </strong>
              </div>

              <div>
                <span>UPI ID</span>
                <strong>
                  {selected.upiId || "—"}
                </strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>
                  {formatAmount(
                    selected.amount
                  )}
                </strong>
              </div>

              <div>
                <span>Request ID</span>
                <strong>
                  {selected.id}
                </strong>
              </div>

              <div>
                <span>Requested At</span>
                <strong>
                  {formatDate(
                    selected.createdAt
                  )}
                </strong>
              </div>

              {selected.rejectionReason && (
                <div className="withdrawal-detail-full">
                  <span>Rejection Reason</span>
                  <strong>
                    {selected.rejectionReason}
                  </strong>
                </div>
              )}
            </div>

            {selected.status ===
              "pending" && (
              <>
                <div className="withdrawal-reject-field">
                  <label>
                    Rejection reason
                  </label>

                  <textarea
                    value={rejectReason}
                    onChange={(e) =>
                      setRejectReason(
                        e.target.value
                      )
                    }
                    placeholder="Optional reason..."
                    disabled={
                      !!processingId
                    }
                  />
                </div>

                <div className="withdrawal-modal-actions">
                  <button
                    type="button"
                    className="withdrawal-reject-btn"
                    onClick={handleReject}
                    disabled={
                      !!processingId
                    }
                  >
                    {processingId ===
                    selected.id ? (
                      "Processing..."
                    ) : (
                      "Reject"
                    )}
                  </button>

                  <button
                    type="button"
                    className="withdrawal-approve-btn"
                    onClick={() =>
                      handleApprove(
                        selected
                      )
                    }
                    disabled={
                      !!processingId
                    }
                  >
                    {processingId ===
                    selected.id ? (
                      "Processing..."
                    ) : (
                      "Approve"
                    )}
                  </button>
                </div>
              </>
            )}

            {selected.status ===
              "approved" && (
              <div className="withdrawal-approved-note">
                ✓ Withdrawal approved. Payment अब user के UPI ID पर
                process करें.
              </div>
            )}

            {selected.status ===
              "paid" && (
              <div className="withdrawal-paid-note">
                ✓ Payment successfully marked as paid.
              </div>
            )}

            {selected.status ===
              "rejected" && (
              <div className="withdrawal-rejected-note">
                This withdrawal request was rejected.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}