import { useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "./AddUser.css";

export default function AddUser({ onSuccess }) {

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    gender: "male",
    role: "user" // Added role with default value
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Please fill all fields");
      return;
    }
    
    try {
      setLoading(true);

      // 🔥 Create Auth User
      const res = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // 🔥 Save to Firestore
      await setDoc(doc(db, "users", res.user.uid), {
        name: form.name,
        email: form.email,
        gender: form.gender,
        role: form.role, // Save role to database
        applications: [],
        createdAt: new Date()
      });

      alert("User Created Successfully ✅");

      // Reset form including the role
      setForm({
        name: "",
        email: "",
        password: "",
        gender: "male",
        role: "user" 
      });

      onSuccess && onSuccess();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="addUser">

      <h3>Create New User</h3>

      <input
        placeholder="Full Name"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
      />

      <input
        placeholder="Email Address"
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
      />

      <select
        value={form.gender}
        onChange={e => setForm({ ...form, gender: e.target.value })}
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>

      {/* Role Selection Dropdown */}
      <select
        value={form.role}
        onChange={e => setForm({ ...form, role: e.target.value })}
      >
        <option value="user">Customer / User</option>
        <option value="staff">Staff / Desk Operator</option>
        <option value="technician">IT / Hardware Support</option>
        <option value="admin">Manager / Admin</option>
      </select>

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Creating..." : "Create User"}
      </button>

    </div>
  );
}