import { useState } from "react";
import { auth, db } from "./firebase"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "./Login.css"; 

export default function Signup({ onLoginSuccess, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 🔥 New State for Hide/Show
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault(); 
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🎁 Create User Profile in Firestore with 1 FREE SPIN
      await setDoc(doc(db, "users", user.uid), {
        name: name,
        mobile: mobile,
        email: email,
        password: password, // Note: Storing plain password is not recommended in production
        role: "user",
        tickets: 1, // 🎉 Welcome Bonus: 1 Free Spin
        createdAt: new Date()
      });

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
      
    } catch (err) {
      console.error("Signup Error:", err.code);
      if (err.code === "auth/email-already-in-use") {
        setError("हा ईमेल आधीच नोंदणीकृत आहे. कृपया लॉग इन करा.");
      } else if (err.code === "auth/weak-password") {
        setError("पासवर्ड किमान ६ अक्षरांचा असावा.");
      } else {
        setError("काहीतरी चूक झाली आहे, कृपया पुन्हा प्रयत्न करा.");
      }
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
          <div className="auth-logo">✨</div>
          <h2>खाते तयार करा</h2>
          <p>आत्ताच सामील व्हा आणि <strong className="text-yellow">१ फ्री स्पिन मिळवा!</strong></p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSignup} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="name">पूर्ण नाव</label>
            <input 
              type="text" 
              id="name" 
              placeholder="उदा. राहुल पाटील" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="email">ईमेल आयडी</label>
            <input 
              type="email" 
              id="email" 
              placeholder="rahul@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="mobile">मोबाईल नंबर</label>
            <input 
              type="tel" 
              id="mobile" 
              placeholder="९८७६५४३२१०" 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)} 
              required 
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">सुरक्षित पासवर्ड</label>
            {/* 🔥 Password Wrapper added for the icon */}
            <div className="password-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength="6" 
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
            {loading ? "प्रोफाईल तयार होत येत आहे..." : "साइन अप करा आणि स्पिन मिळवा"}
          </button>
        </form>

        <div className="auth-footer">
          आधीपासूनच खाते आहे का?{" "}
          <span onClick={onSwitchToLogin} className="auth-link">लॉग इन करा</span>
        </div>
      </div>
    </div>
  );
}