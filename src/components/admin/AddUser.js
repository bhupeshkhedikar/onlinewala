import { useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc
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

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {

    const cleanName = form.name.trim();

    const cleanMobile = form.mobile
      .replace(/\D/g, "")
      .trim();

    const cleanEmail = form.email
      .trim()
      .toLowerCase();

    const cleanPassword = form.password;

    // ==============================
    // VALIDATION
    // ==============================

    if (!cleanName) {
      alert("Please enter full name");
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      alert("Please enter valid 10 digit mobile number");
      return;
    }

    if (!cleanEmail) {
      alert("Please enter email");
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {

      setLoading(true);

      // =====================================================
      // CREATE FIREBASE EMAIL/PASSWORD AUTH USER
      // =====================================================

      const res = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );

      const uid = res.user.uid;

      // =====================================================
      // CREATE FIRESTORE USER PROFILE
      // =====================================================

      await setDoc(
        doc(db, "users", uid),
        {
          // Basic information
          name: cleanName,

          mobile: cleanMobile,

          phoneNumber: `+91${cleanMobile}`,

          email: cleanEmail,

          gender: form.gender,

          // Role
          role: form.role,

          // Applications
          applications: [],

          // Registration source
          createdBy: "admin",

          // Important:
          // This user is allowed to login using mobile OTP
          mobileLoginEnabled: true,

          // Created date
          createdAt: new Date()
        }
      );

      alert("User Created Successfully ✅");

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

      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {

      console.error("Admin Create User Error:", err);

      if (err.code === "auth/email-already-in-use") {
        alert("This email is already registered.");
      } else if (err.code === "auth/invalid-email") {
        alert("Invalid email address.");
      } else if (err.code === "auth/weak-password") {
        alert("Password is too weak. Use at least 6 characters.");
      } else {
        alert(err.message);
      }

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="addUser">

      <h3>Create New User</h3>

      {/* NAME */}

      <input
        type="text"
        placeholder="Full Name"
        value={form.name}
        onChange={(e) =>
          handleChange("name", e.target.value)
        }
      />

      {/* MOBILE */}

      <input
        type="tel"
        placeholder="Mobile Number"
        value={form.mobile}
        maxLength="10"
        inputMode="numeric"
        onChange={(e) =>
          handleChange(
            "mobile",
            e.target.value.replace(/\D/g, "")
          )
        }
      />

      {/* EMAIL */}

      <input
        type="email"
        placeholder="Email Address"
        value={form.email}
        onChange={(e) =>
          handleChange("email", e.target.value)
        }
      />

      {/* PASSWORD */}

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) =>
          handleChange("password", e.target.value)
        }
      />

      {/* GENDER */}

      <select
        value={form.gender}
        onChange={(e) =>
          handleChange("gender", e.target.value)
        }
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>

      {/* ROLE */}

      <select
        value={form.role}
        onChange={(e) =>
          handleChange("role", e.target.value)
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

      {/* BUTTON */}

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