import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";

// 🔥 Firebase Imports
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Layout/Public Components
import Header from "./components/Header";
import Navbar from "./components/Navbar"; 
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

// Private Dashboard Components
import UserProfile from "./components/UserProfile";
import ResumeBuilder from "./components/ResumeBuilder";
import BiodataBuilder from "./components/BiodataBuilder";
import AdminDashboard from "./components/admin/AdminDashboard";
import AgeCalculator from "./components/AgeCalculator";


// --- HELPERS ---
const Home = ({ authUser }) => (
  <>
    <div className="hero-wrapper">
      <Hero />
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
  </>
);

// Role Switcher Component
const RoleBasedDashboard = ({ userData }) => {
  if (!userData) return <div className="premium-loader-container"><span className="loader-text">Loading Profile...</span></div>;

  switch (userData.role) {
    case "admin":
      return <AdminDashboard />;
    case "staff":
    case "technician":
    case "user":
    default:
      return <UserProfile user={userData} />;
  }
};

// 🔥 Auth Wrapper to toggle between Login and Signup
const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <Login 
      onLoginSuccess={onLoginSuccess} 
      onSwitchToSignup={() => setIsLogin(false)} 
    />
  ) : (
    <Signup 
      onLoginSuccess={onLoginSuccess} 
      onSwitchToLogin={() => setIsLogin(true)} 
    />
  );
};

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData({ id: docSnap.id, ...docSnap.data() });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // Maintain local admin bypass if already set
        setAuthUser((prev) => (prev?.uid === "local_admin_bypass" ? prev : null));
        setUserData((prev) => (prev?.role === "admin" ? prev : null));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/"; // Simple redirect
  };

  // ✨ PREMIUM LOADER UI ✨
// ✨ PREMIUM LOADER UI ✨
  if (loading) {
    return (
      <div className="premium-loader-container">
        <div className="premium-loader">
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <div className="loader-dot"></div>
        </div>
        
        {/* 🔥 DUAL COLOR BRAND LOGO & MARATHI TEXT */}
        <div className="loader-text-wrapper">
          <div className="loader-brand">
            <span className="brand-blue">ऑनलाईन</span>
            <span className="brand-yellow">वाला</span>
          </div>
          <span className="loader-text">सुरू होत आहे...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        
        {/* Global Header */}
        <Header authUser={authUser} onLogout={handleLogout} />

        <Analytics />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home authUser={authUser} />} />
          <Route path="/spinwin" element={<Lucky user={authUser} />} />
          {/* 🔥 NEW PUBLIC ROUTES FOR BUILDERS */}
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/biodata-builder" element={<BiodataBuilder />} />
          <Route path="/age-calculator" element={<AgeCalculator />} />

          {/* Auth Route (Handles both Login and Signup now) */}
          <Route 
            path="/login" 
            element={
              !authUser ? (
                <AuthPage onLoginSuccess={(user) => {
                  if (user?.uid === "local_admin_bypass") {
                    setAuthUser(user);
                    setUserData({ role: "admin", name: "Super Admin" });
                  }
                  window.location.href = "/dashboard";
                }} />
              ) : (
                <Navigate to="/dashboard" />
              )
            } 
          />

          {/* Protected Dashboard Route */}
          <Route 
            path="/dashboard" 
            element={
              authUser ? (
                <RoleBasedDashboard userData={userData} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          {/* Fallback for 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}