import { useState } from "react";
import { auth, db } from "./firebase";

import {
  createUserWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where
} from "firebase/firestore";

import "./AddUser.css";

export default function AddUser({ onSuccess }) {

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    gender: "male",
    role: "user"
  });

  const [loading, setLoading] = useState(false);

  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // =====================================================
  // GENERATE REFERRAL CODE
  // Example: OW7K2P9A
  // =====================================================

  const generateReferralCode = () => {

    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let code = "OW";

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    return code;
  };

  // =====================================================
  // GENERATE UNIQUE REFERRAL CODE
  // =====================================================

  const generateUniqueReferralCode = async () => {

    let referralCode = "";
    let exists = true;

    let attempts = 0;

    while (exists && attempts < 10) {

      referralCode = generateReferralCode();

      const referralQuery = query(
        collection(db, "users"),
        where(
          "referralCode",
          "==",
          referralCode
        )
      );

      const snapshot =
        await getDocs(referralQuery);

      exists = !snapshot.empty;

      attempts++;
    }

    if (exists) {
      throw new Error(
        "Unable to generate unique referral code. Please try again."
      );
    }

    return referralCode;
  };

  // =====================================================
  // CREATE USER
  // =====================================================

  const handleSubmit = async () => {

    const cleanName =
      form.name.trim();

    const cleanMobile =
      form.mobile
        .replace(/\D/g, "")
        .trim();

    const cleanEmail =
      form.email
        .trim()
        .toLowerCase();

    const cleanPassword =
      form.password;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!cleanName) {
      alert("Please enter full name");
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      alert(
        "Please enter valid 10 digit mobile number"
      );
      return;
    }

    if (!cleanEmail) {
      alert("Please enter email");
      return;
    }

    if (
      !cleanPassword ||
      cleanPassword.length < 6
    ) {
      alert(
        "Password must be at least 6 characters"
      );
      return;
    }

    try {

      setLoading(true);

      // =====================================================
      // GENERATE UNIQUE REFERRAL CODE
      // =====================================================

      const referralCode =
        await generateUniqueReferralCode();

      console.log(
        "Generated Referral Code:",
        referralCode
      );

      // =====================================================
      // CREATE FIREBASE EMAIL/PASSWORD AUTH USER
      // =====================================================

      const res =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          cleanPassword
        );

      const uid =
        res.user.uid;

      // =====================================================
      // CREATE FIRESTORE USER PROFILE
      // =====================================================

      await setDoc(
        doc(db, "users", uid),
        {

          // =================================================
          // BASIC INFORMATION
          // =================================================

          name: cleanName,

          mobile: cleanMobile,

          phoneNumber:
            `+91${cleanMobile}`,

          email: cleanEmail,

          gender: form.gender,

          // =================================================
          // ROLE
          // =================================================

          role: form.role,

          // =================================================
          // REFERRAL
          // =================================================

          referralCode: referralCode,

          // =================================================
          // REFERRAL RELATED FIELDS
          // =================================================

          referredBy: "",

          referralFromURL: "",

          referralReward: 0,

          referralCount: 0,

          // =================================================
          // APPLICATIONS
          // =================================================

          applications: [],

          // =================================================
          // WALLET
          // =================================================

          walletBalance: 0,

          availableBalance: 0,

          pendingReferralAmount: 0,

          // =================================================
          // REGISTRATION SOURCE
          // =================================================

          createdBy: "admin",

          // =================================================
          // MOBILE OTP LOGIN
          // =================================================

          mobileLoginEnabled: true,

          // =================================================
          // CREATED DATE
          // =================================================

          createdAt: new Date()
        }
      );

      // =====================================================
      // SUCCESS
      // =====================================================

      alert(
        `User Created Successfully ✅\n\nReferral Code: ${referralCode}`
      );

      // =====================================================
      // RESET FORM
      // =====================================================

      setForm({
        name: "",
        mobile: "",
        email: "",
        password: "",
        gender: "male",
        role: "user"
      });

      // =====================================================
      // REFRESH USER LIST
      // =====================================================

      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {

      console.error(
        "Admin Create User Error:",
        err
      );

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {

        alert(
          "This email is already registered."
        );

      } else if (
        err.code ===
        "auth/invalid-email"
      ) {

        alert(
          "Invalid email address."
        );

      } else if (
        err.code ===
        "auth/weak-password"
      ) {

        alert(
          "Password is too weak. Use at least 6 characters."
        );

      } else {

        alert(
          err.message ||
          "Unable to create user."
        );
      }

    } finally {

      setLoading(false);

    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="addUser">

      <h3>Create New User</h3>

      {/* =================================================
          NAME
      ================================================= */}

      <input
        type="text"
        placeholder="Full Name"
        value={form.name}
        onChange={(e) =>
          handleChange(
            "name",
            e.target.value
          )
        }
      />

      {/* =================================================
          MOBILE
      ================================================= */}

      <input
        type="tel"
        placeholder="Mobile Number"
        value={form.mobile}
        maxLength="10"
        inputMode="numeric"
        onChange={(e) =>
          handleChange(
            "mobile",
            e.target.value.replace(
              /\D/g,
              ""
            )
          )
        }
      />

      {/* =================================================
          EMAIL
      ================================================= */}

      <input
        type="email"
        placeholder="Email Address"
        value={form.email}
        onChange={(e) =>
          handleChange(
            "email",
            e.target.value
          )
        }
      />

      {/* =================================================
          PASSWORD
      ================================================= */}

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) =>
          handleChange(
            "password",
            e.target.value
          )
        }
      />

      {/* =================================================
          GENDER
      ================================================= */}

      <select
        value={form.gender}
        onChange={(e) =>
          handleChange(
            "gender",
            e.target.value
          )
        }
      >

        <option value="male">
          Male
        </option>

        <option value="female">
          Female
        </option>

      </select>

      {/* =================================================
          ROLE
      ================================================= */}

      <select
        value={form.role}
        onChange={(e) =>
          handleChange(
            "role",
            e.target.value
          )
        }
      >

        <option value="user">
          Customer / User
        </option>

        <option value="staff">
          Staff / Desk Operator
        </option>

        <option value="technician">
          IT / Hardware Support
        </option>

        <option value="admin">
          Manager / Admin
        </option>

      </select>

      {/* =================================================
          BUTTON
      ================================================= */}

      <button
        onClick={handleSubmit}
        disabled={loading}
      >

        {loading
          ? "Creating..."
          : "Create User"}

      </button>

    </div>
  );
}