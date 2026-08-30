import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import "./App.css";

import Header from "./components/Header";
import Hero from "./components/Hero";
import BookingBar from "./components/BookingBar";
import ServicesIcons from "./components/ServicesIcons";
import JobBanner from "./components/JobBanner";
import Jobs from "./components/Jobs";
import Lucky from "./components/Lucky";
import PriorityGrid from "./components/PriorityGrid";
import Priority from "./components/Priority";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Footer from "./components/Footer";
import UserProfile from "./components/UserProfile";
import ResumeBuilder from "./components/ResumeBuilder";
import BiodataBuilder from "./components/BiodataBuilder";
import AgeCalculator from "./components/AgeCalculator";
import Referral from "./components/Referral";
import Wallet from "./components/Wallet";
import AddMoney from "./components/AddMoney";
import QuickWalletReferral from "./components/QuickWalletReferral";
import InvoiceDashboard from "./components/admin/InvoiceDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminReferrals from "./components/admin/AdminReferrals";
import AdminWithdrawals from "./components/admin/AdminWithdrawals";
import MobileMenu from "./components/MobileMenu";

const Home = ({ authUser, userData }) => (
  <>
    <div className="hero-wrapper">
     
      <Hero />
      <QuickWalletReferral
        user={authUser ? (userData || authUser) : null}
      />

      <BookingBar user={authUser} />
    </div>

    <ServicesIcons user={authUser} />
    <JobBanner />

    <div className="main-grid">
      <Jobs />
      <Lucky user={authUser} />
    </div>

    <PriorityGrid />
    <Priority />
    <Analytics />
    <Footer />
  </>
);

const RoleBasedDashboard = ({ userData }) => {
  if (!userData) {
    return (
      <div className="premium-loader-container">
        <div className="premium-loader">
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>

        <div className="loader-text">
          Loading Profile...
        </div>
      </div>
    );
  }

  return userData.role === "admin" ? (
    <AdminDashboard />
  ) : (
    <UserProfile user={userData} />
  );
};

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (user) => {
    if (!user) {
      setUserData(null);
      return;
    }

    try {
      const userDoc = await getDoc(
        doc(db, "users", user.uid)
      );

      if (userDoc.exists()) {
        setUserData({
          id: userDoc.id,
          uid: user.uid,
          ...userDoc.data()
        });
      } else {
        setUserData({
          id: user.uid,
          uid: user.uid,
          email: user.email || "",
          name: user.displayName || "",
          role: "user"
        });
      }
    } catch (error) {
      console.error(
        "Error loading user profile:",
        error
      );

      setUserData(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        try {
          setAuthUser(user || null);
          await loadUserProfile(user);
        } catch (error) {
          console.error(
            "Auth state error:",
            error
          );

          setAuthUser(null);
          setUserData(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setAuthUser(null);
      setUserData(null);

      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAuthSuccess = async (user) => {
    if (!user?.uid) return;

    setAuthUser(user);

    await loadUserProfile(user);

    window.location.href = "/dashboard";
  };

  if (loading) {
    return (
      <div className="premium-loader-container">
        <div className="premium-loader">
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>

        <div className="loader-text-wrapper">
          <div className="loader-brand">
            <span className="brand-blue">
              ऑनलाईन
            </span>

            <span className="brand-yellow">
              वाला
            </span>
          </div>

          <span className="loader-text">
            सुरू होत आहे...
          </span>
        </div>
      </div>
    );
  }

  return (
  <Router>
  <div className="app">
    <Header
      authUser={authUser}
      userData={userData}
      onLogout={handleLogout}
    />
   <MobileMenu authUser={authUser} />
    <Routes>
      <Route
        path="/"
        element={
          <Home
            authUser={authUser}
            userData={userData}
          />
        }
      />

      <Route
        path="/spin"
        element={<Lucky user={authUser} />}
      />

      <Route
        path="/invoice"
        element={
          <InvoiceDashboard user={authUser} />
        }
      />

      <Route
        path="/resume-builder"
        element={<ResumeBuilder />}
      />

      <Route
        path="/biodata-builder"
        element={<BiodataBuilder />}
      />

      <Route
        path="/age-calculator"
        element={<AgeCalculator />}
      />

      <Route
        path="/login"
        element={
          authUser ? (
            <Navigate
              to="/dashboard"
              replace
            />
          ) : (
            <Login
              onLoginSuccess={handleAuthSuccess}
              onSwitchToSignup={() =>
                (window.location.href = "/signup")
              }
            />
          )
        }
      />

      <Route
        path="/signup"
        element={
          authUser ? (
            <Navigate
              to="/dashboard"
              replace
            />
          ) : (
            <Signup
              onLoginSuccess={handleAuthSuccess}
              onSwitchToLogin={() =>
                (window.location.href = "/login")
              }
            />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          authUser ? (
            <RoleBasedDashboard
              userData={userData}
            />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="/referral"
        element={
          authUser ? (
            <Referral user={authUser} />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="/wallet"
        element={
          authUser ? (
            <Wallet user={authUser} />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="/wallet/add-money"
        element={
          authUser ? (
            <AddMoney user={authUser} />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="/admin/referrals"
        element={
          authUser &&
          userData?.role === "admin" ? (
            <AdminReferrals />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="/admin/withdrawals"
        element={
          authUser &&
          userData?.role === "admin" ? (
            <AdminWithdrawals />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  </div>
</Router>
  );
}