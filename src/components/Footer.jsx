import React from "react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ow-footer">
      {/* Animated Top Gradient Border */}
      <div className="ow-animated-border"></div>

      <div className="ow-footer-container">
        {/* Column 1: Brand Info */}
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
            <span className="badge">🔒 सुरक्षित सेवा</span>
            <span className="badge">⚡ जलद सेवा</span>
          </div>
        </div>

        {/* Column 2: Pages Created So Far */}
        <div className="ow-col-links">
          <h4 className="ow-info-title">महत्त्वाच्या लिंक</h4>

          <ul className="ow-footer-links">
            <li><a href="/">मुख्यपृष्ठ</a></li>
            <li><a href="/about">आमच्याबद्दल</a></li>
            <li><a href="/contact">संपर्क</a></li>
          </ul>
        </div>

        {/* Column 3: Policies Created So Far */}
        <div className="ow-col-links">
          <h4 className="ow-info-title">धोरणे आणि अटी</h4>

          <ul className="ow-footer-links">
            <li><a href="/terms">Terms &amp; Conditions</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li>
              <a href="/refund-policy">
                Refund &amp; Cancellation Policy
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact & Social */}
        <div className="ow-col-contact">
          <h4 className="ow-info-title">आमच्याशी संपर्क साधा</h4>

          <p className="ow-contact-text">
            ✉️{" "}
            <a href="mailto:support@onlinewalaa.com">
              support@onlinewalaa.com
            </a>
          </p>

          <div className="ow-social-icons">
            <a
              href="#"
              className="ow-social-btn whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-whatsapp"></i> WhatsApp
            </a>

            <a
              href="#"
              className="ow-social-btn instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-instagram"></i> Instagram
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="ow-footer-bottom">
        <p>
          &copy; {new Date().getFullYear()} ऑनलाइनवाला. सर्व हक्क राखीव.
        </p>

        <p className="ow-made-with">
          Made with <span className="ow-heart">❤️</span> in Maharashtra
        </p>
      </div>
    </footer>
  );
}