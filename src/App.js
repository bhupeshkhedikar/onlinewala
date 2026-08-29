import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./App.css";

import { Analytics } from "@vercel/analytics/react";

// ======================================================
// FIREBASE
// ======================================================

import { auth, db } from "./firebase";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";


// ======================================================
// PUBLIC COMPONENTS
// ======================================================

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

import Footer from "./components/Footer";


// ======================================================
// USER / DASHBOARD COMPONENTS
// ======================================================

import UserProfile from "./components/UserProfile";
import ResumeBuilder from "./components/ResumeBuilder";
import BiodataBuilder from "./components/BiodataBuilder";
import AgeCalculator from "./components/AgeCalculator";

import InvoiceDashboard from "./components/admin/InvoiceDashboard";

import Referral from "./components/Referral";
import Wallet from "./components/Wallet";
import AddMoney from "./components/AddMoney";


// ======================================================
// ADMIN COMPONENTS
// ======================================================

import AdminDashboard from "./components/admin/AdminDashboard";
import AdminReferrals from "./components/admin/AdminReferrals";


// ======================================================
// HOME COMPONENT
// ======================================================

const Home = ({
  authUser,
  userData,
}) => {

  return (
    <>
      {/* ==================================================
          HERO SECTION
      ================================================== */}

      <div className="hero-wrapper">

        <Hero />


        {/* ==================================================
            USER REFERRAL

            Only logged-in users see referral section.
        ================================================== */}

        {authUser && (
          <Referral
            user={authUser}
          />
        )}


        {/* ==================================================
            USER WALLET

            Only logged-in users see wallet section.
        ================================================== */}

        {authUser && (
          <Wallet
            user={authUser}
          />
        )}


        {/* ==================================================
            BOOKING BAR
        ================================================== */}

        <BookingBar
          user={authUser}
        />

      </div>


      {/* ==================================================
          SERVICES
      ================================================== */}

      <ServicesIcons
        user={authUser}
      />


      {/* ==================================================
          JOB BANNER
      ================================================== */}

      <JobBanner />


      {/* ==================================================
          JOBS + LUCKY
      ================================================== */}

      <div className="main-grid">

        <Jobs />

        <Lucky
          user={authUser}
        />

      </div>


      {/* ==================================================
          PRIORITY
      ================================================== */}

      <PriorityGrid />

      <Priority />


      {/* ==================================================
          ANALYTICS
      ================================================== */}

      <Analytics />


      {/* ==================================================
          FOOTER
      ================================================== */}

      <Footer />

    </>
  );

};


// ======================================================
// ROLE BASED DASHBOARD
// ======================================================

const RoleBasedDashboard = ({
  userData,
}) => {

  /* =====================================================
     PROFILE LOADING
  ===================================================== */

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


  /* =====================================================
     ROLE SWITCH
  ===================================================== */

  switch (
    userData.role
  ) {

    /* ===================================================
       ADMIN
    =================================================== */

    case "admin":

      return (
        <AdminDashboard />
      );


    /* ===================================================
       STAFF
    =================================================== */

    case "staff":

      return (
        <UserProfile
          user={userData}
        />
      );


    /* ===================================================
       TECHNICIAN
    =================================================== */

    case "technician":

      return (
        <UserProfile
          user={userData}
        />
      );


    /* ===================================================
       USER
    =================================================== */

    case "user":

    default:

      return (
        <UserProfile
          user={userData}
        />
      );

  }

};


// ======================================================
// AUTH PAGE
// ======================================================

const AuthPage = ({
  onLoginSuccess,
}) => {

  const [
    isLogin,
    setIsLogin,
  ] = useState(true);


  /* =====================================================
     LOGIN
  ===================================================== */

  if (
    isLogin
  ) {

    return (

      <Login

        onLoginSuccess={
          onLoginSuccess
        }

        onSwitchToSignup={() =>
          setIsLogin(false)
        }

      />

    );

  }


  /* =====================================================
     SIGNUP
  ===================================================== */

  return (

    <Signup

      onLoginSuccess={
        onLoginSuccess
      }

      onSwitchToLogin={() =>
        setIsLogin(true)
      }

    />

  );

};


// ======================================================
// MAIN APP
// ======================================================

export default function App() {

  /* =====================================================
     AUTH USER
  ===================================================== */

  const [
    authUser,
    setAuthUser,
  ] = useState(null);


  /* =====================================================
     FIRESTORE USER DATA
  ===================================================== */

  const [
    userData,
    setUserData,
  ] = useState(null);


  /* =====================================================
     GLOBAL LOADING
  ===================================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);


  /* =====================================================
     LOAD USER PROFILE
  ===================================================== */

  const loadUserProfile =
    async (
      user
    ) => {

      if (
        !user
      ) {

        setUserData(
          null
        );

        return;

      }


      try {

        const userRef =
          doc(
            db,
            "users",
            user.uid
          );


        const userSnap =
          await getDoc(
            userRef
          );


        /* ===============================================
           FIRESTORE PROFILE EXISTS
        =============================================== */

        if (
          userSnap.exists()
        ) {

          setUserData({

            id:
              userSnap.id,

            uid:
              user.uid,

            ...userSnap.data(),

          });

        }


        /* ===============================================
           AUTH USER EXISTS BUT PROFILE DOES NOT
        =============================================== */

        else {

          setUserData({

            id:
              user.uid,

            uid:
              user.uid,

            email:
              user.email || "",

            name:
              user.displayName || "",

            role:
              "user",

          });

        }

      } catch (
        error
      ) {

        console.error(
          "Error loading user profile:",
          error
        );


        setUserData(
          null
        );

      }

    };


  /* =====================================================
     AUTH STATE LISTENER
  ===================================================== */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          user
        ) => {

          try {

            /* ===========================================
               LOGGED IN
            =========================================== */

            if (
              user
            ) {

              setAuthUser(
                user
              );


              await loadUserProfile(
                user
              );

            }


            /* ===========================================
               LOGGED OUT
            =========================================== */

            else {

              setAuthUser(
                null
              );

              setUserData(
                null
              );

            }

          } catch (
            error
          ) {

            console.error(
              "Auth state error:",
              error
            );

            setAuthUser(
              null
            );

            setUserData(
              null
            );

          } finally {

            setLoading(
              false
            );

          }

        }
      );


    return () => {

      unsubscribe();

    };

  }, []);


  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout =
    async () => {

      try {

        await signOut(
          auth
        );


        setAuthUser(
          null
        );

        setUserData(
          null
        );


        window.location.href =
          "/";

      } catch (
        error
      ) {

        console.error(
          "Logout error:",
          error
        );

      }

    };


  /* =====================================================
     LOGIN SUCCESS
  ===================================================== */

  const handleLoginSuccess =
    async (
      user
    ) => {

      if (
        !user ||
        !user.uid
      ) {

        return;

      }


      /*
       * Firebase Auth has already authenticated the user.
       *
       * Load profile and then redirect.
       */

      setAuthUser(
        user
      );


      await loadUserProfile(
        user
      );


      window.location.href =
        "/dashboard";

    };


  /* =====================================================
     SIGNUP SUCCESS
  ===================================================== */

  const handleSignupSuccess =
    async (
      user
    ) => {

      if (
        !user ||
        !user.uid
      ) {

        return;

      }


      setAuthUser(
        user
      );


      await loadUserProfile(
        user
      );


      window.location.href =
        "/dashboard";

    };


  /* =====================================================
     PREMIUM LOADER
  ===================================================== */

  if (
    loading
  ) {

    return (

      <div
        className="premium-loader-container"
      >

        <div
          className="premium-loader"
        >

          <div
            className="loader-ring"
          ></div>

          <div
            className="loader-ring"
          ></div>

          <div
            className="loader-dot"
          ></div>

        </div>


        <div
          className="loader-text-wrapper"
        >

          <div
            className="loader-brand"
          >

            <span
              className="brand-blue"
            >
              ऑनलाईन
            </span>

            <span
              className="brand-yellow"
            >
              वाला
            </span>

          </div>


          <span
            className="loader-text"
          >
            सुरू होत आहे...
          </span>

        </div>

      </div>

    );

  }


  /* =====================================================
     APP
  ===================================================== */

  return (

    <Router>

      <div className="app">

        {/* =================================================
            GLOBAL HEADER
        ================================================= */}

        <Header
          authUser={
            authUser
          }
          userData={
            userData
          }
          onLogout={
            handleLogout
          }
        />


        {/* =================================================
            ROUTES
        ================================================= */}

        <Routes>

          {/* =================================================
              HOME
          ================================================= */}

          <Route

            path="/"

            element={

              <Home

                authUser={
                  authUser
                }

                userData={
                  userData
                }

              />

            }

          />


          {/* =================================================
              SPIN
          ================================================= */}

          <Route

            path="/spin"

            element={

              <Lucky
                user={
                  authUser
                }
              />

            }

          />


          {/* =================================================
              INVOICE
          ================================================= */}

          <Route

            path="/invoice"

            element={

              <InvoiceDashboard
                user={
                  authUser
                }
              />

            }

          />


          {/* =================================================
              RESUME BUILDER
          ================================================= */}

          <Route

            path="/resume-builder"

            element={
              <ResumeBuilder />
            }

          />


          {/* =================================================
              BIODATA BUILDER
          ================================================= */}

          <Route

            path="/biodata-builder"

            element={
              <BiodataBuilder />
            }

          />


          {/* =================================================
              AGE CALCULATOR
          ================================================= */}

          <Route

            path="/age-calculator"

            element={
              <AgeCalculator />
            }

          />


          {/* =================================================
              LOGIN
          ================================================= */}

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

                  onLoginSuccess={
                    handleLoginSuccess
                  }

                  onSwitchToSignup={() => {

                    window.location.href =
                      "/signup";

                  }}

                />

              )

            }

          />


          {/* =================================================
              SIGNUP
          ================================================= */}

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

                  onLoginSuccess={
                    handleSignupSuccess
                  }

                  onSwitchToLogin={() => {

                    window.location.href =
                      "/login";

                  }}

                />

              )

            }

          />


          {/* =================================================
              USER DASHBOARD
          ================================================= */}

          <Route

            path="/dashboard"

            element={

              authUser ? (

                <RoleBasedDashboard

                  userData={
                    userData
                  }

                />

              ) : (

                <Navigate
                  to="/login"
                  replace
                />

              )

            }

          />


          {/* =================================================
              WALLET
          ================================================= */}

          <Route

            path="/wallet"

            element={

              authUser ? (

                <Wallet
                  user={
                    authUser
                  }
                />

              ) : (

                <Navigate
                  to="/login"
                  replace
                />

              )

            }

          />


          {/* =================================================
              ADD MONEY
          ================================================= */}

          <Route

            path="/wallet/add-money"

            element={

              authUser ? (

                <AddMoney
                  user={
                    authUser
                  }
                />

              ) : (

                <Navigate
                  to="/login"
                  replace
                />

              )

            }

          />


          {/* =================================================
              ADMIN REFERRALS
              
              ONLY ADMIN CAN ACCESS
          ================================================= */}

          <Route

            path="/admin/referrals"

            element={

              authUser &&
              userData?.role ===
                "admin" ? (

                <AdminReferrals />

              ) : (

                <Navigate
                  to="/login"
                  replace
                />

              )

            }

          />


          {/* =================================================
              FALLBACK
          ================================================= */}

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