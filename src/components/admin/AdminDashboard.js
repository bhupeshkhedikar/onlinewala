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
import "./Admin.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]); // 🔥 Added bookings state
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch both Users and Bookings simultaneously using Promise.all for speed
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "bookings"))
      ]);

      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setBookings(bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🔥 Perform heavy calculations in useMemo to prevent UI lag
  const stats = useMemo(() => {
    let totalIncome = 0;
    let todayIncome = 0;
    let pendingIncome = 0; // 🔥 Track pending payments
    let male = 0;
    let female = 0;
    let todayUsers = 0;
    const today = new Date().toDateString();

    // 1. Calculate Offline Users Data
    users.forEach(u => {
      if (u.gender === "male") male++;
      if (u.gender === "female") female++;

      const userCreatedDate = u.createdAt?.seconds 
        ? new Date(u.createdAt.seconds * 1000).toDateString() 
        : new Date(u.createdAt).toDateString();
        
      if (userCreatedDate === today) todayUsers++;

      u.applications?.forEach(app => {
        let mainServiceCharge = Number(app.serviceCharge) || 0;
        let extraServiceCharge = app.extraServices?.reduce((sum, extra) => sum + (Number(extra.serviceCharge) || 0), 0) || 0;
        let totalAppCharge = mainServiceCharge + extraServiceCharge;

        if (app.paid === true || app.paid === "true") {
          totalIncome += totalAppCharge;
          
          const appDateStr = app.date?.seconds 
            ? new Date(app.date.seconds * 1000).toDateString() 
            : new Date(app.date).toDateString();

          if (appDateStr === today) todayIncome += totalAppCharge;
        } else {
          // If not paid, add to pending
          pendingIncome += totalAppCharge;
        }
      });
    });

    // 2. Calculate Online Bookings Data 🔥
    bookings.forEach(b => {
      let bookingServiceCharge = Number(b.serviceCharge) || 0;

      if (b.paymentStatus === "Paid") {
        totalIncome += bookingServiceCharge;
        
        // Track Today's Online Income (Fallback to 'date' string if createdAt timestamp is missing)
        const bookingDateStr = b.createdAt?.seconds 
          ? new Date(b.createdAt.seconds * 1000).toDateString() 
          : new Date(b.date).toDateString();

        if (bookingDateStr === today) todayIncome += bookingServiceCharge;
      } else {
        // If not paid, add to pending
        pendingIncome += bookingServiceCharge;
      }
    });

    return { totalIncome, todayIncome, pendingIncome, totalUsers: users.length, todayUsers, male, female };
  }, [users, bookings]); // 🔥 Re-run math if users OR bookings change

  if (loading) return <div className="loading-screen">Loading Admin Panel...</div>;

  return (
    <div className="admin">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <button 
          className="add-user-btn" 
          onClick={() => setShowAddUser(true)}
           style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' ,margin: '10px'}} /* 🔥 Matched button to Logo Blue */
        >
          + Add User
        </button>
      </div>

      <div className="stats">
        {/* 🔥 Income Cards styling matched with Logo Colors */}
        <div className="card" style={{ borderLeft: '4px solid #005ce6' }}> {/* Logo Blue */}
          ₹ {stats.todayIncome}<p>Today Income</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #005ce6' }}> {/* Logo Blue */}
          ₹ {stats.totalIncome}<p>Total Paid Income</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #ff8c00' }}> {/* Logo Orange */}
          ₹ {stats.pendingIncome}<p>Pending Payments</p>
        </div>
        
        {/* User Cards */}
        <div className="card" style={{ borderLeft: '4px solid #ff8c00' }}>{stats.totalUsers}<p>Total Users</p></div> {/* Logo Orange */}
        <div className="card" style={{ borderLeft: '4px solid #005ce6' }}>{stats.todayUsers}<p>Today Users</p></div> {/* Logo Blue */}
        <div className="card" style={{ borderLeft: '4px solid #ff8c00' }}>{stats.male}/{stats.female}<p>M/F Ratio</p></div> {/* Logo Orange */}
      </div>

      {/* 🔥 Pass BOTH users and bookings to the Charts component we updated earlier */}
      <Charts users={users} bookings={bookings} />
      
      <AdminServices />
      <AdminBookings />
  <AllWinningsAdmin/>
  <AdminJobs/>
  <AdminPriorityGrid/>
  <AdminHero/>
      <UserManager users={users} refresh={fetchData} />

      {showAddUser && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create User</h3>
            <AddUser onSuccess={() => { setShowAddUser(false); fetchData(); }} />
            <button className="close-btn" onClick={() => setShowAddUser(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}