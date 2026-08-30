import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import UserManager from "./UserManager";
import Charts from "./Charts";
import AddUser from "./AddUser";
import AdminBookings from "./AdminBookings";
import AdminServices from "./AdminServices";
import AllWinningsAdmin from "./AllWinningsAdmin";
import AdminJobs from "./AdminJobs";
import AdminPriorityGrid from "./AdminPriorityGrid";
import AdminHero from "./AdminHero";
import AdminWithdrawals from "./AdminWithdrawals";
import AdminReferrals from "./AdminReferrals";
import "./Admin.css";
import AdminInvoiceDashboard from "./InvoiceDashboard";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [usersSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "bookings"))
      ]);

      setUsers(
        usersSnap.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }))
      );

      setBookings(
        bookingsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }))
      );
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let todayIncome = 0;
    let pendingIncome = 0;
    let male = 0;
    let female = 0;
    let todayUsers = 0;

    const today = new Date().toDateString();

    users.forEach((u) => {
      if (u.gender === "male") male++;
      if (u.gender === "female") female++;

      let userCreatedDate = "";

      if (u.createdAt?.seconds) {
        userCreatedDate = new Date(
          u.createdAt.seconds * 1000
        ).toDateString();
      } else if (u.createdAt) {
        userCreatedDate = new Date(
          u.createdAt
        ).toDateString();
      }

      if (userCreatedDate === today) {
        todayUsers++;
      }

      if (Array.isArray(u.applications)) {
        u.applications.forEach((app) => {
          const mainServiceCharge =
            Number(app.serviceCharge) || 0;

          const extraServiceCharge =
            Array.isArray(app.extraServices)
              ? app.extraServices.reduce(
                  (sum, extra) =>
                    sum +
                    (Number(extra.serviceCharge) || 0),
                  0
                )
              : 0;

          const totalAppCharge =
            mainServiceCharge +
            extraServiceCharge;

          if (
            app.paid === true ||
            app.paid === "true"
          ) {
            totalIncome += totalAppCharge;

            let appDateStr = "";

            if (app.date?.seconds) {
              appDateStr = new Date(
                app.date.seconds * 1000
              ).toDateString();
            } else if (app.date) {
              appDateStr = new Date(
                app.date
              ).toDateString();
            }

            if (appDateStr === today) {
              todayIncome += totalAppCharge;
            }
          } else {
            pendingIncome += totalAppCharge;
          }
        });
      }
    });

    bookings.forEach((booking) => {
      const bookingServiceCharge =
        Number(booking.serviceCharge) || 0;

      if (booking.paymentStatus === "Paid") {
        totalIncome += bookingServiceCharge;

        let bookingDateStr = "";

        if (booking.createdAt?.seconds) {
          bookingDateStr = new Date(
            booking.createdAt.seconds * 1000
          ).toDateString();
        } else if (booking.date) {
          bookingDateStr = new Date(
            booking.date
          ).toDateString();
        }

        if (bookingDateStr === today) {
          todayIncome += bookingServiceCharge;
        }
      } else {
        pendingIncome += bookingServiceCharge;
      }
    });

    return {
      totalIncome,
      todayIncome,
      pendingIncome,
      totalUsers: users.length,
      todayUsers,
      male,
      female
    };
  }, [users, bookings]);

const menuItems = [
    {
    id: "users",
    icon: "👥",
    label: "Users"
  },
    {
    id: "invoices",
    icon: "🧾",
    label: "Invoices"
  },
  {
    id: "dashboard",
    icon: "📊",
    label: "Dashboard"
  },
  {
    id: "services",
    icon: "🛠️",
    label: "Services"
  },
  {
    id: "bookings",
    icon: "📋",
    label: "Bookings"
  },
  {
    id: "withdrawals",
    icon: "💸",
    label: "Withdrawals"
  },
  {
    id: "referrals",
    icon: "🤝",
    label: "Referrals"
  },
  {
    id: "winnings",
    icon: "🏆",
    label: "Winnings"
  },
  {
    id: "jobs",
    icon: "💼",
    label: "Jobs"
  },
  {
    id: "priority",
    icon: "⭐",
    label: "Priority"
  },
  {
    id: "hero",
    icon: "🖼️",
    label: "Hero"
  },

];

  const handleMenuClick = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);

    setTimeout(() => {
      const element = document.getElementById(
        `admin-${section}`
      );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 50);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="admin-loading-spinner"></div>
        <span>Loading Admin Panel...</span>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div
        className={`admin-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span className="admin-logo-blue">
              ONLINE
            </span>
            <span className="admin-logo-orange">
              WALAA
            </span>
          </div>

          <button
            className="sidebar-close"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            ×
          </button>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">
            A
          </div>

          <div>
            <strong>Super Admin</strong>
            <span>Administrator</span>
          </div>
        </div>

        <div className="admin-menu-title">
          MAIN MENU
        </div>

        <nav className="admin-sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`admin-menu-item ${
                activeSection === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleMenuClick(item.id)
              }
            >
              <span className="admin-menu-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>

              {item.id === "withdrawals" && (
                <span className="withdraw-menu-dot">
                  $
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-status">
            <span></span>
            System Online
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="mobile-menu-btn"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            ☰
          </button>

          <div className="admin-topbar-title">
            <span>ADMIN PANEL</span>
            <h1>
              {menuItems.find(
                (item) =>
                  item.id === activeSection
              )?.label || "Dashboard"}
            </h1>
          </div>

          <button
            className="admin-refresh-btn"
            onClick={fetchData}
            title="Refresh dashboard"
          >
            ↻
          </button>
        </header>

        <div className="admin">
          <section
            id="admin-dashboard"
            className="admin-section"
          >
            <div className="admin-header">
              <div>
                <span className="admin-section-label">
                  OVERVIEW
                </span>
                <h2>Admin Dashboard</h2>
              </div>

              <button
                className="add-user-btn"
                onClick={() =>
                  setShowAddUser(true)
                }
              >
                + Add User
              </button>
            </div>

            <div className="stats">
              <div
                className="card income-card"
                style={{
                  borderLeft:
                    "4px solid #005ce6"
                }}
              >
                <strong>
                  ₹{" "}
                  {stats.todayIncome.toLocaleString(
                    "en-IN"
                  )}
                </strong>
                <p>Today Income</p>
              </div>

              <div
                className="card income-card"
                style={{
                  borderLeft:
                    "4px solid #005ce6"
                }}
              >
                <strong>
                  ₹{" "}
                  {stats.totalIncome.toLocaleString(
                    "en-IN"
                  )}
                </strong>
                <p>Total Paid Income</p>
              </div>

              <div
                className="card pending-income-card"
                style={{
                  borderLeft:
                    "4px solid #ff8c00"
                }}
              >
                <strong>
                  ₹{" "}
                  {stats.pendingIncome.toLocaleString(
                    "en-IN"
                  )}
                </strong>
                <p>Pending Payments</p>
              </div>

              <div
                className="card users-card"
                style={{
                  borderLeft:
                    "4px solid #ff8c00"
                }}
              >
                <strong>
                  {stats.totalUsers}
                </strong>
                <p>Total Users</p>
              </div>

              <div
                className="card users-card"
                style={{
                  borderLeft:
                    "4px solid #005ce6"
                }}
              >
                <strong>
                  {stats.todayUsers}
                </strong>
                <p>Today Users</p>
              </div>

              <div
                className="card users-card"
                style={{
                  borderLeft:
                    "4px solid #ff8c00"
                }}
              >
                <strong>
                  {stats.male}/{stats.female}
                </strong>
                <p>M/F Ratio</p>
              </div>
            </div>

            <Charts
              users={users}
              bookings={bookings}
            />
          </section>

          <section
  id="admin-invoices"
  className="admin-section invoice-admin-section"
>
  <div className="admin-module-header invoice-header">
    <div>
      <span>FINANCE MANAGEMENT</span>
      <h2>Invoices</h2>
      <p>
        Create, view, download and manage customer invoices.
      </p>
    </div>

    <div className="invoice-header-icon">
      🧾
    </div>
  </div>

  <AdminInvoiceDashboard />
</section>

          <section
            id="admin-services"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>MANAGEMENT</span>
                <h2>Services</h2>
              </div>
            </div>

            <AdminServices />
          </section>

          <section
            id="admin-bookings"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>MANAGEMENT</span>
                <h2>Bookings</h2>
              </div>
            </div>

            <AdminBookings />
          </section>

          <section
            id="admin-withdrawals"
            className="admin-section withdrawal-admin-section"
          >
            <div className="admin-module-header withdrawal-header">
              <div>
                <span>WALLET MANAGEMENT</span>
                <h2>Withdrawal Requests</h2>
                <p>
                  Review, approve, reject and manage
                  user withdrawal requests.
                </p>
              </div>

              <div className="withdrawal-header-icon">
                💸
              </div>
            </div>

            <AdminWithdrawals />
          </section>
<section
  id="admin-referrals"
  className="admin-section referral-admin-section"
>
  <div className="admin-module-header referral-header">
    <div>
      <span>REFERRAL MANAGEMENT</span>
      <h2>Referral Requests</h2>
      <p>
        Review, approve and manage user referral rewards.
      </p>
    </div>

    <div className="referral-header-icon">
      🤝
    </div>
  </div>

  <AdminReferrals />
</section>
          <section
            id="admin-winnings"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>LUCKY DRAW</span>
                <h2>Winnings</h2>
              </div>
            </div>

            <AllWinningsAdmin />
          </section>

          <section
            id="admin-jobs"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>EMPLOYMENT</span>
                <h2>Jobs</h2>
              </div>
            </div>

            <AdminJobs />
          </section>

          <section
            id="admin-priority"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>HOMEPAGE</span>
                <h2>Priority Grid</h2>
              </div>
            </div>

            <AdminPriorityGrid />
          </section>

          <section
            id="admin-hero"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>HOMEPAGE</span>
                <h2>Hero Section</h2>
              </div>
            </div>

            <AdminHero />
          </section>

          <section
            id="admin-users"
            className="admin-section"
          >
            <div className="admin-module-header">
              <div>
                <span>USER MANAGEMENT</span>
                <h2>Users</h2>
              </div>

              <button
                className="add-user-btn"
                onClick={() =>
                  setShowAddUser(true)
                }
              >
                + Add User
              </button>
            </div>

            <UserManager
              users={users}
              refresh={fetchData}
            />
          </section>
        </div>
      </main>

   <div className="admin-mobile-nav">
  <button
    className={
      activeSection === "dashboard"
        ? "active"
        : ""
    }
    onClick={() =>
      handleMenuClick("dashboard")
    }
  >
    <span>📊</span>
    <small>Home</small>
  </button>

  <button
    className={
      activeSection === "bookings"
        ? "active"
        : ""
    }
    onClick={() =>
      handleMenuClick("bookings")
    }
  >
    <span>📋</span>
    <small>Bookings</small>
  </button>

  <button
  className={
    activeSection === "invoices"
      ? "active"
      : ""
  }
  onClick={() => handleMenuClick("invoices")}
>
  <span>🧾</span>
  <small>Invoices</small>
</button>

  <button
    className={
      activeSection === "withdrawals"
        ? "active"
        : ""
    }
    onClick={() =>
      handleMenuClick("withdrawals")
    }
  >
    <span>💸</span>
    <small>Withdraw</small>
  </button>

  <button
    className={
      activeSection === "referrals"
        ? "active"
        : ""
    }
    onClick={() =>
      handleMenuClick("referrals")
    }
  >
    <span>🤝</span>
    <small>Referral</small>
  </button>

  <button
    onClick={() =>
      setSidebarOpen(true)
    }
  >
    <span>☰</span>
    <small>More</small>
  </button>
</div>

 {showAddUser && (
  <div
    onClick={() => setShowAddUser(false)}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      padding: "15px",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(15,23,42,0.68)",
      backdropFilter: "blur(5px)",
      WebkitBackdropFilter: "blur(5px)"
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: "480px",
        maxHeight: "92vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: "18px",
        boxShadow: "0 25px 70px rgba(15,23,42,0.25)",
        animation: "userModalIn .2s ease-out"
      }}
    >
      <div
        style={{
          minHeight: "68px",
          padding: "13px 15px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          background: "linear-gradient(135deg,#f8fbff,#fff)",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            minWidth: 0
          }}
        >
          <div
            style={{
              width: "39px",
              height: "39px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "11px",
              background:
                "linear-gradient(135deg,#eff6ff,#dbeafe)",
              border: "1px solid #bfdbfe",
              fontSize: "17px"
            }}
          >
            👤
          </div>

          <div>
            <span
              style={{
                display: "block",
                marginBottom: "2px",
                color: "#005ce6",
                fontSize: "6px",
                fontWeight: 900,
                letterSpacing: "1px"
              }}
            >
              USER MANAGEMENT
            </span>

            <h3
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "15px",
                lineHeight: 1.2,
                fontWeight: 900
              }}
            >
              Create User
            </h3>

            <p
              style={{
                margin: "3px 0 0",
                color: "#94a3b8",
                fontSize: "7px"
              }}
            >
              Add a new user to your system
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddUser(false)}
          style={{
            width: "29px",
            height: "29px",
            flexShrink: 0,
            border: "none",
            borderRadius: "9px",
            background: "#f1f5f9",
            color: "#475569",
            fontSize: "18px",
            lineHeight: 1,
            cursor: "pointer"
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: "14px 15px 5px",
          boxSizing: "border-box"
        }}
      >
        <AddUser
          onSuccess={() => {
            setShowAddUser(false);
            fetchData();
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "9px 15px 13px",
          borderTop: "1px solid #eef2f7",
          background: "#fcfdff"
        }}
      >
        <button
          type="button"
          onClick={() => setShowAddUser(false)}
          style={{
            minWidth: "72px",
            height: "30px",
            padding: "0 10px",
            border: "none",
            borderRadius: "8px",
            background: "#f1f5f9",
            color: "#475569",
            fontSize: "7px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}