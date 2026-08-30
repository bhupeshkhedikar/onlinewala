import { useEffect, useState } from "react";
import { db, app } from "../firebase";

import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import "./AdminReferrals.css";


/* =========================================================
   FIREBASE FUNCTIONS
========================================================= */

const functions =
  getFunctions(
    app,
    "asia-south1"
  );


const approveReferralFunction =
  httpsCallable(
    functions,
    "adminApproveReferral"
  );


const rejectReferralFunction =
  httpsCallable(
    functions,
    "adminRejectReferral"
  );


export default function AdminReferrals() {

  /* =========================================================
     STATES
  ========================================================= */

  const [referrals, setReferrals] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState(null);

  const [filter, setFilter] =
    useState("pending");

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");


  /* =========================================================
     LOAD REFERRALS
  ========================================================= */

  useEffect(() => {

    loadReferrals();

  }, []);


  /* =========================================================
     FETCH REFERRALS
  ========================================================= */

  const loadReferrals =
    async () => {

      try {

        setLoading(true);

        setError("");


        const referralQuery =
          query(
            collection(
              db,
              "referrals"
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          );


        const snapshot =
          await getDocs(
            referralQuery
          );


        const referralList = [];


        /* =====================================================
           LOAD REFERRAL + USER DETAILS
        ===================================================== */

        for (
          const referralDoc
          of snapshot.docs
        ) {

          const referral =
            referralDoc.data();


          let referrerData = {};

          let referredUserData = {};


          /* =================================================
             REFERRER
          ================================================= */

          if (
            referral.referrerId
          ) {

            try {

              const referrerSnap =
                await getDoc(
                  doc(
                    db,
                    "users",
                    referral.referrerId
                  )
                );


              if (
                referrerSnap.exists()
              ) {

                referrerData =
                  referrerSnap.data();

              }

            } catch (err) {

              console.warn(
                "Referrer fetch error:",
                err
              );

            }

          }


          /* =================================================
             REFERRED USER
          ================================================= */

          if (
            referral.referredUserId
          ) {

            try {

              const referredSnap =
                await getDoc(
                  doc(
                    db,
                    "users",
                    referral.referredUserId
                  )
                );


              if (
                referredSnap.exists()
              ) {

                referredUserData =
                  referredSnap.data();

              }

            } catch (err) {

              console.warn(
                "Referred user fetch error:",
                err
              );

            }

          }


          /* =================================================
             PUSH COMPLETE RECORD
          ================================================= */

          referralList.push({

            id:
              referralDoc.id,

            ...referral,


            referrerName:
              referrerData.name ||
              "Unknown User",

            referrerEmail:
              referrerData.email ||
              "—",

            referrerMobile:
              referrerData.mobile ||
              "—",


            referredUserName:
              referredUserData.name ||
              "Unknown User",

            referredUserEmail:
              referredUserData.email ||
              "—",

            referredUserMobile:
              referredUserData.mobile ||
              "—",

          });

        }


        setReferrals(
          referralList
        );


      } catch (err) {

        console.error(
          "Referral loading error:",
          err
        );


        setError(
          "Referral data load करताना error आला."
        );


      } finally {

        setLoading(false);

      }

    };


  /* =========================================================
     CONFIRM / APPROVE REFERRAL

     IMPORTANT:
     Wallet is NOT updated from browser.

     Cloud Function handles:
     - Admin authentication
     - Referral validation
     - Referrer validation
     - Pending → Available movement
     - Wallet transaction
     - Referral confirmation
     - Duplicate protection
  ========================================================= */

  const confirmReferral =
    async (
      referral
    ) => {

      try {

        setProcessingId(
          referral.id
        );

        setSuccessMessage("");

        setError("");


        /* =====================================================
           FRONTEND DOUBLE CONFIRMATION PROTECTION
        ===================================================== */

        if (
          referral.status !==
          "pending"
        ) {

          setError(
            "हा referral आधीच process झाला आहे."
          );

          return;

        }


        /* =====================================================
           VALIDATE REFERRER
        ===================================================== */

        if (
          !referral.referrerId
        ) {

          setError(
            "Referral referrer information missing आहे."
          );

          return;

        }


        /* =====================================================
           VALIDATE REWARD
        ===================================================== */

        const rewardAmount =
          Number(
            referral.rewardAmount ||
            0
          );


        if (
          !Number.isFinite(
            rewardAmount
          ) ||
          rewardAmount < 10 ||
          rewardAmount > 100
        ) {

          setError(
            "Invalid referral reward amount."
          );

          return;

        }


        /* =====================================================
           ADMIN CONFIRMATION
        ===================================================== */

        const confirmed =
          window.confirm(

            `Referral approve करायचा आहे का?\n\n` +

            `Referrer: ${
              referral.referrerName ||
              "Unknown User"
            }\n` +

            `Referred User: ${
              referral.referredUserName ||
              "Unknown User"
            }\n` +

            `Reward: ₹${rewardAmount}\n\n` +

            `फक्त referrer ला reward मिळेल. Referred user ला ₹0 मिळेल.`

          );


        if (
          !confirmed
        ) {

          return;

        }


        /* =====================================================
           CALL SECURE CLOUD FUNCTION
        ===================================================== */

        const result =
          await approveReferralFunction({

            referralId:
              referral.id,

          });


        const data =
          result?.data;


        /* =====================================================
           FUNCTION RESPONSE CHECK
        ===================================================== */

        if (
          !data ||
          !data.success
        ) {

          throw new Error(
            data?.message ||
            "Referral approve करण्यात error आला."
          );

        }


        /* =====================================================
           SUCCESS MESSAGE
        ===================================================== */

        if (
          data.alreadyProcessed
        ) {

          setSuccessMessage(
            `हा referral आधीच approve झाला आहे. ₹${data.amount || rewardAmount} available आहे.`
          );

        } else {

          setSuccessMessage(
            `₹${data.amount || rewardAmount} referral reward successfully approved.`
          );

        }


        /* =====================================================
           RELOAD
        ===================================================== */

        await loadReferrals();


      } catch (err) {

        console.error(
          "Confirm referral error:",
          err
        );


        let message =
          "Referral confirm करताना error आला.";


        /* =====================================================
           FIREBASE FUNCTION ERROR
        ===================================================== */

        if (
          err?.code ===
          "functions/unauthenticated"
        ) {

          message =
            "Admin authentication required. कृपया admin account से login करें.";

        } else if (
          err?.code ===
          "functions/permission-denied"
        ) {

          message =
            "आपको referral approve करने की permission नहीं है.";

        } else if (
          err?.code ===
          "functions/not-found"
        ) {

          message =
            "Referral या referrer user नहीं मिला.";

        } else if (
          err?.code ===
          "functions/failed-precondition"
        ) {

          message =
            err?.message ||
            "Referral इस status में approve नहीं किया जा सकता.";

        } else if (
          err?.message
        ) {

          message =
            err.message;

        }


        setError(
          message
        );


      } finally {

        setProcessingId(
          null
        );

      }

    };


  /* =========================================================
     REJECT REFERRAL

     IMPORTANT:
     Rejection also goes through Cloud Function.

     Browser directly wallet amount remove नहीं करेगा.
  ========================================================= */

  const rejectReferral =
    async (
      referral
    ) => {

      try {

        setProcessingId(
          referral.id
        );

        setSuccessMessage("");

        setError("");


        /* =====================================================
           ONLY PENDING REFERRAL
        ===================================================== */

        if (
          referral.status !==
          "pending"
        ) {

          setError(
            "हा referral आधीच process झाला आहे."
          );

          return;

        }


        /* =====================================================
           CONFIRM
        ===================================================== */

        const confirmed =
          window.confirm(

            `क्या आप यह referral reject करना चाहते हैं?\n\n` +

            `Referrer: ${
              referral.referrerName ||
              "Unknown User"
            }\n` +

            `Referred User: ${
              referral.referredUserName ||
              "Unknown User"
            }\n` +

            `Reward: ₹${
              referral.rewardAmount ||
              0
            }\n\n` +

            `इससे reward release नहीं होगा.`

          );


        if (
          !confirmed
        ) {

          return;

        }


        /* =====================================================
           CALL CLOUD FUNCTION
        ===================================================== */

        const result =
          await rejectReferralFunction({

            referralId:
              referral.id,

            reason:
              "Referral rejected by admin.",

          });


        const data =
          result?.data;


        /* =====================================================
           RESPONSE
        ===================================================== */

        if (
          !data ||
          !data.success
        ) {

          throw new Error(
            data?.message ||
            "Referral reject करण्यात error आला."
          );

        }


        /* =====================================================
           SUCCESS
        ===================================================== */

        setSuccessMessage(
          "Referral successfully rejected. Reward release नहीं किया गया."
        );


        /* =====================================================
           RELOAD
        ===================================================== */

        await loadReferrals();


      } catch (err) {

        console.error(
          "Reject referral error:",
          err
        );


        let message =
          "Referral reject करताना error आला.";


        if (
          err?.code ===
          "functions/unauthenticated"
        ) {

          message =
            "Admin authentication required. कृपया admin account से login करें.";

        } else if (
          err?.code ===
          "functions/permission-denied"
        ) {

          message =
            "आपको referral reject करने की permission नहीं है.";

        } else if (
          err?.code ===
          "functions/not-found"
        ) {

          message =
            "Referral या referrer user नहीं मिला.";

        } else if (
          err?.code ===
          "functions/failed-precondition"
        ) {

          message =
            err?.message ||
            "Referral इस status में reject नहीं किया जा सकता.";

        } else if (
          err?.message
        ) {

          message =
            err.message;

        }


        setError(
          message
        );


      } finally {

        setProcessingId(
          null
        );

      }

    };


  /* =========================================================
     MARK SERVICE BOOKED

     This ONLY marks service booking status.

     It does NOT release referral reward.

     Admin must still click:
     Confirm Referral
  ========================================================= */

  const markServiceBooked =
    async (
      referral
    ) => {

      try {

        setProcessingId(
          referral.id
        );

        setSuccessMessage("");

        setError("");


        /* =====================================================
           ONLY PENDING REFERRAL
        ===================================================== */

        if (
          referral.status !==
          "pending"
        ) {

          setError(
            "हा referral आधीच process झाला आहे."
          );

          return;

        }


        /* =====================================================
           CONFIRM SERVICE BOOKING
        ===================================================== */

        const confirmed =
          window.confirm(

            `क्या ${
              referral.referredUserName ||
              "इस user"
            } ने OnlineWalaa से service book की है?\n\n` +

            `Service: ${
              referral.serviceName ||
              "Not specified"
            }\n\n` +

            `इसके बाद भी reward release करने के लिए "Confirm Referral" दबाना होगा.`

          );


        if (
          !confirmed
        ) {

          return;

        }


        /* =====================================================
           REFERRAL REFERENCE
        ===================================================== */

        const referralRef =
          doc(
            db,
            "referrals",
            referral.id
          );


        /* =====================================================
           UPDATE ONLY SERVICE STATUS
        ===================================================== */

        await updateDoc(
          referralRef,
          {

            serviceBooked:
              true,

            serviceBookedAt:
              serverTimestamp(),

          }
        );


        setSuccessMessage(
          "Service booked status updated. अब referral को manually confirm करें."
        );


        /* =====================================================
           RELOAD
        ===================================================== */

        await loadReferrals();


      } catch (err) {

        console.error(
          "Mark service booked error:",
          err
        );


        setError(
          err?.message ||
          "Service status update नहीं हो पाया."
        );


      } finally {

        setProcessingId(
          null
        );

      }

    };


  /* =========================================================
     FILTER
  ========================================================= */

  const filteredReferrals =
    referrals.filter(
      (
        referral
      ) => {

        /* ===================================================
           STATUS FILTER
        =================================================== */

        if (
          filter !==
            "all" &&
          referral.status !==
            filter
        ) {

          return false;

        }


        /* ===================================================
           SEARCH
        =================================================== */

        const searchText =
          search
            .toLowerCase()
            .trim();


        if (
          !searchText
        ) {

          return true;

        }


        return (

          String(
            referral.referrerName ||
            ""
          )
            .toLowerCase()
            .includes(
              searchText
            )

          ||

          String(
            referral.referrerEmail ||
            ""
          )
            .toLowerCase()
            .includes(
              searchText
            )

          ||

          String(
            referral.referredUserName ||
            ""
          )
            .toLowerCase()
            .includes(
              searchText
            )

          ||

          String(
            referral.referredUserEmail ||
            ""
          )
            .toLowerCase()
            .includes(
              searchText
            )

          ||

          String(
            referral.referralCode ||
            ""
          )
            .toLowerCase()
            .includes(
              searchText
            )

        );

      }
    );


  /* =========================================================
     STATS
  ========================================================= */

  const pendingCount =
    referrals.filter(
      (
        item
      ) =>
        item.status ===
        "pending"
    ).length;


  const confirmedCount =
    referrals.filter(
      (
        item
      ) =>
        item.status ===
        "confirmed"
    ).length;


  const rejectedCount =
    referrals.filter(
      (
        item
      ) =>
        item.status ===
        "rejected"
    ).length;


  const totalPendingAmount =
    referrals
      .filter(
        (
          item
        ) =>
          item.status ===
          "pending"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.rewardAmount ||
            0
          ),
        0
      );


  const totalConfirmedAmount =
    referrals
      .filter(
        (
          item
        ) =>
          item.status ===
          "confirmed"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.rewardAmount ||
            0
          ),
        0
      );


  /* =========================================================
     DATE
  ========================================================= */

  const formatDate =
    (
      timestamp
    ) => {

      if (
        !timestamp ||
        !timestamp.toDate
      ) {

        return "—";

      }


      return timestamp
        .toDate()
        .toLocaleDateString(
          "en-IN",
          {

            day:
              "2-digit",

            month:
              "short",

            year:
              "numeric",

          }
        );

    };


  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading
  ) {

    return (

      <div
        className="admin-referral-page"
      >

        <div
          className="admin-referral-loading"
        >

          <div
            className="admin-referral-spinner"
          >
          </div>


          <p>
            Referral requests load होत आहेत...
          </p>

        </div>

      </div>

    );

  }


  /* =========================================================
     MAIN
  ========================================================= */

  return (

    <div
      className="admin-referral-page"
    >

      <div
        className="admin-referral-container"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="admin-referral-header"
        >

          <div>

            <span>
              ONLINEWALAA ADMIN
            </span>


            <h1>
              Referral Management
            </h1>


            <p>
              Referral rewards manually
              verify आणि approve करा.
            </p>

          </div>


          <button
            className="admin-refresh-btnn"
            onClick={
              loadReferrals
            }
            disabled={
              loading
            }
          >
            ↻ Refresh
          </button>

        </div>


        {/* =================================================
            SUCCESS
        ================================================= */}

        {
          successMessage && (

            <div
              className="admin-success-message"
            >

              <span>
                ✓
              </span>

              {successMessage}

            </div>

          )
        }


        {/* =================================================
            ERROR
        ================================================= */}

        {
          error && (

            <div
              className="admin-error-message"
            >

              <span>
                ⚠️
              </span>

              {error}

            </div>

          )
        }


        {/* =================================================
            STATS
        ================================================= */}

        <div
          className="admin-referral-stats"
        >

          <div
            className="admin-referral-stat"
          >

            <div
              className="stat-icon pending"
            >
              ⏳
            </div>

            <div>

              <span>
                Pending
              </span>

              <strong>
                {pendingCount}
              </strong>

            </div>

          </div>


          <div
            className="admin-referral-stat"
          >

            <div
              className="stat-icon confirmed"
            >
              ✓
            </div>

            <div>

              <span>
                Confirmed
              </span>

              <strong>
                {confirmedCount}
              </strong>

            </div>

          </div>


          <div
            className="admin-referral-stat"
          >

            <div
              className="stat-icon rejected"
            >
              ✕
            </div>

            <div>

              <span>
                Rejected
              </span>

              <strong>
                {rejectedCount}
              </strong>

            </div>

          </div>


          <div
            className="admin-referral-stat"
          >

            <div
              className="stat-icon money"
            >
              ₹
            </div>

            <div>

              <span>
                Pending Amount
              </span>

              <strong>
                ₹
                {totalPendingAmount.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>


          <div
            className="admin-referral-stat"
          >

            <div
              className="stat-icon confirmed-money"
            >
              💰
            </div>

            <div>

              <span>
                Confirmed Amount
              </span>

              <strong>
                ₹
                {totalConfirmedAmount.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

        </div>


        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div
          className="admin-referral-toolbar"
        >

          <div
            className="admin-referral-filters"
          >

            <button
              className={
                filter === "pending"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "pending"
                )
              }
            >

              Pending

              <span>
                {pendingCount}
              </span>

            </button>


            <button
              className={
                filter === "confirmed"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "confirmed"
                )
              }
            >

              Confirmed

              <span>
                {confirmedCount}
              </span>

            </button>


            <button
              className={
                filter === "rejected"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "rejected"
                )
              }
            >

              Rejected

              <span>
                {rejectedCount}
              </span>

            </button>


            <button
              className={
                filter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter(
                  "all"
                )
              }
            >

              All

              <span>
                {referrals.length}
              </span>

            </button>

          </div>


          <div
            className="admin-search"
          >

            <span>
              🔎
            </span>

            <input
              type="text"
              placeholder="Search user, email or code..."
              value={search}
              onChange={
                (e) =>
                  setSearch(
                    e.target.value
                  )
              }
            />

          </div>

        </div>


        {/* =================================================
            REFERRALS
        ================================================= */}

        <div
          className="admin-referral-list"
        >

          {
            filteredReferrals.length ===
            0 ? (

              <div
                className="admin-empty"
              >

                <div>
                  🎁
                </div>

                <h3>
                  No referrals found
                </h3>

                <p>
                  इस filter में कोई referral
                  request उपलब्ध नहीं है.
                </p>

              </div>

            ) : (

              filteredReferrals.map(
                (
                  referral
                ) => (

                  <div
                    className={
                      `admin-referral-card ${
                        referral.status
                      }`
                    }
                    key={
                      referral.id
                    }
                  >

                    {/* =================================================
                        TOP
                    ================================================= */}

                    <div
                      className="admin-referral-card-top"
                    >

                      <div
                        className="admin-referral-id"
                      >

                        <span>
                          Referral ID
                        </span>

                        <strong>
                          #
                          {referral.id.slice(
                            0,
                            8
                          )}
                        </strong>

                      </div>


                      <div
                        className={
                          `admin-status ${referral.status}`
                        }
                      >

                        {
                          referral.status ===
                            "pending" &&
                          "⏳ Pending"
                        }

                        {
                          referral.status ===
                            "confirmed" &&
                          "✓ Confirmed"
                        }

                        {
                          referral.status ===
                            "rejected" &&
                          "✕ Rejected"
                        }

                      </div>

                    </div>


                    {/* =================================================
                        USERS
                    ================================================= */}

                    <div
                      className="referral-users-grid"
                    >

                      {/* REFERRER */}

                      <div
                        className="referral-person"
                      >

                        <div
                          className="person-icon referrer"
                        >
                          👤
                        </div>


                        <div>

                          <span
                            className="person-label"
                          >
                            REFERRER
                          </span>

                          <strong>
                            {
                              referral.referrerName
                            }
                          </strong>

                          <small>
                            {
                              referral.referrerEmail
                            }
                          </small>

                          <small>
                            📱{" "}
                            {
                              referral.referrerMobile
                            }
                          </small>

                        </div>

                      </div>


                      {/* ARROW */}

                      <div
                        className="referral-arrow"
                      >
                        →
                      </div>


                      {/* REFERRED USER */}

                      <div
                        className="referral-person"
                      >

                        <div
                          className="person-icon referred"
                        >
                          👤
                        </div>


                        <div>

                          <span
                            className="person-label"
                          >
                            REFERRED USER
                          </span>

                          <strong>
                            {
                              referral.referredUserName
                            }
                          </strong>

                          <small>
                            {
                              referral.referredUserEmail
                            }
                          </small>

                          <small>
                            📱{" "}
                            {
                              referral.referredUserMobile
                            }
                          </small>

                        </div>

                      </div>

                    </div>


                    {/* =================================================
                        REFERRAL DETAILS
                    ================================================= */}

                    <div
                      className="referral-details-grid"
                    >

                      <div>

                        <span>
                          Referral Code
                        </span>

                        <strong
                          className="referral-code"
                        >
                          {
                            referral.referralCode ||
                            "—"
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          Reward
                        </span>

                        <strong
                          className="reward-amount"
                        >
                          +₹
                          {
                            referral.rewardAmount ||
                            0
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          Created
                        </span>

                        <strong>
                          {
                            formatDate(
                              referral.createdAt
                            )
                          }
                        </strong>

                      </div>


                      <div>

                        <span>
                          Service
                        </span>

                        <strong>
                          {
                            referral.serviceName ||
                            "Not specified"
                          }
                        </strong>

                      </div>

                    </div>


                    {/* =================================================
                        SERVICE STATUS
                    ================================================= */}

                    <div
                      className="service-status-box"
                    >

                      <div>

                        <span>
                          Service Booking Status
                        </span>


                        {
                          referral.serviceBooked ? (

                            <strong
                              className="service-booked"
                            >
                              ✓ Service Booked
                            </strong>

                          ) : (

                            <strong
                              className="service-not-booked"
                            >
                              ⏳ Not Confirmed
                            </strong>

                          )
                        }

                      </div>


                      {
                        referral.status ===
                          "pending" && (

                          <button
                            className="mark-service-btn"
                            disabled={
                              processingId ===
                              referral.id
                            }
                            onClick={() =>
                              markServiceBooked(
                                referral
                              )
                            }
                          >

                            {
                              processingId ===
                                referral.id
                                ? "Processing..."
                                : "✓ Mark Service Booked"
                            }

                          </button>

                        )
                      }

                    </div>


                    {/* =================================================
                        ADMIN ACTIONS
                    ================================================= */}

                    {
                      referral.status ===
                        "pending" && (

                        <div
                          className="admin-referral-actions"
                        >

                          <button
                            className="reject-referral-btn"
                            disabled={
                              processingId ===
                              referral.id
                            }
                            onClick={() =>
                              rejectReferral(
                                referral
                              )
                            }
                          >

                            {
                              processingId ===
                                referral.id
                                ? "Processing..."
                                : "✕ Reject"
                            }

                          </button>


                          <button
                            className="confirm-referral-btn"
                            disabled={
                              processingId ===
                              referral.id
                            }
                            onClick={() =>
                              confirmReferral(
                                referral
                              )
                            }
                          >

                            {
                              processingId ===
                                referral.id
                                ? "Processing..."
                                : "✓ Confirm Referral"
                            }

                          </button>

                        </div>

                      )
                    }


                    {/* =================================================
                        CONFIRMED INFO
                    ================================================= */}

                    {
                      referral.status ===
                        "confirmed" && (

                        <div
                          className="confirmed-message"
                        >

                          ✓ Referral approved.
                          ₹
                          {
                            referral.rewardAmount ||
                            0
                          }{" "}
                          is now available to the
                          referrer.

                        </div>

                      )
                    }


                    {/* =================================================
                        REJECTED INFO
                    ================================================= */}

                    {
                      referral.status ===
                        "rejected" && (

                        <div
                          className="rejected-message"
                        >

                          ✕ Referral rejected.
                          No reward was released.

                        </div>

                      )
                    }

                  </div>

                )
              )

            )
          }

        </div>

      </div>

    </div>

  );

}