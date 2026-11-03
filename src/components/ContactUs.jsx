
import React, { useState } from "react";

export default function ContactUs() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const mailtoLink =
      `mailto:support@onlinewalaa.com` +
      `?subject=${encodeURIComponent(form.subject || "Onlinewalaa Contact Request")}` +
      `&body=${encodeURIComponent(
        `नाव: ${form.name}\nईमेल: ${form.email}\n\nसंदेश:\n${form.message}`
      )}`;

    window.location.href = mailtoLink;
  };

  return (
    <div className="contact-page">
      <style>{`
        .contact-page {
          --primary: #2563eb;
          --primary-dark: #1d4ed8;
          --text: #172033;
          --muted: #64748b;
          font-family: Inter, Arial, sans-serif;
          color: var(--text);
          background: #fff;
        }

        .contact-page * { box-sizing: border-box; }

        .contact-container {
          width: min(1160px, 92%);
          margin: auto;
        }

        .contact-hero {
          background: linear-gradient(135deg, #eff6ff, #f8fafc 65%, #eef2ff);
          padding: 75px 0;
          text-align: center;
        }

        .contact-label {
          display: inline-block;
          padding: 9px 16px;
          border-radius: 30px;
          background: #dbeafe;
          color: var(--primary-dark);
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .contact-hero h1 {
          font-size: clamp(34px, 5vw, 54px);
          line-height: 1.2;
          margin: 0 0 18px;
          font-weight: 800;
        }

        .contact-hero h1 span { color: var(--primary); }

        .contact-hero p {
          max-width: 700px;
          margin: auto;
          color: #526176;
          font-size: 17px;
          line-height: 1.8;
        }

        .contact-main { padding: 75px 0; }

        .contact-grid {
          display: grid;
          grid-template-columns: .85fr 1.15fr;
          gap: 35px;
          align-items: start;
        }

        .contact-info {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 35px;
        }

        .contact-info h2,
        .contact-form-card h2 {
          font-size: 27px;
          margin: 0 0 15px;
        }

        .contact-info > p {
          color: var(--muted);
          font-size: 15px;
          line-height: 1.8;
          margin-bottom: 28px;
        }

        .contact-info-item {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          margin-top: 24px;
        }

        .contact-info-icon {
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          border-radius: 14px;
          background: #dbeafe;
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
        }

        .contact-info-item h3 {
          font-size: 16px;
          margin: 2px 0 7px;
        }

        .contact-info-item p,
        .contact-info-item a {
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
          margin: 0;
          text-decoration: none;
          overflow-wrap: anywhere;
        }

        .contact-info-item a:hover { color: var(--primary); }

        .contact-form-card {
          border: 1px solid #e8edf4;
          border-radius: 24px;
          padding: 38px;
          box-shadow: 0 12px 35px rgba(15, 23, 42, .04);
        }

        .contact-form-card > p {
          color: var(--muted);
          font-size: 15px;
          line-height: 1.8;
          margin-bottom: 28px;
        }

        .contact-form {
          display: grid;
          gap: 19px;
        }

        .contact-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .contact-form label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .contact-form input,
        .contact-form textarea {
          width: 100%;
          padding: 14px 15px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          background: #fff;
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }

        .contact-form input:focus,
        .contact-form textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .1);
        }

        .contact-form textarea {
          min-height: 145px;
          resize: vertical;
        }

        .contact-submit {
          border: none;
          border-radius: 10px;
          background: var(--primary);
          color: #fff;
          padding: 15px 24px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s, transform .2s;
        }

        .contact-submit:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
        }

        .contact-note {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.6;
          margin-top: 15px;
        }

        .contact-bottom {
          padding: 0 0 75px;
        }

        .contact-bottom-box {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: white;
          text-align: center;
          padding: 42px 25px;
          border-radius: 24px;
        }

        .contact-bottom-box h2 {
          margin: 0 0 12px;
          font-size: 26px;
        }

        .contact-bottom-box p {
          color: #dbeafe;
          margin: 0;
          line-height: 1.8;
        }

        @media (max-width: 768px) {
          .contact-hero { padding: 55px 0; }
          .contact-hero p { font-size: 15px; }
          .contact-main { padding: 50px 0; }
          .contact-grid { grid-template-columns: 1fr; gap: 22px; }
          .contact-info, .contact-form-card { padding: 25px 22px; }
          .contact-form-row { grid-template-columns: 1fr; gap: 19px; }
          .contact-info h2, .contact-form-card h2 { font-size: 24px; }
          .contact-bottom { padding-bottom: 50px; }
        }
      `}</style>

      {/* Hero */}
      <section className="contact-hero">
        <div className="contact-container">
          <span className="contact-label">संपर्क साधा</span>

          <h1>
            आम्ही तुमच्या <span>मदतीसाठी</span> आहोत
          </h1>

          <p>
            Onlinewalaa बद्दल काही प्रश्न आहेत किंवा
            आमच्या सेवांसाठी मदतीची आवश्यकता आहे?
            आम्हाला तुमचे म्हणणे कळवा.
            आम्ही तुम्हाला मदत करण्यासाठी नेहमी प्रयत्नशील आहोत.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="contact-main">
        <div className="contact-container contact-grid">

          {/* Contact Information */}
          <div className="contact-info">
            <h2>आमच्याशी संपर्क साधा</h2>

            <p>
              तुमचे प्रश्न, सूचना किंवा अभिप्राय
              आम्हाला महत्त्वाचे आहेत.
              खाली दिलेल्या माध्यमातून आमच्याशी संपर्क साधा.
            </p>

            <div className="contact-info-item">
              <div className="contact-info-icon">✉</div>
              <div>
                <h3>ईमेल सहाय्य</h3>
                <a href="mailto:support@onlinewalaa.com">
                  support@onlinewalaa.com
                </a>
                <p>तुमच्या प्रश्नांसाठी आम्हाला ईमेल करा.</p>
              </div>
            </div>

            <div className="contact-info-item">
              <div className="contact-info-icon">◷</div>
              <div>
                <h3>सहाय्य वेळ</h3>
                <p>
                  ईमेलद्वारे कधीही संपर्क साधू शकता.
                  आम्ही शक्य तितक्या लवकर उत्तर देण्याचा
                  प्रयत्न करू.
                </p>
              </div>
            </div>

            <div className="contact-info-item">
              <div className="contact-info-icon">◎</div>
              <div>
                <h3>Onlinewalaa Support</h3>
                <p>
                  ग्राहकांच्या प्रश्नांना योग्य मार्गदर्शन
                  आणि सहाय्य देणे हे आमचे प्राधान्य आहे.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-card">
            <h2>आम्हाला संदेश पाठवा</h2>

            <p>
              खालील फॉर्ममध्ये तुमची माहिती आणि
              संदेश भरा. आम्हाला तुमच्याशी संपर्क
              साधण्यात आनंद होईल.
            </p>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div>
                  <label htmlFor="contact-name">तुमचे नाव *</label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    placeholder="तुमचे पूर्ण नाव"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="contact-email">ईमेल पत्ता *</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    placeholder="तुमचा ईमेल पत्ता"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject">विषय</label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  placeholder="संदेशाचा विषय"
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="contact-message">तुमचा संदेश *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="तुमचा प्रश्न किंवा संदेश येथे लिहा..."
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="contact-submit">
                संदेश पाठवा →
              </button>
            </form>

            <div className="contact-note">
              संदेश पाठवताना तुमचा ईमेल ॲप उघडेल.
              त्यामधून ईमेल पाठवण्याची पुष्टी करा.
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="contact-bottom">
        <div className="contact-container">
          <div className="contact-bottom-box">
            <h2>तुमचा विश्वास, आमची जबाबदारी</h2>
            <p>
              Onlinewalaa सोबत जोडल्याबद्दल धन्यवाद.
              तुमच्या सेवेसाठी आम्ही सदैव प्रयत्नशील आहोत.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
