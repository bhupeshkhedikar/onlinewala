import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

import {
  getFunctions,
  httpsCallable
} from "firebase/functions";

import "./AdminUdhari.css";


export default function AdminUdhari() {

  const [users, setUsers] = useState([]);
  const [udhari, setUdhari] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    service: "",
    description: "",
    dueDate: "",
    note: ""
  });

  const [saving, setSaving] = useState(false);


  /* =====================================================
     PAYMENT STATES
  ===================================================== */

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [paymentUdhari, setPaymentUdhari] =
    useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: "",
    note: ""
  });

  const [paymentSaving, setPaymentSaving] =
    useState(false);


  /* =====================================================
     HISTORY
  ===================================================== */

  const [showHistoryModal, setShowHistoryModal] =
    useState(false);

  const [historyUdhari, setHistoryUdhari] =
    useState(null);

  const [payments, setPayments] = useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);


  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData = async () => {

    try {

      setLoading(true);


      /* =================================================
         USERS
      ================================================= */

      const usersSnapshot = await getDocs(
        collection(db, "users")
      );

      const userList = [];

      usersSnapshot.forEach((item) => {

        userList.push({
          id: item.id,
          ...item.data()
        });

      });

      setUsers(userList);


      /* =================================================
         UDHARI
      ================================================= */

      const udhariQuery = query(
        collection(db, "udhari"),
        orderBy("createdAt", "desc")
      );

      const udhariSnapshot = await getDocs(
        udhariQuery
      );

      const udhariList = [];

      udhariSnapshot.forEach((item) => {

        const data = item.data();

        /*
         * Normalize amounts so that
         * old records also work correctly.
         */

        const totalAmount =
          Number(data.totalAmount || 0);

        const paidAmount =
          Number(data.paidAmount || 0);

        const remainingAmount =
          Number(
            data.remainingAmount ??
            (
              totalAmount -
              paidAmount
            )
          );

        /*
         * If remaining is zero, consider it
         * completed even if older record has
         * incorrect/missing status.
         */

        let status =
          data.status || "PENDING";

        if (
          remainingAmount <= 0 &&
          totalAmount > 0
        ) {
          status = "PAID";
        }

        udhariList.push({

          id: item.id,

          ...data,

          totalAmount,

          paidAmount,

          remainingAmount,

          status

        });

      });

      setUdhari(udhariList);


    } catch (error) {

      console.error(
        "Udhari admin load error:",
        error
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadData();

  }, []);


  /* =====================================================
     FILTER USERS
  ===================================================== */

  const filteredUsers = users.filter((user) => {

    const text =
      `${user.name || ""} ${
        user.mobile || ""
      } ${
        user.email || ""
      }`.toLowerCase();

    return text.includes(
      search.toLowerCase()
    );

  });


  /* =====================================================
     ADD UDHARI
  ===================================================== */

  const openAddUdhari = (user) => {

    setSelectedUser(user);

    setForm({
      amount: "",
      service: "",
      description: "",
      dueDate: "",
      note: ""
    });

    setShowModal(true);

  };


  const handleChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

  };


  const createUdhari = async (e) => {

    e.preventDefault();

    if (!selectedUser) {
      return;
    }

    const amount =
      Number(form.amount);

    if (!amount || amount <= 0) {

      alert(
        "कृपया valid amount टाका."
      );

      return;

    }

    if (!form.dueDate) {

      alert(
        "Due Date निवडा."
      );

      return;

    }


    try {

      setSaving(true);

      const functions = getFunctions(
        undefined,
        "asia-south1"
      );

      const adminCreateUdhari =
        httpsCallable(
          functions,
          "adminCreateUdhari"
        );


      await adminCreateUdhari({

        uid:
          selectedUser.id,

        amount,

        service:
          form.service.trim(),

        description:
          form.description.trim(),

        dueDate:
          form.dueDate,

        note:
          form.note.trim()

      });


      setShowModal(false);
      setSelectedUser(null);

      await loadData();

      alert(
        "उधारी यशस्वीपणे जोडली."
      );


    } catch (error) {

      console.error(
        "Create udhari error:",
        error
      );

      alert(
        error?.message ||
        "उधारी जोडताना error आला."
      );

    } finally {

      setSaving(false);

    }

  };


  /* =====================================================
     OPEN PAYMENT MODAL
  ===================================================== */

  const openPaymentModal = (item) => {

    setPaymentUdhari(item);

    setPaymentForm({
      amount: "",
      paymentDate: "",
      note: ""
    });

    setShowPaymentModal(true);

  };


  /* =====================================================
     PAYMENT CHANGE
  ===================================================== */

  const handlePaymentChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: value
    }));

  };


  /* =====================================================
     ADD PAYMENT
  ===================================================== */

  const addPayment = async (e) => {

    e.preventDefault();

    if (!paymentUdhari) {
      return;
    }

    const amount =
      Number(
        paymentForm.amount
      );

    const remaining =
      Number(
        paymentUdhari.remainingAmount || 0
      );


    if (!amount || amount <= 0) {

      alert(
        "कृपया valid payment amount टाका."
      );

      return;

    }


    if (amount > remaining) {

      alert(
        `Payment बाकी रकमेपेक्षा जास्त असू शकत नाही.\nबाकी: ₹${remaining.toLocaleString(
          "en-IN"
        )}`
      );

      return;

    }


    try {

      setPaymentSaving(true);

      const functions = getFunctions(
        undefined,
        "asia-south1"
      );

      const adminAddUdhariPayment =
        httpsCallable(
          functions,
          "adminAddUdhariPayment"
        );


      await adminAddUdhariPayment({

        udhariId:
          paymentUdhari.id,

        amount,

        paymentDate:
          paymentForm.paymentDate ||
          null,

        note:
          paymentForm.note.trim()

      });


      setShowPaymentModal(false);
      setPaymentUdhari(null);

      await loadData();

      alert(
        amount === remaining
          ? "पूर्ण payment जमा झाले. Udhari PAID झाली."
          : "Payment यशस्वीपणे जमा झाले."
      );


    } catch (error) {

      console.error(
        "Add payment error:",
        error
      );

      alert(
        error?.message ||
        "Payment जमा करताना error आला."
      );

    } finally {

      setPaymentSaving(false);

    }

  };


  /* =====================================================
     PAYMENT HISTORY
  ===================================================== */

  const openPaymentHistory = async (item) => {

    setHistoryUdhari(item);

    setPayments([]);

    setShowHistoryModal(true);

    setHistoryLoading(true);


    try {

      const paymentQuery =
        query(
          collection(
            db,
            "udhari",
            item.id,
            "payments"
          ),
          orderBy(
            "createdAt",
            "desc"
          )
        );


      const snapshot =
        await getDocs(
          paymentQuery
        );


      const list = [];

      snapshot.forEach((doc) => {

        list.push({

          id: doc.id,

          ...doc.data()

        });

      });


      setPayments(list);


    } catch (error) {

      console.error(
        "Payment history error:",
        error
      );

      alert(
        "Payment history मिळवताना error आला."
      );

    } finally {

      setHistoryLoading(false);

    }

  };


  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDate = (value) => {

    if (!value) {
      return "—";
    }


    try {

      if (
        typeof value?.toDate ===
        "function"
      ) {

        return value
          .toDate()
          .toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric"
            }
          );

      }


      if (value?.seconds) {

        return new Date(
          value.seconds * 1000
        ).toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }
        );

      }


      return new Date(value)
        .toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }
        );


    } catch {

      return String(value);

    }

  };


  /* =====================================================
     ACTIVE UDHARI
  ===================================================== */

  const activeUdhari =
    udhari.filter((item) => {

      const remaining =
        Number(
          item.remainingAmount || 0
        );

      return (
        (
          item.status ===
          "PENDING" ||
          item.status ===
          "PARTIAL"
        ) &&
        remaining > 0
      );

    });


  /* =====================================================
     COMPLETED UDHARI
  ===================================================== */

  const completedUdhari =
    udhari.filter((item) => {

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


      /*
       * PAID status OR
       * remaining amount zero
       *
       * Both conditions are accepted so
       * old records also appear correctly.
       */

      return (
        item.status === "PAID" ||
        (
          totalAmount > 0 &&
          remainingAmount <= 0
        )
      );

    });


  /* =====================================================
     TOTALS
  ===================================================== */

  const totalOutstanding =
    activeUdhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.remainingAmount || 0
        ),
      0
    );


  const totalPaid =
    udhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.paidAmount || 0
        ),
      0
    );


  const totalUdhari =
    udhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalAmount || 0
        ),
      0
    );


  const completedAmount =
    completedUdhari.reduce(
      (sum, item) =>
        sum +
        Number(
          item.paidAmount ??
          item.totalAmount ??
          0
        ),
      0
    );


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (

      <div className="admin-udhari-page">

        <div className="admin-udhari-loading">

          उधारी माहिती लोड होत आहे...

        </div>

      </div>

    );

  }


  return (

    <div className="admin-udhari-page">

      <div className="admin-udhari-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-udhari-header">

          <div>

            <span>
              ADMIN PANEL
            </span>

            <h1>
              उधारी व्यवस्थापन
            </h1>

            <p>
              Users ची उधारी, payment आणि due date
              व्यवस्थापित करा.
            </p>

          </div>


          <div className="admin-udhari-icon">
            💳
          </div>

        </div>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="admin-udhari-summary">


          <div className="admin-summary-card">

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


          <div className="admin-summary-card paid-summary">

            <span>
              एकूण Paid
            </span>

            <strong>
              ₹
              {totalPaid.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>


          <div className="admin-summary-card remaining-summary">

            <span>
              एकूण बाकी
            </span>

            <strong>
              ₹
              {totalOutstanding.toLocaleString(
                "en-IN"
              )}
            </strong>

          </div>


          <div className="admin-summary-card completed-summary">

            <span>
              पूर्ण उधारी
            </span>

            <strong>
              {completedUdhari.length}
            </strong>

          </div>


        </div>


        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="admin-udhari-search">

          🔍

          <input
            type="text"
            placeholder="User चे नाव, मोबाईल किंवा Email शोधा..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        {/* =================================================
            USERS
        ================================================= */}

        <div className="admin-user-list">

          {filteredUsers.map((user) => {

            const userUdhari =
              udhari.filter(
                (item) =>
                  item.uid === user.id &&
                  (
                    item.status ===
                      "PENDING" ||
                    item.status ===
                      "PARTIAL"
                  ) &&
                  Number(
                    item.remainingAmount || 0
                  ) > 0
              );


            const totalRemaining =
              userUdhari.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.remainingAmount || 0
                  ),
                0
              );


            const totalUserPaid =
              udhari
                .filter(
                  (item) =>
                    item.uid === user.id
                )
                .reduce(
                  (sum, item) =>
                    sum +
                    Number(
                      item.paidAmount || 0
                    ),
                  0
                );


            const userCompleted =
              udhari.filter(
                (item) => {

                  if (
                    item.uid !==
                    user.id
                  ) {
                    return false;
                  }

                  const remaining =
                    Number(
                      item.remainingAmount ??
                      0
                    );

                  return (
                    item.status ===
                      "PAID" ||
                    remaining <= 0
                  );

                }
              ).length;


            return (

              <div
                key={user.id}
                className="admin-user-card"
              >


                <div className="admin-user-info">

                  <div className="admin-user-avatar">

                    {(
                      user.name ||
                      "U"
                    )
                      .charAt(0)
                      .toUpperCase()}

                  </div>


                  <div>

                    <h3>
                      {user.name ||
                        "नाव उपलब्ध नाही"}
                    </h3>

                    <p>
                      📞{" "}
                      {user.mobile ||
                        "मोबाईल नाही"}
                    </p>

                    <p>
                      ✉️{" "}
                      {user.email ||
                        "Email नाही"}
                    </p>

                  </div>

                </div>


                <div className="admin-user-debt">

                  <div>

                    <span>
                      बाकी उधारी
                    </span>

                    <strong>
                      ₹
                      {totalRemaining.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>


                  <div className="user-paid-small">

                    <span>
                      Paid
                    </span>

                    <strong>
                      ₹
                      {totalUserPaid.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>


                  <div className="user-completed-small">

                    <span>
                      पूर्ण
                    </span>

                    <strong>
                      {userCompleted}
                    </strong>

                  </div>

                </div>


                <div className="admin-user-actions">

                  <button
                    onClick={() =>
                      openAddUdhari(
                        user
                      )
                    }
                    className="admin-add-debt-btn"
                  >
                    + उधारी द्या
                  </button>

                </div>

              </div>

            );

          })}

        </div>


        {/* =================================================
            ACTIVE UDHARI
        ================================================= */}

        <div className="admin-active-udhari">

          <div className="admin-section-title">

            <div>

              <span>
                ACTIVE ACCOUNTS
              </span>

              <h2>
                चालू उधारी
              </h2>

            </div>

            <strong>
              {activeUdhari.length}
            </strong>

          </div>


          <div className="admin-debt-list">

            {activeUdhari.length === 0 ? (

              <div className="admin-no-debt">

                सध्या कोणतीही चालू उधारी नाही.

              </div>

            ) : (

              activeUdhari.map((item) => (

                <div
                  key={item.id}
                  className="admin-debt-card"
                >


                  {/* USER */}

                  <div className="debt-user-column">

                    <h3>
                      {item.userName ||
                        "User"}
                    </h3>

                    <p>
                      {item.userEmail ||
                        "Email उपलब्ध नाही"}
                    </p>

                    <span>
                      {item.service ||
                        "उधारी"}
                    </span>

                  </div>


                  {/* TOTAL */}

                  <div className="debt-money">

                    <small>
                      एकूण
                    </small>

                    <strong>
                      ₹
                      {Number(
                        item.totalAmount ||
                        0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>


                  {/* PAID */}

                  <div className="debt-money">

                    <small>
                      Paid
                    </small>

                    <strong className="debt-green">

                      ₹
                      {Number(
                        item.paidAmount ||
                        0
                      ).toLocaleString(
                        "en-IN"
                      )}

                    </strong>

                  </div>


                  {/* REMAINING */}

                  <div className="debt-money">

                    <small>
                      बाकी
                    </small>

                    <strong className="debt-red">

                      ₹
                      {Number(
                        item.remainingAmount ||
                        0
                      ).toLocaleString(
                        "en-IN"
                      )}

                    </strong>

                  </div>


                  {/* DUE DATE */}

                  <div className="debt-money">

                    <small>
                      Due Date
                    </small>

                    <strong>
                      {formatDate(
                        item.dueDate
                      )}
                    </strong>

                  </div>


                  {/* PAYMENT COUNT */}

                  <div className="debt-money">

                    <small>
                      Payments
                    </small>

                    <strong>
                      {Number(
                        item.paymentCount ||
                        0
                      )}
                    </strong>

                  </div>


                  {/* ACTIONS */}

                  <div className="admin-debt-actions">

                    <button
                      className="admin-payment-btn"
                      onClick={() =>
                        openPaymentModal(
                          item
                        )
                      }
                    >
                      💰 Payment जमा करा
                    </button>


                    <button
                      className="admin-history-btn"
                      onClick={() =>
                        openPaymentHistory(
                          item
                        )
                      }
                    >
                      📋 History
                    </button>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>


        {/* =================================================
            COMPLETED UDHARI
        ================================================= */}

        <div className="admin-completed-udhari">

          <div className="admin-section-title completed-section-title">

            <div>

              <span>
                COMPLETED ACCOUNTS
              </span>

              <h2>
                पूर्ण झालेली उधारी
              </h2>

            </div>


            <strong>
              {completedUdhari.length}
            </strong>

          </div>


          <div className="completed-udhari-summary">

            <div>

              <span>
                पूर्ण Accounts
              </span>

              <strong>
                {completedUdhari.length}
              </strong>

            </div>


            <div>

              <span>
                पूर्ण झालेली रक्कम
              </span>

              <strong>
                ₹
                {completedAmount.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>


          <div className="admin-completed-debt-list">

            {completedUdhari.length === 0 ? (

              <div className="admin-no-completed-debt">

                <div>
                  ✓
                </div>

                <h3>
                  अजून कोणतीही उधारी पूर्ण झालेली नाही
                </h3>

                <p>
                  पूर्ण payment झाल्यानंतर उधारी
                  येथे दिसेल.
                </p>

              </div>

            ) : (

              completedUdhari.map((item) => {

                const totalAmount =
                  Number(
                    item.totalAmount || 0
                  );


                const paidAmount =
                  Number(
                    item.paidAmount ??
                    totalAmount
                  );


                const remainingAmount =
                  Number(
                    item.remainingAmount ??
                    0
                  );


                const paymentCount =
                  Number(
                    item.paymentCount || 0
                  );


                return (

                  <div
                    key={item.id}
                    className="admin-completed-debt-card"
                  >


                    {/* USER */}

                    <div className="completed-debt-user">

                      <div className="completed-user-avatar">

                        {(item.userName ||
                          "U")
                          .charAt(0)
                          .toUpperCase()}

                      </div>


                      <div>

                        <h3>
                          {item.userName ||
                            "User"}
                        </h3>

                        <p>
                          {item.userEmail ||
                            "Email उपलब्ध नाही"}
                        </p>

                        <span>
                          {item.service ||
                            "उधारी"}
                        </span>

                      </div>

                    </div>


                    {/* TOTAL */}

                    <div className="completed-money">

                      <small>
                        एकूण
                      </small>

                      <strong>
                        ₹
                        {totalAmount.toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                    </div>


                    {/* PAID */}

                    <div className="completed-money">

                      <small>
                        Paid
                      </small>

                      <strong className="completed-paid">

                        ₹
                        {paidAmount.toLocaleString(
                          "en-IN"
                        )}

                      </strong>

                    </div>


                    {/* REMAINING */}

                    <div className="completed-money">

                      <small>
                        बाकी
                      </small>

                      <strong className="completed-remaining">

                        ₹
                        {remainingAmount.toLocaleString(
                          "en-IN"
                        )}

                      </strong>

                    </div>


                    {/* STATUS */}

                    <div className="completed-status">

                      <span>
                        ✓
                      </span>

                      <strong>
                        पूर्ण
                      </strong>

                    </div>


                    {/* PAYMENTS */}

                    <div className="completed-money">

                      <small>
                        Payments
                      </small>

                      <strong>
                        {paymentCount}
                      </strong>

                    </div>


                    {/* HISTORY */}

                    <div className="completed-debt-actions">

                      <button
                        className="admin-history-btn"
                        onClick={() =>
                          openPaymentHistory(
                            item
                          )
                        }
                      >
                        📋 History
                      </button>

                    </div>

                  </div>

                );

              })

            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          ADD UDHARI MODAL
      ===================================================== */}

      {showModal &&
        selectedUser && (

          <div
            className="admin-udhari-modal-overlay"
            onClick={() =>
              setShowModal(false)
            }
          >

            <div
              className="admin-udhari-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                className="admin-modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>


              <div className="modal-debt-icon">
                💳
              </div>


              <h2>
                नवीन उधारी
              </h2>

              <p>
                {selectedUser.name}
              </p>


              <form
                onSubmit={createUdhari}
              >

                <label>
                  उधारी रक्कम
                </label>

                <input
                  type="number"
                  name="amount"
                  min="1"
                  placeholder="उदा. 500"
                  value={
                    form.amount
                  }
                  onChange={
                    handleChange
                  }
                  required
                />


                <label>
                  सेवा / कारण
                </label>

                <input
                  type="text"
                  name="service"
                  placeholder="उदा. Document Service"
                  value={
                    form.service
                  }
                  onChange={
                    handleChange
                  }
                />


                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  placeholder="उधारी कशासाठी आहे?"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                />


                <label>
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={
                    form.dueDate
                  }
                  onChange={
                    handleChange
                  }
                  required
                />


                <label>
                  अतिरिक्त नोंद
                </label>

                <textarea
                  name="note"
                  placeholder="इतर महत्त्वाची माहिती..."
                  value={
                    form.note
                  }
                  onChange={
                    handleChange
                  }
                />


                <button
                  type="submit"
                  disabled={saving}
                  className="admin-save-debt-btn"
                >
                  {saving
                    ? "जतन होत आहे..."
                    : "उधारी जतन करा"}
                </button>

              </form>

            </div>

          </div>

        )}


      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {showPaymentModal &&
        paymentUdhari && (

          <div
            className="admin-udhari-modal-overlay"
            onClick={() =>
              !paymentSaving &&
              setShowPaymentModal(false)
            }
          >

            <div
              className="admin-udhari-modal payment-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                className="admin-modal-close"
                onClick={() =>
                  !paymentSaving &&
                  setShowPaymentModal(false)
                }
              >
                ×
              </button>


              <div className="modal-debt-icon payment-icon">
                💰
              </div>


              <h2>
                Payment जमा करा
              </h2>

              <p>
                {paymentUdhari.userName}
              </p>


              {/* REMAINING */}

              <div className="payment-remaining-box">

                <span>
                  सध्या बाकी
                </span>

                <strong>

                  ₹
                  {Number(
                    paymentUdhari.remainingAmount ||
                    0
                  ).toLocaleString(
                    "en-IN"
                  )}

                </strong>

              </div>


              <form
                onSubmit={addPayment}
              >

                <label>
                  Payment Amount *
                </label>

                <input
                  type="number"
                  name="amount"
                  min="1"
                  max={
                    paymentUdhari.remainingAmount ||
                    0
                  }
                  step="0.01"
                  placeholder="उदा. 1000"
                  value={
                    paymentForm.amount
                  }
                  onChange={
                    handlePaymentChange
                  }
                  required
                />


                <label>

                  Payment Date

                  <span className="optional-text">
                    Optional
                  </span>

                </label>

                <input
                  type="date"
                  name="paymentDate"
                  value={
                    paymentForm.paymentDate
                  }
                  onChange={
                    handlePaymentChange
                  }
                />


                <label>

                  Note

                  <span className="optional-text">
                    Optional
                  </span>

                </label>

                <textarea
                  name="note"
                  placeholder="उदा. Cash / Online / बाकी रक्कम..."
                  value={
                    paymentForm.note
                  }
                  onChange={
                    handlePaymentChange
                  }
                />


                <button
                  type="submit"
                  disabled={paymentSaving}
                  className="admin-save-debt-btn payment-save-btn"
                >

                  {paymentSaving
                    ? "Payment जतन होत आहे..."
                    : "💰 Payment जतन करा"}

                </button>

              </form>

            </div>

          </div>

        )}


      {/* =====================================================
          PAYMENT HISTORY MODAL
      ===================================================== */}

      {showHistoryModal &&
        historyUdhari && (

          <div
            className="admin-udhari-modal-overlay"
            onClick={() =>
              setShowHistoryModal(false)
            }
          >

            <div
              className="admin-udhari-modal history-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                className="admin-modal-close"
                onClick={() =>
                  setShowHistoryModal(false)
                }
              >
                ×
              </button>


              <div className="modal-debt-icon history-icon">
                📋
              </div>


              <h2>
                Payment History
              </h2>

              <p>
                {historyUdhari.userName}
              </p>


              {/* SUMMARY */}

              <div className="history-summary">

                <div>

                  <span>
                    एकूण
                  </span>

                  <strong>
                    ₹
                    {Number(
                      historyUdhari.totalAmount ||
                      0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>


                <div>

                  <span>
                    Paid
                  </span>

                  <strong className="history-paid">

                    ₹
                    {Number(
                      historyUdhari.paidAmount ||
                      0
                    ).toLocaleString(
                      "en-IN"
                    )}

                  </strong>

                </div>


                <div>

                  <span>
                    बाकी
                  </span>

                  <strong className="history-remaining">

                    ₹
                    {Number(
                      historyUdhari.remainingAmount ||
                      0
                    ).toLocaleString(
                      "en-IN"
                    )}

                  </strong>

                </div>

              </div>


              {/* COMPLETED STATUS */}

              {(
                historyUdhari.status ===
                  "PAID" ||
                Number(
                  historyUdhari.remainingAmount ||
                  0
                ) <= 0
              ) && (

                <div className="history-completed-badge">

                  ✓

                  <span>
                    ही उधारी पूर्णपणे भरलेली आहे
                  </span>

                </div>

              )}


              {/* HISTORY */}

              {historyLoading ? (

                <div className="history-loading">

                  Payment history लोड होत आहे...

                </div>

              ) : payments.length === 0 ? (

                <div className="history-empty">

                  अजून कोणताही payment केलेला नाही.

                </div>

              ) : (

                <div className="payment-history-list">

                  {payments.map(
                    (payment, index) => (

                      <div
                        key={payment.id}
                        className="payment-history-item"
                      >

                        <div className="payment-history-number">

                          {index + 1}

                        </div>


                        <div className="payment-history-main">

                          <strong>

                            ₹
                            {Number(
                              payment.amount ||
                              0
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </strong>


                          <div className="payment-history-meta">

                            {payment.paymentDate
                              ? `📅 ${formatDate(
                                  payment.paymentDate
                                )}`
                              : `📅 ${formatDate(
                                  payment.createdAt
                                )}`}

                          </div>


                          {payment.paymentMethod && (

                            <div className="payment-history-method">

                              💳{" "}
                              {payment.paymentMethod ===
                              "WALLET"
                                ? "Wallet"
                                : payment.paymentMethod}

                            </div>

                          )}


                          {payment.note && (

                            <div className="payment-history-note">

                              {payment.note}

                            </div>

                          )}

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </div>

        )}

    </div>

  );

}