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

        {/* Column 2: Quick Links */}
        <div className="ow-col-links">
          <h4 className="ow-link-title">मुख्य सेवा</h4>
          <ul className="ow-link-list">
            <li><a href="#booking">सेवा बुक करा</a></li>
            <li><a href="#documents">आवश्यक कागदपत्रे</a></li>
            <li><a href="#status">अर्जाची स्थिती पहा</a></li>
            <li><a href="#offers">लकी ड्रॉ / ऑफर्स</a></li>
          </ul>
        </div>

        {/* Column 3: Legal & Support */}
        <div className="ow-col-links">
          <h4 className="ow-link-title">सपोर्ट आणि नियम</h4>
          <ul className="ow-link-list">
            <li><a href="#about">आमच्याबद्दल</a></li>
            <li><a href="#contact">संपर्क साधा</a></li>
            <li><a href="#privacy">गोपनीयता धोरण (Privacy)</a></li>
            <li><a href="#terms">अटी आणि शर्ती (Terms)</a></li>
          </ul>
        </div>

        {/* Column 4: Contact & Social */}
        <div className="ow-col-contact">
          <h4 className="ow-link-title">आमच्याशी जोडून राहा</h4>
          <p className="ow-contact-text">✉️ support@onlinewalaa.com</p>
          <p className="ow-contact-text">📞 +91 98765 43210</p>
          
          <div className="ow-social-icons">
            <a href="#whatsapp" className="ow-social-btn whatsapp" title="WhatsApp">
              <i className="fab fa-whatsapp"></i> WhatsApp
            </a>
            <a href="#instagram" className="ow-social-btn instagram" title="Instagram">
              <i className="fab fa-instagram"></i> Instagram
            </a>
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