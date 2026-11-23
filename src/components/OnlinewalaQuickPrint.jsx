
import React from "react";
import "./OnlinewalaQuickPrint.css";

export default function OnlinewalaQuickPrint() {
  const printUrl =
    "https://akprinthub.com/en/service/id-card-print?quick_print=shop_ef5ygxe4mwtjk1yb";

  return (
    <div className="onlinewala-print-page">

      {/* ONLINEWALA HEADER */}
      <header className="ow-print-header">
        <div className="ow-print-brand">
          <div className="ow-print-logo">
            <span>O</span>
          </div>

          <div>
            <h2>ऑनलाइनवाला</h2>
            <p>QUICK PRINT SERVICE</p>
          </div>
        </div>

        <span className="ow-print-location">
          📍 लाखनी
        </span>
      </header>

      {/* DELIVERY INFORMATION */}
      <section className="ow-print-intro">
        <h1>घरबसल्या प्रिंट काढा!    घरपोच प्रिंट सेवा - लाखनी परिसर</h1>

        <p>
          तुमची फाईल अपलोड करा आणि प्रिंट
          थेट तुमच्या घरी मिळवा.
        </p>

        <div className="ow-delivery-options">

          <div className="ow-delivery-card urgent">
            <span>⚡</span>
            <div>
              <strong>तात्काळ डिलिव्हरी</strong>
              <h3>₹20 शुल्क</h3>
              <small>५ ते १० मिनिटे</small>
            </div>
          </div>

          <div className="ow-delivery-card normal">
            <span>🚚</span>
            <div>
              <strong>सामान्य डिलिव्हरी</strong>
              <h3>मोफत डिलिव्हरी</h3>
              <small>३० मिनिटे ते १ तास</small>
            </div>
          </div>

        </div>
      </section>

      {/* QUICK PRINT BUTTON */}
      <section className="ow-print-embed-section">

        <div className="ow-print-action-card">

<div className="ow-print-important-notice">
  <div className="ow-notice-heading">
    ⚠️ महत्त्वाची सूचना
  </div>

  <p>
    प्रिंट ऑर्डर केल्यानंतर कृपया खालील नंबरवर
    कॉल करून आपला पूर्ण पत्ता किंवा Exact
    Delivery Location सांगायला विसरू नका.
    तुम्ही WhatsApp वर लोकेशन देखील पाठवू शकता.
  </p>

  <div className="ow-notice-contact">
    <a href="tel:7218262428">
      📞 7218262428
    </a>

    <a href="tel:9158262428">
      📞 9158262428
    </a>
  </div>

  <div className="ow-notice-whatsapp">
    <a
      href="https://wa.me/917218262428?text=Namaskar%2C%20mi%20print%20order%20dili%20aahe.%20Majhe%20delivery%20location%20share%20karat%20aahe."
      target="_blank"
      rel="noopener noreferrer"
    >
      WhatsApp वर लोकेशन पाठवा
    </a>
  </div>

  <strong>
    पत्ता किंवा लोकेशन मिळाल्यानंतरच डिलिव्हरी करणे शक्य होईल.
  </strong>
</div>

          <div className="ow-print-action-icon">
            🖨️
          </div>

          <h3>तुमची प्रिंट ऑर्डर करा</h3>

          <p>
            A4 Print, ID Card, Color आणि
            Black & White प्रिंट सुविधा.
          </p>

          <a
            href={printUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ow-print-button"
          >
            <span>📄</span>
            Open Quick Print
            <span>↗</span>
          </a>

          <small>
            Onlinewala Quick Print Service
          </small>

        </div>

      </section>

      {/* FOOTER */}
      <footer className="ow-print-footer">
        <strong>ऑनलाइनवाला</strong>
        <p>तुमची सेवा, आमची जबाबदारी!</p>
        <small>
          घरपोच प्रिंट सेवा - लाखनी परिसर
        </small>
      </footer>

    </div>
  );
}
