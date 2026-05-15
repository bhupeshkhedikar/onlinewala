import { useState } from "react";
import { auth } from "./firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import "./Login.css";

export default function Login({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 🔥 New State for Hide/Show
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setError("");
    setLoading(true);

    // 🔥 HARDCODED ADMIN BYPASS
    if (email === "admin@onlinewala.com" && password === "bpk123") {
      if (onLoginSuccess) {
        onLoginSuccess({ 
          uid: "local_admin_bypass", 
          email: email, 
          role: "admin" 
        });
      }
      setLoading(false);
      return; 
    }

    // 🔒 NORMAL FIREBASE LOGIN
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (onLoginSuccess) {
        onLoginSuccess(userCredential.user);
      }
    } catch (err) {
      console.error("Login Error:", err.code);
      setError("चुकीचा ईमेल किंवा पासवर्ड. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Background Glowing Orbs */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="auth-card fade-in">
        <div className="auth-header">
          <div className="auth-logo">🔒</div>
          <h2>पुन्हा स्वागत आहे</h2>
          <p>तुमच्या डॅशबोर्डवर जाण्यासाठी साइन इन करा.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="email">ईमेल आयडी</label>
            <input 
              type="email" 
              id="email" 
              placeholder="admin@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">पासवर्ड</label>
            {/* 🔥 Password Wrapper added for the icon */}
            <div className="password-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <span 
                className="toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "तपासणी होत आहे..." : "साइन इन करा"}
          </button>
        </form>

        <div className="auth-footer">
          तुमचे खाते नाही का?{" "}
          <span onClick={onSwitchToSignup} className="auth-link">खाते तयार करा</span>
        </div>
      </div>
    </div>
  );
}