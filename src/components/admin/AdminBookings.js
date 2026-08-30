import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import "./AdminBookings.css";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const statusOptions = [
    "Pending",
    "Accepted",
    "In Progress",
    "Completed",
    "Rejected"
  ];

  const paymentOptions = [
    "Pending",
    "Paid",
    "Failed",
    "Refunded"
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(
        collection(db, "bookings")
      );

      const data = snapshot.docs.map((bookingDoc) => ({
        id: bookingDoc.id,
        ...bookingDoc.data()
      }));

      data.sort(
        (a, b) =>
          (b.createdAt?.seconds || 0) -
          (a.createdAt?.seconds || 0)
      );

      setBookings(data);
    } catch (error) {
      console.error(
        "Error fetching bookings:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const formatAppliedOn = (timestamp) => {
    if (!timestamp) return "N/A";

    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);

    if (isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const handlePaymentChange = async (
    id,
    newStatus
  ) => {
    try {
      await updateDoc(
        doc(db, "bookings", id),
        {
          paymentStatus: newStatus
        }
      );

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                paymentStatus: newStatus
              }
            : booking
        )
      );

      if (
        selectedBooking &&
        selectedBooking.id === id
      ) {
        setSelectedBooking((prev) => ({
          ...prev,
          paymentStatus: newStatus
        }));
      }
    } catch (error) {
      console.error(
        "Payment update error:",
        error
      );
      alert("Unable to update payment status.");
    }
  };

  const handleStatusChange = async (
    id,
    newStatus
  ) => {
    try {
      await updateDoc(
        doc(db, "bookings", id),
        {
          status: newStatus
        }
      );

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status: newStatus
              }
            : booking
        )
      );

      if (
        selectedBooking &&
        selectedBooking.id === id
      ) {
        setSelectedBooking((prev) => ({
          ...prev,
          status: newStatus
        }));
      }
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );
      alert("Unable to update booking status.");
    }
  };

  const getPaymentClass = (status) => {
    switch (status) {
      case "Paid":
        return "paid";

      case "Failed":
        return "failed";

      case "Refunded":
        return "refunded";

      default:
        return "pending";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Accepted":
        return "accepted";

      case "In Progress":
        return "progress";

      case "Completed":
        return "completed";

      case "Rejected":
        return "rejected";

      default:
        return "pending";
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(
      (b) =>
        (b.status || "Pending") === "Pending"
    ).length,
    progress: bookings.filter(
      (b) =>
        b.status === "In Progress"
    ).length,
    completed: bookings.filter(
      (b) =>
        b.status === "Completed"
    ).length
  };

  if (loading) {
    return (
      <div className="bookings-loading">
        <div className="booking-spinner"></div>
        <strong>
          Loading Bookings
        </strong>
        <span>
          Fetching service bookings...
        </span>
      </div>
    );
  }

  return (
    <section className="admin-bookings">

      <div className="bookings-header">
        <div className="bookings-heading">
          <div className="bookings-heading-icon">
            📅
          </div>

          <div>
            <span className="section-eyebrow">
              SERVICE MANAGEMENT
            </span>

            <h2>
              Service Bookings
            </h2>

            <p>
              Manage customer appointments,
              payments and service status.
            </p>
          </div>
        </div>

        <button
          className="bookings-refresh"
          onClick={fetchBookings}
        >
          ↻
          <span>Refresh</span>
        </button>
      </div>

      <div className="booking-stats">

        <div className="booking-stat total">
          <div className="booking-stat-icon">
            📋
          </div>

          <div>
            <strong>
              {stats.total}
            </strong>
            <span>Total</span>
          </div>
        </div>

        <div className="booking-stat pending">
          <div className="booking-stat-icon">
            ⏳
          </div>

          <div>
            <strong>
              {stats.pending}
            </strong>
            <span>Pending</span>
          </div>
        </div>

        <div className="booking-stat progress">
          <div className="booking-stat-icon">
            ⚙️
          </div>

          <div>
            <strong>
              {stats.progress}
            </strong>
            <span>In Progress</span>
          </div>
        </div>

        <div className="booking-stat completed">
          <div className="booking-stat-icon">
            ✓
          </div>

          <div>
            <strong>
              {stats.completed}
            </strong>
            <span>Completed</span>
          </div>
        </div>

      </div>

      {bookings.length === 0 ? (
        <div className="bookings-empty">
          <div className="empty-icon">
            📅
          </div>

          <h3>
            No bookings found
          </h3>

          <p>
            Customer service bookings will
            appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="bookings-table-wrapper">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Appointment</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>

                    <td>
                      <div className="booking-customer">
                        <div className="booking-avatar">
                          {(
                            booking.userName ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {booking.userName ||
                              "N/A"}
                          </strong>

                          <small>
                            {booking.userMobile ||
                              "N/A"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="booking-service">
                        <span className="service-icon">
                          ⚙️
                        </span>

                        <strong>
                          {booking.service ||
                            "N/A"}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div className="appointment-cell">
                        <strong>
                          {booking.date ||
                            "N/A"}
                        </strong>

                        <span>
                          🕐{" "}
                          {booking.time ||
                            "N/A"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong className="booking-total">
                        ₹
                        {booking.total ||
                          0}
                      </strong>
                    </td>

                    <td>
                      <select
                        className={`status-select payment ${getPaymentClass(
                          booking.paymentStatus
                        )}`}
                        value={
                          booking.paymentStatus ||
                          "Pending"
                        }
                        onChange={(e) =>
                          handlePaymentChange(
                            booking.id,
                            e.target.value
                          )
                        }
                      >
                        {paymentOptions.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td>
                      <select
                        className={`status-select work ${getStatusClass(
                          booking.status
                        )}`}
                        value={
                          booking.status ||
                          "Pending"
                        }
                        onChange={(e) =>
                          handleStatusChange(
                            booking.id,
                            e.target.value
                          )
                        }
                      >
                        {statusOptions.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td>
                      <button
                        className="view-booking-btn"
                        onClick={() =>
                          setSelectedBooking(
                            booking
                          )
                        }
                      >
                        View
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-bookings">

            {bookings.map((booking) => (
              <div
                className="mobile-booking-card"
                key={booking.id}
              >

                <div className="mobile-booking-top">
                  <div className="booking-customer">
                    <div className="booking-avatar">
                      {(
                        booking.userName ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {booking.userName ||
                          "N/A"}
                      </strong>

                      <small>
                        {booking.userMobile ||
                          "N/A"}
                      </small>
                    </div>
                  </div>

                  <span
                    className={`mobile-status ${getStatusClass(
                      booking.status
                    )}`}
                  >
                    {booking.status ||
                      "Pending"}
                  </span>
                </div>

                <div className="mobile-booking-service">
                  <span>
                    ⚙️
                  </span>

                  <div>
                    <small>
                      SERVICE
                    </small>

                    <strong>
                      {booking.service ||
                        "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="mobile-booking-info">

                  <div>
                    <span>
                      Appointment
                    </span>

                    <strong>
                      {booking.date ||
                        "N/A"}
                    </strong>

                    <small>
                      🕐{" "}
                      {booking.time ||
                        "N/A"}
                    </small>
                  </div>

                  <div>
                    <span>
                      Total
                    </span>

                    <strong className="mobile-total">
                      ₹
                      {booking.total ||
                        0}
                    </strong>

                    <small>
                      {booking.paymentStatus ||
                        "Pending"}
                    </small>
                  </div>

                </div>

                <div className="mobile-booking-actions">

                  <select
                    className={`status-select payment ${getPaymentClass(
                      booking.paymentStatus
                    )}`}
                    value={
                      booking.paymentStatus ||
                      "Pending"
                    }
                    onChange={(e) =>
                      handlePaymentChange(
                        booking.id,
                        e.target.value
                      )
                    }
                  >
                    {paymentOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    className="view-booking-btn"
                    onClick={() =>
                      setSelectedBooking(
                        booking
                      )
                    }
                  >
                    View Details
                  </button>

                </div>

              </div>
            ))}

          </div>
        </>
      )}

      {selectedBooking && (
        <div
          className="booking-modal-overlay"
          onClick={() =>
            setSelectedBooking(null)
          }
        >
          <div
            className="booking-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="booking-modal-header">

              <div className="modal-title-area">
                <div className="modal-booking-icon">
                  📅
                </div>

                <div>
                  <span>
                    BOOKING DETAILS
                  </span>

                  <h2>
                    {selectedBooking.service ||
                      "Service Booking"}
                  </h2>

                  <p>
                    Applied on{" "}
                    {formatAppliedOn(
                      selectedBooking.createdAt
                    )}
                  </p>
                </div>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedBooking(null)
                }
              >
                ×
              </button>

            </div>

            <div className="booking-modal-body">

              <div className="modal-info-grid">

                <div className="modal-info-card customer">
                  <div className="modal-card-title">
                    <span>
                      👤
                    </span>

                    <strong>
                      Customer Information
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Name
                    </span>

                    <strong>
                      {selectedBooking.userName ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Mobile
                    </span>

                    <strong>
                      {selectedBooking.userMobile ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Email
                    </span>

                    <strong className="break-text">
                      {selectedBooking.userEmail ||
                        "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="modal-info-card service">
                  <div className="modal-card-title">
                    <span>
                      ⚙️
                    </span>

                    <strong>
                      Service Information
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Service
                    </span>

                    <strong className="blue-text">
                      {selectedBooking.service ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Date
                    </span>

                    <strong>
                      {selectedBooking.date ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Time
                    </span>

                    <strong>
                      {selectedBooking.time ||
                        "N/A"}
                    </strong>
                  </div>
                </div>

              </div>

              <div className="form-details-card">

                <div className="modal-section-title">
                  <span>
                    📝
                  </span>

                  <div>
                    <strong>
                      Form Details
                    </strong>

                    <small>
                      Information entered by customer
                    </small>
                  </div>
                </div>

                {selectedBooking.customDetails &&
                Object.keys(
                  selectedBooking.customDetails
                ).length > 0 ? (
                  <div className="custom-details-grid">

                    {Object.entries(
                      selectedBooking.customDetails
                    ).map(
                      ([key, value]) => {
                        const displayValue =
                          typeof value ===
                          "object"
                            ? JSON.stringify(
                                value
                              )
                            : String(value);

                        return (
                          <div
                            className="custom-detail"
                            key={key}
                          >
                            <span>
                              {key}
                            </span>

                            <strong>
                              {displayValue ||
                                "Not Provided"}
                            </strong>
                          </div>
                        );
                      }
                    )}

                  </div>
                ) : (
                  <div className="no-details">
                    No additional form details
                    provided.
                  </div>
                )}

              </div>

              <div className="documents-card">

                <div className="modal-section-title">
                  <span>
                    📂
                  </span>

                  <div>
                    <strong>
                      Uploaded Documents
                    </strong>

                    <small>
                      Customer uploaded files
                    </small>
                  </div>
                </div>

                {selectedBooking.documents?.length >
                0 ? (
                  <div className="documents-list">

                    {selectedBooking.documents.map(
                      (document, index) => (
                        <a
                          key={index}
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="document-item"
                        >
                          <div className="document-icon">
                            {document.type?.includes(
                              "pdf"
                            )
                              ? "📄"
                              : "🖼️"}
                          </div>

                          <div>
                            <strong>
                              {document.name ||
                                `Document ${
                                  index + 1
                                }`}
                            </strong>

                            <span>
                              Open document →
                            </span>
                          </div>
                        </a>
                      )
                    )}

                  </div>
                ) : (
                  <div className="no-documents">
                    📂 No documents uploaded
                  </div>
                )}

              </div>

            </div>

            <div className="booking-modal-footer">

              <div className="price-summary">

                <span>
                  PAYMENT SUMMARY
                </span>

                <div>
                  Govt Fee{" "}
                  <strong>
                    ₹
                    {selectedBooking.govtFee ||
                      0}
                  </strong>
                </div>

                <div>
                  Service Fee{" "}
                  <strong>
                    ₹
                    {selectedBooking.serviceCharge ||
                      0}
                  </strong>
                </div>

                <h3>
                  ₹
                  {selectedBooking.total ||
                    0}
                </h3>

              </div>

              <div className="modal-controls">

                <div>
                  <label>
                    Payment
                  </label>

                  <select
                    className={`status-select payment ${getPaymentClass(
                      selectedBooking.paymentStatus
                    )}`}
                    value={
                      selectedBooking.paymentStatus ||
                      "Pending"
                    }
                    onChange={(e) =>
                      handlePaymentChange(
                        selectedBooking.id,
                        e.target.value
                      )
                    }
                  >
                    {paymentOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label>
                    Booking Status
                  </label>

                  <select
                    className={`status-select work ${getStatusClass(
                      selectedBooking.status
                    )}`}
                    value={
                      selectedBooking.status ||
                      "Pending"
                    }
                    onChange={(e) =>
                      handleStatusChange(
                        selectedBooking.id,
                        e.target.value
                      )
                    }
                  >
                    {statusOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      )
                    )}
                  </select>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}