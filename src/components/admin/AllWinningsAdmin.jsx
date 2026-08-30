import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  increment
} from "firebase/firestore";
import { db } from "../firebase";
import "./AllWinningsAdmin.css";

export default function AllWinningsAdmin() {
  const [winnings, setWinnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketMobile, setTicketMobile] = useState("");
  const [ticketAmount, setTicketAmount] = useState(1);
  const [ticketLoading, setTicketLoading] = useState(false);

  const fetchWinnings = async () => {
    setLoading(true);

    try {
      const usersSnapshot = await getDocs(
        collection(db, "users")
      );

      const usersDataMap = {};

      usersSnapshot.forEach((userDoc) => {
        usersDataMap[userDoc.id] = userDoc.data();
      });

      const winningsQuery = query(
        collection(db, "winnings"),
        orderBy("wonAt", "desc")
      );

      const snapshot = await getDocs(winningsQuery);

      const data = snapshot.docs.map((winningDoc) => {
        const docData = winningDoc.data();
        const customer =
          usersDataMap[docData.userId] || {};

        return {
          id: winningDoc.id,
          ...docData,
          userName:
            customer.name ||
            docData.userName ||
            "Unknown",
          userMobile:
            customer.mobile ||
            docData.userMobile ||
            "N/A",
          wonAt:
            docData.wonAt?.toDate?.() ||
            new Date(),
          expiresAt:
            docData.expiresAt?.toDate?.() ||
            new Date()
        };
      });

      setWinnings(data);
    } catch (error) {
      console.error(
        "Error fetching all winnings:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinnings();
  }, []);

  const getStatus = (win) => {
    const now = new Date();

    if (win.status === "redeemed") {
      return {
        type: "redeemed",
        text: "Redeemed",
        icon: "✓"
      };
    }

    if (
      win.status === "expired" ||
      (win.status === "active" &&
        win.expiresAt < now)
    ) {
      return {
        type: "expired",
        text: "Expired",
        icon: "!"
      };
    }

    const diffTime =
      win.expiresAt.getTime() - now.getTime();

    const diffDays =
      Math.ceil(
        diffTime /
          (1000 * 60 * 60 * 24)
      );

    if (diffDays <= 2) {
      return {
        type: "expiring",
        text: "Expiring Soon",
        icon: "!"
      };
    }

    return {
      type: "active",
      text: "Active",
      icon: "✓"
    };
  };

  const filteredWinnings = useMemo(() => {
    const now = new Date();

    const nearExpiryDate = new Date();
    nearExpiryDate.setDate(
      now.getDate() + 2
    );

    let result = [...winnings];

    const search =
      searchQuery.trim().toLowerCase();

    if (search) {
      result = result.filter((win) => {
        const name =
          win.userName?.toLowerCase() || "";

        const mobile =
          win.userMobile?.toString() || "";

        const prize =
          win.prizeName?.toLowerCase() || "";

        return (
          name.includes(search) ||
          mobile.includes(search) ||
          prize.includes(search)
        );
      });
    }

    if (filter === "active") {
      result = result.filter(
        (win) =>
          win.status === "active" &&
          win.expiresAt > now
      );
    }

    if (filter === "expiring_soon") {
      result = result.filter(
        (win) =>
          win.status === "active" &&
          win.expiresAt > now &&
          win.expiresAt <= nearExpiryDate
      );
    }

    if (filter === "redeemed") {
      result = result.filter(
        (win) =>
          win.status === "redeemed"
      );
    }

    if (filter === "expired") {
      result = result.filter(
        (win) =>
          win.status === "expired" ||
          (win.status === "active" &&
            win.expiresAt < now)
      );
    }

    return result;
  }, [
    winnings,
    filter,
    searchQuery
  ]);

  const stats = useMemo(() => {
    const now = new Date();

    let active = 0;
    let expiring = 0;
    let redeemed = 0;
    let expired = 0;

    winnings.forEach((win) => {
      const status = getStatus(win);

      if (status.type === "active") {
        active++;
      }

      if (status.type === "expiring") {
        expiring++;
      }

      if (status.type === "redeemed") {
        redeemed++;
      }

      if (status.type === "expired") {
        expired++;
      }
    });

    return {
      total: winnings.length,
      active,
      expiring,
      redeemed,
      expired
    };
  }, [winnings]);

  const handleRedeem = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to redeem this prize?"
    );

    if (!confirmed) return;

    try {
      await updateDoc(
        doc(db, "winnings", id),
        {
          status: "redeemed",
          redeemedAt: new Date()
        }
      );

      setWinnings((prev) =>
        prev.map((win) =>
          win.id === id
            ? {
                ...win,
                status: "redeemed"
              }
            : win
        )
      );

      alert(
        "Prize redeemed successfully!"
      );
    } catch (error) {
      console.error(
        "Error redeeming prize:",
        error
      );

      alert(
        "Unable to redeem prize. Please try again."
      );
    }
  };

  const handleAddTicket = async () => {
    if (
      !ticketMobile.trim() ||
      ticketAmount <= 0
    ) {
      alert(
        "Please enter a valid mobile number and ticket amount."
      );
      return;
    }

    setTicketLoading(true);

    try {
      const usersQuery = query(
        collection(db, "users"),
        where(
          "mobile",
          "==",
          ticketMobile.trim()
        )
      );

      const querySnapshot =
        await getDocs(usersQuery);

      if (querySnapshot.empty) {
        alert(
          "No user found with this mobile number."
        );
        setTicketLoading(false);
        return;
      }

      const userDoc =
        querySnapshot.docs[0];

      await updateDoc(
        doc(db, "users", userDoc.id),
        {
          tickets: increment(
            Number(ticketAmount)
          )
        }
      );

      alert(
        `Successfully added ${ticketAmount} ticket(s) to ${
          userDoc.data().name ||
          "Customer"
        }.`
      );

      setShowTicketModal(false);
      setTicketMobile("");
      setTicketAmount(1);
    } catch (error) {
      console.error(
        "Error adding tickets:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );
    } finally {
      setTicketLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  if (loading) {
    return (
      <div className="winnings-admin-loading">
        <div className="winnings-spinner"></div>
        <strong>
          Loading winnings...
        </strong>
        <span>
          Fetching lucky draw records
        </span>
      </div>
    );
  }

  return (
    <div className="winnings-admin">
      <div className="winnings-hero">
        <div className="winnings-title-area">
          <div className="winnings-icon">
            🏆
          </div>

          <div>
            <span className="winnings-eyebrow">
              LUCKY DRAW MANAGEMENT
            </span>

            <h2>
              Winnings
            </h2>

            <p>
              Manage prizes, winners and
              redemption status.
            </p>
          </div>
        </div>

        <button
          className="bonus-ticket-btn"
          onClick={() =>
            setShowTicketModal(true)
          }
        >
          <span>🎟️</span>
          Add Bonus Ticket
        </button>
      </div>

      <div className="winnings-stats">
        <div className="winning-stat total">
          <div className="stat-icon">
            🏆
          </div>

          <div>
            <strong>
              {stats.total}
            </strong>
            <span>Total Prizes</span>
          </div>
        </div>

        <div className="winning-stat active">
          <div className="stat-icon">
            ✓
          </div>

          <div>
            <strong>
              {stats.active}
            </strong>
            <span>Active</span>
          </div>
        </div>

        <div className="winning-stat expiring">
          <div className="stat-icon">
            !
          </div>

          <div>
            <strong>
              {stats.expiring}
            </strong>
            <span>Expiring Soon</span>
          </div>
        </div>

        <div className="winning-stat redeemed">
          <div className="stat-icon">
            ✓
          </div>

          <div>
            <strong>
              {stats.redeemed}
            </strong>
            <span>Redeemed</span>
          </div>
        </div>

        <div className="winning-stat expired">
          <div className="stat-icon">
            ×
          </div>

          <div>
            <strong>
              {stats.expired}
            </strong>
            <span>Expired</span>
          </div>
        </div>
      </div>

      <div className="winnings-controls">
        <div className="winning-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search name, mobile or prize..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
          />

          {searchQuery && (
            <button
              onClick={() =>
                setSearchQuery("")
              }
            >
              ×
            </button>
          )}
        </div>

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
          className="winning-filter"
        >
          <option value="all">
            All Prizes
          </option>

          <option value="active">
            Active
          </option>

          <option value="expiring_soon">
            Expiring Soon
          </option>

          <option value="redeemed">
            Redeemed
          </option>

          <option value="expired">
            Expired
          </option>
        </select>

        <button
          className="winning-refresh"
          onClick={fetchWinnings}
        >
          ↻
          <span>Refresh</span>
        </button>
      </div>

      <div className="results-row">
        <span>
          Showing{" "}
          <strong>
            {filteredWinnings.length}
          </strong>{" "}
          of{" "}
          <strong>
            {winnings.length}
          </strong>{" "}
          prizes
        </span>
      </div>

      {filteredWinnings.length === 0 ? (
        <div className="winnings-empty">
          <div>🏆</div>

          <h3>
            No prizes found
          </h3>

          <p>
            Try changing the search or
            filter.
          </p>
        </div>
      ) : (
        <>
          <div className="winnings-table-wrapper">
            <table className="winnings-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Prize</th>
                  <th>Won On</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredWinnings.map(
                  (win) => {
                    const status =
                      getStatus(win);

                    return (
                      <tr key={win.id}>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">
                              {(
                                win.userName ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {win.userName}
                              </strong>

                              <small>
                                Winner
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="mobile-number">
                            {win.userMobile}
                          </span>
                        </td>

                        <td>
                          <div className="prize-cell">
                            <span>
                              🎁
                            </span>

                            <strong>
                              {win.prizeName}
                            </strong>
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            win.wonAt
                          )}
                        </td>

                        <td>
                          {formatDate(
                            win.expiresAt
                          )}
                        </td>

                        <td>
                          <span
                            className={`winning-status ${status.type}`}
                          >
                            <i>
                              {status.icon}
                            </i>

                            {status.text}
                          </span>
                        </td>

                        <td>
                          {status.type ===
                            "active" ||
                          status.type ===
                            "expiring" ? (
                            <button
                              className="redeem-btn"
                              onClick={() =>
                                handleRedeem(
                                  win.id
                                )
                              }
                            >
                              Redeem
                            </button>
                          ) : (
                            <span className="no-action">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          <div className="winnings-mobile-list">
            {filteredWinnings.map(
              (win) => {
                const status =
                  getStatus(win);

                return (
                  <div
                    className="winning-mobile-card"
                    key={win.id}
                  >
                    <div className="mobile-card-top">
                      <div className="customer-cell">
                        <div className="customer-avatar">
                          {(
                            win.userName ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {win.userName}
                          </strong>

                          <small>
                            {win.userMobile}
                          </small>
                        </div>
                      </div>

                      <span
                        className={`winning-status ${status.type}`}
                      >
                        <i>
                          {status.icon}
                        </i>
                        {status.text}
                      </span>
                    </div>

                    <div className="mobile-prize">
                      <div className="mobile-prize-icon">
                        🎁
                      </div>

                      <div>
                        <span>
                          PRIZE WON
                        </span>

                        <strong>
                          {win.prizeName}
                        </strong>
                      </div>
                    </div>

                    <div className="mobile-card-info">
                      <div>
                        <span>
                          Won On
                        </span>

                        <strong>
                          {formatDate(
                            win.wonAt
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Expires
                        </span>

                        <strong>
                          {formatDate(
                            win.expiresAt
                          )}
                        </strong>
                      </div>
                    </div>

                    {(status.type ===
                      "active" ||
                      status.type ===
                        "expiring") && (
                      <button
                        className="mobile-redeem-btn"
                        onClick={() =>
                          handleRedeem(
                            win.id
                          )
                        }
                      >
                        ✓ Redeem Prize
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </>
      )}

      {showTicketModal && (
        <div
          className="ticket-modal-overlay"
          onClick={() =>
            !ticketLoading &&
            setShowTicketModal(false)
          }
        >
          <div
            className="ticket-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="ticket-modal-close"
              onClick={() =>
                setShowTicketModal(false)
              }
              disabled={ticketLoading}
            >
              ×
            </button>

            <div className="ticket-modal-icon">
              🎟️
            </div>

            <div className="ticket-modal-title">
              <span>
                LUCKY DRAW
              </span>

              <h3>
                Add Bonus Tickets
              </h3>

              <p>
                Give extra spin tickets to
                any registered customer.
              </p>
            </div>

            <div className="ticket-field">
              <label>
                Customer Mobile Number
              </label>

              <div className="ticket-input">
                <span>
                  📱
                </span>

                <input
                  type="tel"
                  placeholder="9876543210"
                  value={ticketMobile}
                  onChange={(e) =>
                    setTicketMobile(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="ticket-field">
              <label>
                Number of Tickets
              </label>

              <div className="ticket-amount-row">
                {[1, 2, 5, 10].map(
                  (amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={
                        Number(
                          ticketAmount
                        ) === amount
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        setTicketAmount(
                          amount
                        )
                      }
                    >
                      +{amount}
                    </button>
                  )
                )}
              </div>

              <input
                className="ticket-number-input"
                type="number"
                min="1"
                max="100"
                value={ticketAmount}
                onChange={(e) =>
                  setTicketAmount(
                    Number(
                      e.target.value
                    )
                  )
                }
              />
            </div>

            <div className="ticket-modal-actions">
              <button
                className="ticket-cancel"
                onClick={() =>
                  setShowTicketModal(false)
                }
                disabled={ticketLoading}
              >
                Cancel
              </button>

              <button
                className="ticket-send"
                onClick={
                  handleAddTicket
                }
                disabled={ticketLoading}
              >
                {ticketLoading ? (
                  <>
                    <span className="mini-spinner"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    🎟️ Send Tickets
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}