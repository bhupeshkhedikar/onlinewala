import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ow-footer">
      {/* Animated Top Gradient Border */}
      <div className="ow-animated-border"></div>

      <div className="ow-footer-container">
        {/* Column 1: Brand Info with ANIMATED LOGO */}
        <div className="ow-col-brand">
          <div className="ow-animated-logo">
            <div className="ow-logo-icon">
              <span className="ow-dot ow-dot-blue"></span>
              <span className="ow-dot ow-dot-orange"></span>
            </div>
            <h2 className="ow-logo-text">
              <span className="ow-text-part ow-blue">ऑनलाइन</span>
              <span className="ow-text-part ow-orange">वाला</span>
            </h2>
          </div>
          
          <p className="ow-tagline">सर्व ऑनलाइन कामे, एकाच ठिकाणी</p>
          <p className="ow-sub-tagline">फास्ट, अचूक, विश्वासार्ह</p>
          
          <div className="ow-trust-badges">
            <span className="badge">🔒 १००% सुरक्षित</span>
            <span className="badge">⚡ जलद सेवा</span>
          </div>
        </div>

        {/* Column 2: Contact & Social */}
        <div className="ow-col-contact">
          <h4 className="ow-info-title">आमच्याशी संपर्क साधा</h4>
          <p className="ow-contact-text">✉️ support@onlinewala.com</p>
          <p className="ow-contact-text">📞 +91 98765 43210</p>
          
          <div className="ow-social-icons">
            <span className="ow-social-btn whatsapp">
              <i className="fab fa-whatsapp"></i> WhatsApp
            </span>
            <span className="ow-social-btn instagram">
              <i className="fab fa-instagram"></i> Instagram
            </span>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="ow-footer-bottom">
        <p>&copy; {new Date().getFullYear()} ऑनलाइनवाला. सर्व हक्क राखीव.</p>
        <p className="ow-made-with">
          Made with <span className="ow-heart">❤️</span> in Maharashtra
        </p>
      </div>
    </footer>
  );
}