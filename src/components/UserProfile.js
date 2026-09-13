import { useState, useEffect } from "react";

import { auth, db } from "./firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import {
  getFunctions,
  httpsCallable
} from "firebase/functions";

import UserBookings from "./UserBookings";
import BookingModal from "./BookingModal";

import "./UserProfile.css";


export default function UserProfile() {

  const [user, setUser] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [preview, setPreview] =
    useState(null);

  const [isBookingModalOpen, setIsBookingModalOpen] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("online");

  const [docSearchQuery, setDocSearchQuery] =
    useState("");


  /* =========================================================
     UDHARI
  ========================================================= */

  const [udhari, setUdhari] =
    useState([]);

  const [udhariLoading, setUdhariLoading] =
    useState(true);


  /* =========================================================
     UDHARI WALLET PAYMENT
  ========================================================= */

  const [
    showUdhariPaymentModal,
    setShowUdhariPaymentModal
  ] = useState(false);

  const [
    selectedUdhari,
    setSelectedUdhari
  ] = useState(null);

  const [
    udhariPaymentAmount,
    setUdhariPaymentAmount
  ] = useState("");

  const [
    udhariPaymentSaving,
    setUdhariPaymentSaving
  ] = useState(false);

  const [
    udhariPaymentError,
    setUdhariPaymentError
  ] = useState("");

  const [
    udhariPaymentSuccess,
    setUdhariPaymentSuccess
  ] = useState("");

  const [
    showWalletBalance,
    setShowWalletBalance
  ] = useState(false);



const [udhariHistory, setUdhariHistory] =
  useState([]);


  /* =========================================================
     LOAD USER + UDHARI
  ========================================================= */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {

          if (currentUser) {

            try {

              /* =================================================
                 USER PROFILE
              ================================================= */

              const userDocRef =
                doc(
                  db,
                  "users",
                  currentUser.uid
                );

              const userDocSnap =
                await getDoc(
                  userDocRef
                );


              if (
                userDocSnap.exists()
              ) {

                setUser({
                  ...currentUser,
                  ...userDocSnap.data()
                });

              } else {

                setUser(
                  currentUser
                );

              }


              /* =================================================
                 UDHARI
              ================================================= */

             /* =================================================
   UDHARI
================================================= */

try {
  const udhariQuery = query(
    collection(db, "udhari"),
    where("uid", "==", currentUser.uid)
  );

  const udhariSnapshot =
    await getDocs(udhariQuery);

  const allUdhariList = [];

  udhariSnapshot.forEach((item) => {
    const data = item.data();

    const totalAmount =
      Number(data.totalAmount || 0);

    const paidAmount =
      Number(data.paidAmount || 0);

    const remainingAmount =
      Number(
        data.remainingAmount ??
          Math.max(
            0,
            totalAmount - paidAmount
          )
      );

    const paymentCount =
      Number(data.paymentCount || 0);

    allUdhariList.push({
      id: item.id,
      ...data,
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentCount
    });
  });


  /* =================================================
     ALL UDHARI HISTORY
     
     PAID records सुद्धा इथे राहतील.
  ================================================= */

  setUdhariHistory(
    allUdhariList
  );


  /* =================================================
     ACTIVE UDHARI ONLY
  ================================================= */

  const activeUdhari =
    allUdhariList.filter(
      (item) =>
        (
          item.status === "PENDING" ||
          item.status === "PARTIAL"
        ) &&
        Number(
          item.remainingAmount || 0
        ) > 0
    );

  setUdhari(
    activeUdhari
  );

} catch (error) {

  console.error(
    "Udhari load error:",
    error
  );

  setUdhari([]);
  setUdhariHistory([]);

} finally {

  setUdhariLoading(false);

}

            } catch (error) {

              console.error(
                "Error fetching user data from database:",
                error
              );


              setUser(
                currentUser
              );

              setUdhariLoading(
                false
              );

            }

          } else {

            setUser(null);

            setUdhari([]);

            setUdhariLoading(
              false
            );

          }


          setLoading(
            false
          );

        }
      );


    return () =>
      unsubscribe();

  }, []);


  /* =========================================================
     GET CURRENT WALLET BALANCE
  ========================================================= */

  const getWalletBalance = () => {

    const walletBalance =
      Number(
        user?.walletBalance ??
        user?.wallet ??
        0
      );

    const availableBalance =
      Number(
        user?.availableBalance ??
        walletBalance
      );


    return {
      walletBalance,
      availableBalance
    };

  };


  /* =========================================================
     OPEN UDHARI PAYMENT MODAL
  ========================================================= */

  const openUdhariPayment = (
    udhariItem,
    amount = null
  ) => {

    const remaining =
      Number(
        udhariItem?.remainingAmount || 0
      );


    if (
      remaining <= 0
    ) {

      return;

    }


    setSelectedUdhari(
      udhariItem
    );


    setUdhariPaymentAmount(
      amount
        ? String(amount)
        : ""
    );


    setUdhariPaymentError(
      ""
    );

    setUdhariPaymentSuccess(
      ""
    );

    setShowWalletBalance(
      false
    );

    setShowUdhariPaymentModal(
      true
    );

  };


  /* =========================================================
     CLOSE UDHARI PAYMENT MODAL
  ========================================================= */

  const closeUdhariPayment = () => {

    if (
      udhariPaymentSaving
    ) {

      return;

    }


    setShowUdhariPaymentModal(
      false
    );

    setSelectedUdhari(
      null
    );

    setUdhariPaymentAmount(
      ""
    );

    setUdhariPaymentError(
      ""
    );

    setUdhariPaymentSuccess(
      ""
    );

    setShowWalletBalance(
      false
    );

  };


  /* =========================================================
     PAY FULL UDHARI
  ========================================================= */

  const payFullUdhari = () => {

    if (
      !selectedUdhari
    ) {

      return;

    }


    const remaining =
      Number(
        selectedUdhari.remainingAmount || 0
      );


    setUdhariPaymentAmount(
      String(remaining)
    );

    setUdhariPaymentError(
      ""
    );

  };


  /* =========================================================
     HANDLE UDHARI WALLET PAYMENT
  ========================================================= */

  const handleUdhariWalletPayment =
    async () => {

      setUdhariPaymentError(
        ""
      );

      setUdhariPaymentSuccess(
        ""
      );


      if (
        !selectedUdhari
      ) {

        setUdhariPaymentError(
          "उधारी निवडलेली नाही."
        );

        return;

      }


      const amount =
        Number(
          udhariPaymentAmount
        );


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        setUdhariPaymentError(
          "कृपया योग्य रक्कम भरा."
        );

        return;

      }


      const remaining =
        Number(
          selectedUdhari.remainingAmount || 0
        );


      if (
        remaining <= 0
      ) {

        setUdhariPaymentError(
          "या उधारीची रक्कम आधीच पूर्ण भरलेली आहे."
        );

        return;

      }


      if (
        amount > remaining
      ) {

        setUdhariPaymentError(
          `तुम्ही जास्तीत जास्त ₹${remaining.toLocaleString(
            "en-IN"
          )} भरू शकता.`
        );

        return;

      }


      const {
        walletBalance,
        availableBalance
      } =
        getWalletBalance();


      if (
        availableBalance < amount
      ) {

        setUdhariPaymentError(
          `Wallet मध्ये पुरेशी रक्कम नाही. उपलब्ध Balance: ₹${availableBalance.toLocaleString(
            "en-IN"
          )}`
        );

        return;

      }


      try {

        setUdhariPaymentSaving(
          true
        );


        const functions =
          getFunctions(
            undefined,
            "asia-south1"
          );


        const payUdhari =
          httpsCallable(
            functions,
            "payUdhariFromWallet"
          );


        const result =
          await payUdhari({

            udhariId:
              selectedUdhari.id,

            amount

          });


        const data =
          result?.data || {};


        /*
         * BACKEND UPDATED BALANCES
         */

        const newWalletBalance =
          Number(
            data.walletBalance ??
            (
              walletBalance -
              amount
            )
          );


        const newAvailableBalance =
          Number(
            data.availableBalance ??
            (
              availableBalance -
              amount
            )
          );


        const newPaidAmount =
          Number(
            data.paidAmount ??
            (
              Number(
                selectedUdhari.paidAmount || 0
              ) +
              amount
            )
          );


        const newRemainingAmount =
          Number(
            data.remainingAmount ??
            (
              remaining -
              amount
            )
          );


        const newPaymentCount =
          Number(
            data.paymentCount ??
            (
              Number(
                selectedUdhari.paymentCount || 0
              ) +
              1
            )
          );


        const newStatus =
          data.status ||
          (
            newRemainingAmount <= 0
              ? "PAID"
              : "PARTIAL"
          );


        /*
         * UPDATE USER LOCALLY
         */

        setUser(
          (previousUser) => {

            if (
              !previousUser
            ) {

              return previousUser;

            }


            return {

              ...previousUser,

              walletBalance:
                newWalletBalance,

              availableBalance:
                newAvailableBalance

            };

          }
        );


        /*
         * UPDATE UDHARI LOCALLY
         */

        setUdhari(
          (previousList) => {

            return previousList
              .map(
                (item) => {

                  if (
                    item.id !==
                    selectedUdhari.id
                  ) {

                    return item;

                  }


                  return {

                    ...item,

                    paidAmount:
                      newPaidAmount,

                    remainingAmount:
                      newRemainingAmount,

                    paymentCount:
                      newPaymentCount,

                    status:
                      newStatus

                  };

                }
              )
              .filter(
                (item) =>
                  Number(
                    item.remainingAmount || 0
                  ) > 0 &&
                  item.status !==
                    "PAID"
              );

          }
        );


        setUdhariPaymentSuccess(
          `₹${amount.toLocaleString(
            "en-IN"
          )} उधारीमध्ये यशस्वीरित्या जमा झाले.`
        );


        /*
         * CLOSE MODAL AFTER SHORT DELAY
         */

        setTimeout(
          () => {

            setShowUdhariPaymentModal(
              false
            );

            setSelectedUdhari(
              null
            );

            setUdhariPaymentAmount(
              ""
            );

            setUdhariPaymentSuccess(
              ""
            );

          },
          1300
        );


      } catch (error) {

        console.error(
          "Udhari wallet payment error:",
          error
        );


        let message =
          "Payment करताना काहीतरी चूक झाली.";


        if (
          error?.code ===
          "functions/unauthenticated"
        ) {

          message =
            "कृपया पुन्हा Login करा.";

        } else if (
          error?.code ===
          "functions/failed-precondition"
        ) {

          message =
            error?.message ||
            "Wallet payment करता आले नाही.";

        } else if (
          error?.message
        ) {

          message =
            error.message;

        }


        setUdhariPaymentError(
          message
        );

      } finally {

        setUdhariPaymentSaving(
          false
        );

      }

    };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {

    return (

      <div className="profile-page-state">

        <div className="loading-card">

          <div className="loading-spinner"></div>

          <h3>
            डॅशबोर्ड लोड होत आहे
          </h3>

          <p>
            तुमचे खाते तयार केले जात आहे,
            कृपया प्रतीक्षा करा.
          </p>

        </div>

      </div>

    );

  }


  /* =========================================================
     LOGIN REQUIRED
  ========================================================= */

  if (!user) {

    return (

      <div className="profile-page-state">

        <div className="empty-login-card">

          <div className="state-icon">
            🔐
          </div>

          <h3>
            लॉगिन आवश्यक आहे
          </h3>

          <p>
            तुमचा डॅशबोर्ड पाहण्यासाठी
            कृपया लॉगिन करा.
          </p>

        </div>

      </div>

    );

  }


  /* =========================================================
     DATA
  ========================================================= */

  const applications =
    [...(user?.applications || [])]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );


  const documents =
    user?.documents || [];


  const filteredDocuments =
    documents.filter(
      (document) => {

        const searchTerm =
          docSearchQuery
            .toLowerCase()
            .trim();


        const title =
          (
            document.title ||
            document.name ||
            ""
          )
            .toLowerCase();


        return title.includes(
          searchTerm
        );

      }
    );


  /* =========================================================
     DATE FORMAT
  ========================================================= */

  const formatDate = (
    dateVal
  ) => {

    if (!dateVal) {

      return "उपलब्ध नाही";

    }


    try {

      if (
        dateVal.seconds
      ) {

        return new Date(
          dateVal.seconds * 1000
        ).toLocaleDateString(
          "mr-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }
        );

      }


      if (
        typeof dateVal.toDate ===
        "function"
      ) {

        return dateVal
          .toDate()
          .toLocaleDateString(
            "mr-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric"
            }
          );

      }


      const d =
        new Date(
          dateVal
        );


      return isNaN(
        d.getTime()
      )
        ? "उपलब्ध नाही"
        : d.toLocaleDateString(
            "mr-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric"
            }
          );

    } catch {

      return "उपलब्ध नाही";

    }

  };


  /* =========================================================
     FILE SIZE
  ========================================================= */

  const formatFileSize = (
    size
  ) => {

    if (
      !size &&
      size !== 0
    ) {

      return "आकार उपलब्ध नाही";

    }


    const sizeStr =
      String(size)
        .toUpperCase()
        .trim();


    const numericValue =
      parseFloat(
        sizeStr.replace(
          /[^0-9.]/g,
          ""
        )
      );


    if (
      isNaN(
        numericValue
      )
    ) {

      return "आकार उपलब्ध नाही";

    }


    let bytes =
      numericValue;


    if (
      sizeStr.includes("KB")
    ) {

      bytes =
        numericValue *
        1024;

    } else if (
      sizeStr.includes("MB")
    ) {

      bytes =
        numericValue *
        1024 *
        1024;

    } else if (
      sizeStr.includes("GB")
    ) {

      bytes =
        numericValue *
        1024 *
        1024 *
        1024;

    }


    if (
      bytes === 0
    ) {

      return "0 B";

    }


    if (
      bytes < 1024
    ) {

      return `${bytes.toFixed(0)} B`;

    }


    if (
      bytes <
      1024 * 1024
    ) {

      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;

    }


    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;

  };


  /* =========================================================
     PAYMENT STATS
  ========================================================= */

  const totalPaid =
    applications
      .filter(
        (app) =>
          app.paid === true ||
          app.paid === "true"
      )
      .reduce(
        (sum, app) =>
          sum +
          Number(
            app.total || 0
          ),
        0
      );


  const pendingApplications =
    applications.filter(
      (app) =>
        app.paid !== true &&
        app.paid !== "true"
    ).length;


  /* =========================================================
     UDHARI TOTALS
  ========================================================= */

  const totalUdhari =
    udhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalAmount || 0
        ),
      0
    );


  const totalUdhariPaid =
    udhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.paidAmount || 0
        ),
      0
    );


  const totalUdhariRemaining =
    udhari.reduce(
      (sum, item) => {

        const total =
          Number(
            item.totalAmount || 0
          );


        const paid =
          Number(
            item.paidAmount || 0
          );


        const remaining =
          Number(
            item.remainingAmount ??
            (
              total -
              paid
            )
          );


        return (
          sum +
          remaining
        );

      },
      0
    );


  const totalUdhariPayments =
    udhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.paymentCount || 0
        ),
      0
    );


  /* =========================================================
     WALLET BALANCE
  ========================================================= */

  const {
    walletBalance,
    availableBalance
  } =
    getWalletBalance();


  /* =========================================================
     INITIALS
  ========================================================= */

  const userInitials =
    user?.name
      ? user.name
          .split(" ")
          .map(
            (word) =>
              word.charAt(0)
          )
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "U";


  /* =========================================================
     TAB CHANGE
  ========================================================= */

  const handleTabChange = (
    tab
  ) => {

    setActiveTab(
      tab
    );


    if (
      window.innerWidth <= 768
    ) {

      setTimeout(
        () => {

          document
            .querySelector(
              ".tab-content-wrapper"
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

        },
        50
      );

    }

  };


  /* =========================================================
     RETURN
  ========================================================= */

  return (

    <div className="profile-container">


      {/* =====================================================
          HERO HEADER
      ===================================================== */}

      <header className="profile-header">

        <div className="profile-header-bg">

          <div className="header-orb orb-one"></div>

          <div className="header-orb orb-two"></div>

          <div className="header-grid"></div>

        </div>


        <div className="profile-header-inner">

          <div className="profile-user-card">

            <div className="profile-avatar-wrapper">

              <div className="profile-avatar">
                {userInitials}
              </div>

              <span
                className="profile-online-dot"
                title="ऑनलाईन"
              ></span>

            </div>


            <div className="profile-user-details">

              <span className="profile-welcome">
                पुन्हा स्वागत आहे 👋
              </span>


              <h1>
                {user?.name ||
                  "ग्राहक"}
              </h1>


              <p>

                <span className="phone-icon">
                  📞
                </span>

                {user?.mobile ||
                  "मोबाईल नंबर जोडलेला नाही"}

              </p>


              {/* EMAIL */}

              <p>

                <span className="email-icon">
                  ✉️
                </span>

                {user?.email ||
                  "Email उपलब्ध नाही"}

              </p>

            </div>

          </div>


          <div className="profile-header-right">

            <div className="wallet-card">

              <div className="wallet-iconn">
                ₹
              </div>

              <div>

                <span>
                  एकूण भरलेली रक्कम
                </span>

                <strong>
                  ₹{totalPaid.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

            </div>


            <button
              className="btn-primary main-action"
              onClick={() =>
                setIsBookingModalOpen(
                  true
                )
              }
            >

              <span className="plus-icon">
                +
              </span>

              <span>
                नवीन सेवा बुक करा
              </span>

            </button>

          </div>

        </div>

      </header>


      {/* =====================================================
          QUICK STATISTICS
      ===================================================== */}

      <section className="profile-stats">

        <button
          className="stat-card stat-blue"
          onClick={() =>
            handleTabChange(
              "online"
            )
          }
        >

          <div className="stat-icon">
            🌐
          </div>

          <div className="stat-content">

            <span>
              ऑनलाईन सेवा
            </span>

            <strong>
              बुकिंग पहा
            </strong>

          </div>

          <span className="stat-arrow">
            →
          </span>

        </button>


        <button
          className="stat-card stat-purple"
          onClick={() =>
            handleTabChange(
              "offline"
            )
          }
        >

          <div className="stat-icon">
            📁
          </div>

          <div className="stat-content">

            <span>
              अर्ज
            </span>

            <strong>
              {applications.length}
            </strong>

          </div>

          <span className="stat-arrow">
            →
          </span>

        </button>


        <button
          className="stat-card stat-green"
          onClick={() =>
            handleTabChange(
              "docs"
            )
          }
        >

          <div className="stat-icon">
            📄
          </div>

          <div className="stat-content">

            <span>
              कागदपत्रे
            </span>

            <strong>
              {documents.length}
            </strong>

          </div>

          <span className="stat-arrow">
            →
          </span>

        </button>


        <div className="stat-card stat-orange">

          <div className="stat-icon">
            ⏳
          </div>

          <div className="stat-content">

            <span>
              प्रलंबित पेमेंट
            </span>

            <strong>
              {pendingApplications}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          UDHARI SECTION
          ONLY ACTIVE UDHARI
      ===================================================== */}

     {!udhariLoading &&
  udhari.length > 0 && (

    <details className="profile-udhari-section">

      {/* =====================================================
          CLICKABLE HEADER
          ===================================================== */}

      <summary className="udhari-header">

        <div className="udhari-header-content">

          <span className="section-eyebrow">
            आर्थिक माहिती
          </span>

          <h2>
            माझी उधारी
          </h2>

          <p>
            तुमच्या खात्यावर असलेली बाकी रक्कम
          </p>

        </div>


        <div className="udhari-header-right">

          <div className="udhari-header-icon">
            💳
          </div>

          <span className="udhari-chevron">
            ▼
          </span>

        </div>

      </summary>



      {/* =====================================================
          EXPANDABLE CONTENT
          ===================================================== */}

      <div className="udhari-expand-content">


        {/* =================================================
            UDHARI SUMMARY
            ================================================= */}

        <div className="udhari-summary-grid">


          {/* TOTAL */}

          <div className="udhari-summary-card total">

            <span>
              एकूण उधारी
            </span>

            <strong>
              ₹
              {totalUdhari.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>



          {/* PAID */}

          <div className="udhari-summary-card paid">

            <span>
              भरलेली रक्कम
            </span>

            <strong>
              ₹
              {totalUdhariPaid.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>



          {/* REMAINING */}

          <div className="udhari-summary-card remaining">

            <span>
              बाकी रक्कम
            </span>

            <strong>
              ₹
              {totalUdhariRemaining.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>



          {/* PAYMENTS */}

          <div className="udhari-summary-card payments">

            <span>
              एकूण Payments
            </span>

            <strong>
              {totalUdhariPayments}
            </strong>

          </div>


        </div>



        {/* =================================================
            UDHARI LIST
            ================================================= */}

        <div className="udhari-list">

          {udhari.map(
            (item) => {

              const totalAmount =
                Number(
                  item.totalAmount || 0
                );


              const paidAmount =
                Number(
                  item.paidAmount || 0
                );


              const remainingAmount =
                Number(
                  item.remainingAmount ??
                    (
                      totalAmount -
                      paidAmount
                    )
                );


              const paymentCount =
                Number(
                  item.paymentCount || 0
                );


              const isPartial =
                item.status ===
                "PARTIAL";



              /* =================================================
                 DUE DATE
                 ================================================= */

              let isOverdue =
                false;


              if (
                item.dueDate
              ) {

                let dueDate;


                if (
                  typeof item.dueDate.toDate ===
                  "function"
                ) {

                  dueDate =
                    item.dueDate
                      .toDate();

                } else {

                  dueDate =
                    new Date(
                      item.dueDate
                    );

                }


                if (
                  !isNaN(
                    dueDate.getTime()
                  )
                ) {

                  dueDate.setHours(
                    23,
                    59,
                    59,
                    999
                  );


                  isOverdue =
                    dueDate.getTime() <
                    Date.now();

                }

              }



              return (

                <article
                  key={item.id}
                  className={`udhari-card ${
                    isOverdue
                      ? "udhari-overdue"
                      : ""
                  }`}
                >


                  {/* =================================================
                      TOP
                      ================================================= */}

                  <div className="udhari-card-top">

                    <div className="udhari-service">

                      <div className="udhari-service-icon">
                        💳
                      </div>


                      <div>

                        <h3>
                          {item.service ||
                            "उधारी"}
                        </h3>


                        <span>
                          {item.description ||
                            "उधारी व्यवहार"}
                        </span>

                      </div>

                    </div>


                    <span
                      className={`udhari-status ${
                        isOverdue
                          ? "overdue"
                          : isPartial
                            ? "partial"
                            : "pending"
                      }`}
                    >

                      {isOverdue
                        ? "Due Date पार"
                        : isPartial
                          ? "अंशतः भरले"
                          : "बाकी"}

                    </span>

                  </div>



                  {/* =================================================
                      AMOUNT
                      ================================================= */}

                  <div className="udhari-amount-box">


                    <div>

                      <span>
                        एकूण
                      </span>

                      <strong>
                        ₹
                        {totalAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>



                    <div>

                      <span>
                        भरले
                      </span>

                      <strong className="udhari-paid-amount">
                        ₹
                        {paidAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>



                    <div className="udhari-remaining">

                      <span>
                        बाकी
                      </span>

                      <strong>
                        ₹
                        {remainingAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                  </div>



                  {/* =================================================
                      DETAILS
                      ================================================= */}

                  <div className="udhari-details-grid">


                    <div>

                      <span>
                        📅 Due Date
                      </span>

                      <strong
                        className={
                          isOverdue
                            ? "udhari-due-overdue"
                            : ""
                        }
                      >
                        {formatDate(
                          item.dueDate
                        )}
                      </strong>

                    </div>



                    <div>

                      <span>
                        💰 Payments
                      </span>

                      <strong>
                        {paymentCount} वेळा
                      </strong>

                    </div>



                    <div>

                      <span>
                        📝 नोंद
                      </span>

                      <strong>
                        {item.note ||
                          "नोंद उपलब्ध नाही"}
                      </strong>

                    </div>


                  </div>



                  {/* =================================================
                      DESCRIPTION
                      ================================================= */}

                  {item.description && (

                    <div className="udhari-description">

                      <span>
                        ℹ️ माहिती
                      </span>

                      <p>
                        {item.description}
                      </p>

                    </div>

                  )}



                  {/* =================================================
                      CREATED DATE
                      ================================================= */}

                  {item.createdAt && (

                    <div className="udhari-created">

                      उधारी दिनांक:
                      {" "}

                      {formatDate(
                        item.createdAt
                      )}

                    </div>

                  )}



                  {/* =================================================
                      WALLET PAYMENT
                      ================================================= */}

                  {remainingAmount > 0 && (

                    <div className="udhari-wallet-payment-area">


                      <div className="udhari-wallet-payment-info">

                        <div>

                          <span>
                            Wallet मधून Payment
                          </span>

                          <small>
                            उपलब्ध Balance: ₹
                            {availableBalance.toLocaleString(
                              "en-IN"
                            )}
                          </small>

                        </div>


                        <div className="udhari-wallet-payment-icon">
                          💳
                        </div>

                      </div>



                      <button
                        type="button"
                        className="udhari-pay-wallet-btn"
                        onClick={() =>
                          openUdhariPayment(
                            item
                          )
                        }
                      >

                        💳 Wallet मधून भरा

                        <span>
                          →
                        </span>

                      </button>


                    </div>

                  )}


                </article>

              );

            }
          )}

        </div>

      </div>

    </details>

  )}
{/* =====================================================
    UDHARI HISTORY
    SHOW ONLY IF USER HAS EVER TAKEN UDHARI
===================================================== */}

{!udhariLoading &&
  udhariHistory.length > 0 && (

    <details className="profile-udhari-history-section">

      {/* =====================================================
          CLICKABLE HEADER
          ===================================================== */}

      <summary className="udhari-history-header">

        <div className="udhari-history-header-content">

          <span className="section-eyebrow">
            व्यवहार इतिहास
          </span>

          <h2>
            माझी उधारी
          </h2>

          <p>
            Udhari History · तुमच्या आधीच्या सर्व उधारीचे व्यवहार
          </p>

        </div>


        <div className="udhari-history-header-right">

          <div className="udhari-history-header-icon">
            📋
          </div>

          <span className="udhari-history-chevron">
            ▼
          </span>

        </div>

      </summary>


      {/* =====================================================
          EXPANDABLE CONTENT
          ===================================================== */}

      <div className="udhari-history-expand-content">


        {/* ===================================================
            SUMMARY
            =================================================== */}

        <div className="udhari-history-summary">

          <div className="udhari-history-summary-card">

            <span>
              एकूण Udhari
            </span>

            <strong>
              {udhariHistory.length}
            </strong>

          </div>


          <div className="udhari-history-summary-card">

            <span>
              एकूण रक्कम
            </span>

            <strong>
              ₹
              {udhariHistory
                .reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.totalAmount || 0
                    ),
                  0
                )
                .toLocaleString("en-IN")}
            </strong>

          </div>


          <div className="udhari-history-summary-card">

            <span>
              भरलेली रक्कम
            </span>

            <strong className="history-paid">
              ₹
              {udhariHistory
                .reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.paidAmount || 0
                    ),
                  0
                )
                .toLocaleString("en-IN")}
            </strong>

          </div>


          <div className="udhari-history-summary-card">

            <span>
              बाकी
            </span>

            <strong className="history-remaining">
              ₹
              {udhariHistory
                .reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.remainingAmount || 0
                    ),
                  0
                )
                .toLocaleString("en-IN")}
            </strong>

          </div>

        </div>



        {/* ===================================================
            HISTORY LIST
            =================================================== */}

        <div className="udhari-history-list">

          {[
            ...udhariHistory
          ]

            .sort((a, b) => {

              const getTime = (value) => {

                if (!value) {
                  return 0;
                }


                if (
                  typeof value.seconds ===
                  "number"
                ) {

                  return value.seconds;

                }


                const parsed =
                  new Date(value).getTime();


                return Number.isNaN(parsed)
                  ? 0
                  : parsed / 1000;

            };


              return (
                getTime(b.createdAt) -
                getTime(a.createdAt)
              );

            })


            .map((item) => {


              const totalAmount =
                Number(
                  item.totalAmount || 0
                );


              const paidAmount =
                Number(
                  item.paidAmount || 0
                );


              const remainingAmount =
                Number(
                  item.remainingAmount ??
                    Math.max(
                      0,
                      totalAmount -
                        paidAmount
                    )
                );


              const paymentCount =
                Number(
                  item.paymentCount || 0
                );


              const isPaid =
                item.status === "PAID" ||
                remainingAmount <= 0;



              return (

                <article
                  key={item.id}
                  className={`udhari-history-card ${
                    isPaid
                      ? "udhari-history-paid"
                      : "udhari-history-active"
                  }`}
                >


                  {/* =================================================
                      TOP
                      ================================================= */}

                  <div className="udhari-history-card-top">

                    <div className="udhari-history-service">

                      <div className="udhari-history-service-icon">

                        {isPaid
                          ? "✓"
                          : "💳"}

                      </div>


                      <div>

                        <h3>
                          {item.service ||
                            "उधारी"}
                        </h3>


                        <span>
                          {item.description ||
                            "उधारी व्यवहार"}
                        </span>

                      </div>

                    </div>


                    <span
                      className={`udhari-history-status ${
                        isPaid
                          ? "paid"
                          : "active"
                      }`}
                    >

                      {isPaid
                        ? "PAID"
                        : item.status ===
                            "PARTIAL"
                          ? "PARTIAL"
                          : "PENDING"}

                    </span>

                  </div>



                  {/* =================================================
                      AMOUNTS
                      ================================================= */}

                  <div className="udhari-history-amount-grid">


                    <div>

                      <span>
                        एकूण
                      </span>

                      <strong>
                        ₹
                        {totalAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>



                    <div>

                      <span>
                        भरले
                      </span>

                      <strong className="history-paid">
                        ₹
                        {paidAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>



                    <div>

                      <span>
                        बाकी
                      </span>

                      <strong
                        className={
                          remainingAmount > 0
                            ? "history-remaining"
                            : "history-zero"
                        }
                      >
                        ₹
                        {remainingAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>



                    <div>

                      <span>
                        Payments
                      </span>

                      <strong>
                        {paymentCount}
                      </strong>

                    </div>


                  </div>



                  {/* =================================================
                      DETAILS
                      ================================================= */}

                  <div className="udhari-history-details">


                    {item.createdAt && (

                      <div>

                        <span>
                          📅 Udhari दिनांक
                        </span>

                        <strong>
                          {formatDate(
                            item.createdAt
                          )}
                        </strong>

                      </div>

                    )}



                    {item.dueDate && (

                      <div>

                        <span>
                          📅 Due Date
                        </span>

                        <strong>
                          {formatDate(
                            item.dueDate
                          )}
                        </strong>

                      </div>

                    )}



                    {item.note && (

                      <div>

                        <span>
                          📝 नोंद
                        </span>

                        <strong>
                          {item.note}
                        </strong>

                      </div>

                    )}

                  </div>



                  {/* =================================================
                      DESCRIPTION
                      ================================================= */}

                  {item.description && (

                    <div className="udhari-history-description">

                      <span>
                        ℹ️ माहिती
                      </span>

                      <p>
                        {item.description}
                      </p>

                    </div>

                  )}



                  {/* =================================================
                      PAID
                      ================================================= */}

                  {isPaid && (

                    <div className="udhari-history-paid-message">

                      <span>
                        ✓
                      </span>


                      <div>

                        <strong>
                          उधारी पूर्णपणे भरलेली
                        </strong>


                        <small>
                          ही उधारी पूर्णपणे परतफेड केली आहे.
                        </small>


                        {item.lastPaymentDate && (

                          <div className="udhari-repaid-date">

                            📅 परतफेड दिनांक:{" "}

                            <strong>
                              {formatDate(
                                item.lastPaymentDate
                              )}
                            </strong>

                          </div>

                        )}

                      </div>

                    </div>

                  )}



                  {/* =================================================
                      ACTIVE
                      ================================================= */}

                  {!isPaid && (

                    <div className="udhari-history-active-message">

                      <span>
                        💰
                      </span>


                      <div>

                        <strong>
                          Udhari अजून बाकी आहे
                        </strong>


                        <small>
                          बाकी रक्कम: ₹
                          {remainingAmount.toLocaleString(
                            "en-IN"
                          )}
                        </small>

                      </div>

                    </div>

                  )}

                </article>

              );

            })}

        </div>

      </div>

    </details>

  )}
      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="icon-nav-grid">

        <button
          className={`nav-item ${
            activeTab === "online"
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleTabChange(
              "online"
            )
          }
        >

          <div className="nav-box nav-blue">
            🌐
          </div>

          <div className="nav-text">

            <strong>
              ऑनलाईन बुकिंग
            </strong>

            <span>
              तुमची बुकिंग व्यवस्थापित करा
            </span>

          </div>

          <span className="nav-arrow">
            →
          </span>

        </button>


        <button
          className={`nav-item ${
            activeTab === "offline"
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleTabChange(
              "offline"
            )
          }
        >

          <div className="nav-box nav-purple">
            📁
          </div>

          <div className="nav-text">

            <strong>
              सायबर कॅफे अर्ज
            </strong>

            <span>
              अर्जांची माहिती पहा
            </span>

          </div>

          <span className="nav-arrow">
            →
          </span>

        </button>


        <button
          className={`nav-item ${
            activeTab === "docs"
              ? "active"
              : ""
          }`}
          onClick={() =>
            handleTabChange(
              "docs"
            )
          }
        >

          <div className="nav-box nav-green">
            📄
          </div>

          <div className="nav-text">

            <strong>
              माझी कागदपत्रे
            </strong>

            <span>
              तुमच्या फाईल्स पहा
            </span>

          </div>

          <span className="nav-arrow">
            →
          </span>

        </button>

      </nav>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="tab-content-wrapper">


        {/* ===================================================
            ONLINE BOOKINGS
        =================================================== */}

        {activeTab === "online" && (

          <section className="tab-content fade-in">

            <div className="section-heading">

              <div>

                <span className="section-eyebrow">
                  सेवा
                </span>

                <h2 className="section-title">
                  माझी ऑनलाईन बुकिंग
                </h2>

                <p className="section-description">
                  तुमची ऑनलाईन सेवा बुकिंग पहा आणि व्यवस्थापित करा.
                </p>

              </div>


              <button
                className="section-action"
                onClick={() =>
                  setIsBookingModalOpen(
                    true
                  )
                }
              >
                + नवीन बुकिंग
              </button>

            </div>


            <UserBookings
              user={user}
            />

          </section>

        )}


        {/* ===================================================
            OFFLINE APPLICATIONS
        =================================================== */}

        {activeTab === "offline" && (

          <section className="tab-content fade-in">

            <div className="section-header-flex">

              <div>

                <span className="section-eyebrow">
                  सायबर कॅफे
                </span>

                <h2
                  className="section-title"
                  style={{
                    marginBottom: 0
                  }}
                >
                  सायबर कॅफे अर्ज
                </h2>

              </div>


              <span className="count-pill">

                {applications.length}
                {" "}
                अर्ज

              </span>

            </div>


            {applications.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📭
                </div>

                <h3>
                  अजून कोणतेही अर्ज नाहीत
                </h3>

                <p>
                  तुमचे सायबर कॅफे अर्ज येथे दिसतील.
                </p>

              </div>

            ) : (

              <div className="saas-cards-list">

                {applications.map(
                  (app, i) => {

                    const isPaid =
                      app.paid === true ||
                      app.paid === "true";


                    return (

                      <article
                        key={i}
                        className={`saas-form-card ${
                          isPaid
                            ? "application-paid"
                            : "application-pending"
                        }`}
                      >

                        <div className="saas-card-top">

                          <div className="saas-app-info">

                            <div className="app-title-row">

                              <div className="app-type-icon">
                                📋
                              </div>

                              <div>

                                <h3 className="saas-app-name">
                                  {app.name ||
                                    "अर्ज"}
                                </h3>

                                <span className="saas-app-date">
                                  📅{" "}
                                  {formatDate(
                                    app.date
                                  )}
                                </span>

                              </div>

                            </div>

                          </div>


                          <span
                            className={`saas-badge ${
                              isPaid
                                ? "paid"
                                : "pending"
                            }`}
                          >

                            <span className="status-dot"></span>

                            {isPaid
                              ? "पैसे भरले"
                              : "प्रलंबित"}

                          </span>

                        </div>


                        <div className="saas-card-mid">

                          <div className="saas-fee-box">

                            <div className="fee-item">

                              <span className="fee-label">
                                शासकीय शुल्क
                              </span>

                              <span className="fee-val">
                                ₹
                                {app.govtFee ||
                                  0}
                              </span>

                            </div>


                            <div className="fee-divider"></div>


                            <div className="fee-item">

                              <span className="fee-label">
                                सेवा शुल्क
                              </span>

                              <span className="fee-val">
                                ₹
                                {app.serviceCharge ||
                                  0}
                              </span>

                            </div>


                            {app.discountValue >
                              0 && (

                              <>

                                <div className="fee-divider"></div>

                                <div className="fee-item discount-row">

                                  <span className="fee-label">
                                    सवलत
                                  </span>

                                  <span className="fee-val">

                                    -
                                    {app.discountType ===
                                    "percent"
                                      ? `${app.discountValue}%`
                                      : `₹${
                                          app.discountAmount ||
                                          0
                                        }`}

                                  </span>

                                </div>

                              </>

                            )}

                          </div>


                          {app.note && (

                            <div className="saas-note-box">

                              <span className="saas-note-icon">
                                ℹ
                              </span>

                              <span>
                                {app.note}
                              </span>

                            </div>

                          )}

                        </div>


                        <div className="saas-card-bottom">

                          <div className="saas-total">

                            {app.discountValue >
                              0 && (

                              <small>
                                उपएकूण: ₹
                                {app.subTotal}
                              </small>

                            )}


                            <span>

                              एकूण

                              <strong>
                                ₹
                                {app.total ||
                                  0}
                              </strong>

                            </span>

                          </div>


                          <div className="saas-action-btns">

                            <button
                              className={`saas-btn-outline ${
                                !app.formUrl
                                  ? "disabled"
                                  : ""
                              }`}
                              onClick={() =>
                                app.formUrl &&
                                setPreview({
                                  type: "pdf",
                                  url: app.formUrl
                                })
                              }
                              disabled={
                                !app.formUrl
                              }
                            >

                              📄

                              <span>
                                अर्ज
                              </span>

                            </button>


                            <button
                              className={`saas-btn-outline ${
                                !app.docsUrl
                                  ? "disabled"
                                  : ""
                              }`}
                              onClick={() =>
                                app.docsUrl &&
                                setPreview({
                                  type: "pdf",
                                  url: app.docsUrl
                                })
                              }
                              disabled={
                                !app.docsUrl
                              }
                            >

                              📎

                              <span>
                                कागदपत्रे
                              </span>

                            </button>

                          </div>

                        </div>

                      </article>

                    );

                  }
                )}

              </div>

            )}

          </section>

        )}


        {/* ===================================================
            DOCUMENTS
        =================================================== */}

        {activeTab === "docs" && (

          <section className="tab-content fade-in">

            <div className="docs-header-row">

              <div>

                <span className="section-eyebrow">
                  फाईल व्यवस्थापन
                </span>


                <div className="docs-title-row">

                  <h2 className="section-title">
                    माझी कागदपत्रे
                  </h2>

                  <span className="count-pill">
                    {documents.length} फाईल्स
                  </span>

                </div>


                <p className="section-description">
                  तुमची अपलोड केलेली कागदपत्रे सुरक्षितपणे पहा.
                </p>

              </div>


              {documents.length > 0 && (

                <div className="saas-search-wrapper">

                  <span className="search-icon">
                    🔍
                  </span>


                  <input
                    type="text"
                    placeholder="फाईल शोधा..."
                    value={
                      docSearchQuery
                    }
                    onChange={(e) =>
                      setDocSearchQuery(
                        e.target.value
                      )
                    }
                    className="saas-search-input"
                  />


                  {docSearchQuery && (

                    <button
                      className="search-clear"
                      onClick={() =>
                        setDocSearchQuery("")
                      }
                    >
                      ×
                    </button>

                  )}

                </div>

              )}

            </div>


            {documents.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📂
                </div>

                <h3>
                  कोणतीही कागदपत्रे अपलोड केलेली नाहीत
                </h3>

                <p>
                  तुमच्या अपलोड केलेल्या फाईल्स येथे दिसतील.
                </p>

              </div>

            ) : filteredDocuments.length === 0 ? (

              <div className="empty-state-search">

                <div className="empty-search-icon">
                  🔍
                </div>

                <h3>
                  कागदपत्रे सापडली नाहीत
                </h3>

                <p>
                  "{docSearchQuery}"
                  या नावाची कोणतीही फाईल सापडली नाही.
                </p>

                <button
                  onClick={() =>
                    setDocSearchQuery("")
                  }
                  className="clear-search-btn"
                >
                  शोध साफ करा
                </button>

              </div>

            ) : (

              <div className="saas-docs-grid">

                {filteredDocuments.map(
                  (document, i) => {

                    const fileExt =
                      document.url
                        ? document.url
                            .split("?")[0]
                            .split(".")
                            .pop()
                            .toUpperCase()
                        : "FILE";


                    const displayType =
                      document.type
                        ? document.type
                            .split("/")
                            .pop()
                            .toUpperCase()
                        : fileExt;


                    const isImage =
                      document.type
                        ? document.type.includes(
                            "image"
                          )
                        : [
                            "JPG",
                            "JPEG",
                            "PNG",
                            "WEBP",
                            "GIF"
                          ].includes(
                            fileExt
                          );


                    return (

                      <article
                        key={i}
                        className="saas-doc-card"
                        onClick={() =>
                          document.url &&
                          setPreview({
                            type: isImage
                              ? "img"
                              : "pdf",
                            url: document.url
                          })
                        }
                      >

                        <div className="saas-doc-preview">

                          {isImage ? (

                            <img
                              src={
                                document.url
                              }
                              alt={
                                document.title ||
                                document.name ||
                                "कागदपत्र"
                              }
                              className="saas-doc-thumb"
                              loading="lazy"
                            />

                          ) : (

                            <div className="saas-doc-generic">

                              <span>
                                {displayType.substring(
                                  0,
                                  4
                                )}
                              </span>

                            </div>

                          )}


                          <div className="doc-view-overlay">

                            <span>
                              👁 पहा
                            </span>

                          </div>

                        </div>


                        <div className="saas-doc-info">

                          <p
                            className="saas-doc-title"
                            title={
                              document.title ||
                              document.name
                            }
                          >
                            {document.title ||
                              document.name ||
                              "नाव नसलेली फाईल"}
                          </p>


                          <div className="saas-doc-meta">

                            <span className="saas-doc-badge">
                              {displayType.substring(
                                0,
                                4
                              )}
                            </span>

                            <span className="saas-doc-size">
                              {formatFileSize(
                                document.size
                              )}
                            </span>

                          </div>

                        </div>

                      </article>

                    );

                  }
                )}

              </div>

            )}

          </section>

        )}

      </main>


      {/* =====================================================
          BOOKING MODAL
      ===================================================== */}

      {isBookingModalOpen &&
        user && (

          <BookingModal
            user={user}
            onClose={() =>
              setIsBookingModalOpen(
                false
              )
            }
          />

        )}


      {/* =====================================================
          DOCUMENT PREVIEW
      ===================================================== */}

      {preview && (

        <div
          className="preview-modal-overlay"
          onClick={() =>
            setPreview(null)
          }
        >

          <div
            className="preview-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="preview-modal-header">

              <div>

                <span>
                  कागदपत्र पूर्वावलोकन
                </span>

              </div>


              <button
                className="close-btn"
                onClick={() =>
                  setPreview(null)
                }
                aria-label="पूर्वावलोकन बंद करा"
              >
                ✕
              </button>

            </div>


            <div className="preview-modal-body">

              {preview.type === "pdf" ? (

                <iframe
                  src={
                    preview.url
                  }
                  title="कागदपत्र पूर्वावलोकन"
                />

              ) : (

                <img
                  src={
                    preview.url
                  }
                  alt="कागदपत्र पूर्वावलोकन"
                />

              )}

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          UDHARI WALLET PAYMENT MODAL
      ===================================================== */}

      {showUdhariPaymentModal &&
        selectedUdhari && (

          <div
            className="udhari-payment-modal-overlay"
            onClick={() => {

              if (
                !udhariPaymentSaving
              ) {

                closeUdhariPayment();

              }

            }}
          >

            <div
              className="udhari-payment-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >


              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <div className="udhari-payment-modal-header">

                <div>

                  <span>
                    💳 Wallet Payment
                  </span>

                  <h3>
                    उधारी भरा
                  </h3>

                  <p>
                    Wallet मधून उधारीची रक्कम भरा
                  </p>

                </div>


                <button
                  type="button"
                  className="udhari-payment-close"
                  onClick={
                    closeUdhariPayment
                  }
                  disabled={
                    udhariPaymentSaving
                  }
                >
                  ✕
                </button>

              </div>


              {/* =================================================
                  WALLET BALANCE
              ================================================= */}

              <div className="udhari-wallet-balance-box">

                <div>

                  <span>
                    Wallet Balance
                  </span>

                  <strong>

                    {showWalletBalance
                      ? `₹${availableBalance.toLocaleString(
                          "en-IN"
                        )}`
                      : "••••••"}

                  </strong>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setShowWalletBalance(
                      (value) =>
                        !value
                    )
                  }
                >
                  {showWalletBalance
                    ? "लपवा"
                    : "पहा"}
                </button>

              </div>


              {/* =================================================
                  UDHARI INFO
              ================================================= */}

              <div className="udhari-payment-debt-box">

                <div>

                  <span>
                    एकूण उधारी
                  </span>

                  <strong>
                    ₹
                    {Number(
                      selectedUdhari.totalAmount ||
                      0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    आधी भरले
                  </span>

                  <strong>
                    ₹
                    {Number(
                      selectedUdhari.paidAmount ||
                      0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>


                <div className="highlight">

                  <span>
                    बाकी
                  </span>

                  <strong>
                    ₹
                    {Number(
                      selectedUdhari.remainingAmount ||
                      0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

              </div>


              {/* =================================================
                  PAYMENT AMOUNT
              ================================================= */}

              <div className="udhari-payment-input-group">

                <label>
                  किती रक्कम भरायची?
                </label>


                <div className="udhari-payment-input-wrapper">

                  <span>
                    ₹
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="रक्कम लिहा"
                    value={
                      udhariPaymentAmount
                    }
                    onChange={(e) => {

                      setUdhariPaymentAmount(
                        e.target.value
                      );

                      setUdhariPaymentError(
                        ""
                      );

                    }}
                    disabled={
                      udhariPaymentSaving
                    }
                  />

                </div>


                {/* =================================================
                    QUICK AMOUNTS
                ================================================= */}

                <div className="udhari-quick-amounts">

                  <button
                    type="button"
                    onClick={
                      payFullUdhari
                    }
                    disabled={
                      udhariPaymentSaving
                    }
                  >
                    पूर्ण उधारी
                  </button>


                  {[100, 500, 1000].map(
                    (amount) => {

                      const remaining =
                        Number(
                          selectedUdhari.remainingAmount ||
                          0
                        );


                      if (
                        amount >
                        remaining
                      ) {

                        return null;

                      }


                      return (

                        <button
                          key={amount}
                          type="button"
                          onClick={() =>
                            openUdhariPayment(
                              selectedUdhari,
                              amount
                            )
                          }
                          disabled={
                            udhariPaymentSaving
                          }
                        >
                          ₹{amount}
                        </button>

                      );

                    }
                  )}

                </div>

              </div>


              {/* =================================================
                  ERROR
              ================================================= */}

              {udhariPaymentError && (

                <div className="udhari-payment-error">

                  <span>
                    ⚠️
                  </span>

                  <p>
                    {udhariPaymentError}
                  </p>

                </div>

              )}


              {/* =================================================
                  SUCCESS
              ================================================= */}

              {udhariPaymentSuccess && (

                <div className="udhari-payment-success">

                  <span>
                    ✅
                  </span>

                  <p>
                    {udhariPaymentSuccess}
                  </p>

                </div>

              )}


              {/* =================================================
                  PAYMENT ACTIONS
              ================================================= */}

              <div className="udhari-payment-actions">

                <button
                  type="button"
                  className="udhari-payment-cancel-btn"
                  onClick={
                    closeUdhariPayment
                  }
                  disabled={
                    udhariPaymentSaving
                  }
                >
                  रद्द करा
                </button>


                <button
                  type="button"
                  className="udhari-payment-confirm-btn"
                  onClick={
                    handleUdhariWalletPayment
                  }
                  disabled={
                    udhariPaymentSaving ||
                    !udhariPaymentAmount
                  }
                >

                  {udhariPaymentSaving ? (

                    <>
                      <span className="udhari-payment-spinner"></span>
                      Payment होत आहे...
                    </>

                  ) : (

                    <>
                      💳 Payment करा
                    </>

                  )}

                </button>

              </div>


              {/* =================================================
                  SECURITY NOTE
              ================================================= */}

              <div className="udhari-payment-security">

                🔒 Payment तुमच्या Wallet मधून
                सुरक्षितपणे deduct केला जाईल.

              </div>

            </div>

          </div>

        )}

    </div>

  );

}