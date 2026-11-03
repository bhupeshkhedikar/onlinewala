
import React from "react";

export default function AboutUs() {
  return (
    <div className="about-page">
      <style>{`
        .about-page {
          --primary: #2563eb;
          --primary-dark: #1d4ed8;
          --text: #172033;
          --muted: #64748b;
          --bg: #f8fafc;
          font-family: Inter, Arial, sans-serif;
          color: var(--text);
          background: #fff;
          overflow: hidden;
        }
        .about-page * { box-sizing: border-box; }
        .about-container { width: min(1160px, 92%); margin: auto; }
        .about-hero {
          background: linear-gradient(135deg, #eff6ff, #f8fafc 65%, #eef2ff);
          padding: 85px 0 75px;
        }
        .about-hero-content {
          max-width: 800px; margin: auto; text-align: center;
        }
        .about-label {
          display: inline-block; padding: 9px 16px;
          border-radius: 30px; background: #dbeafe;
          color: var(--primary-dark); font-size: 13px;
          font-weight: 700; letter-spacing: .4px; margin-bottom: 20px;
        }
        .about-hero h1 {
          font-size: clamp(36px, 5vw, 58px); line-height: 1.2;
          letter-spacing: -1px; margin: 0 0 22px; font-weight: 800;
        }
        .about-hero h1 span { color: var(--primary); }
        .about-hero p {
          color: #526176; font-size: 18px; line-height: 1.8;
          margin: 0 auto; max-width: 720px;
        }
        .about-section { padding: 75px 0; }
        .about-intro-grid {
          display: grid; grid-template-columns: 1.05fr .95fr;
          gap: 55px; align-items: center;
        }
        .about-section h2 {
          font-size: clamp(28px, 3vw, 38px); line-height: 1.3;
          margin: 0 0 20px; letter-spacing: -.5px;
        }
        .about-section p {
          color: var(--muted); font-size: 16px;
          line-height: 1.9; margin: 0 0 16px;
        }
        .about-highlight {
          background: #f1f5f9; border: 1px solid #e2e8f0;
          border-radius: 22px; padding: 35px;
        }
        .about-highlight-icon {
          width: 54px; height: 54px; border-radius: 16px;
          background: #dbeafe; display: flex; align-items: center;
          justify-content: center; color: var(--primary);
          font-size: 25px; margin-bottom: 22px;
        }
        .about-highlight h3 { font-size: 22px; margin: 0 0 12px; }
        .about-founder { background: var(--bg); }
        .about-founder-card {
          display: grid; grid-template-columns: 150px 1fr;
          gap: 30px; align-items: center; max-width: 850px;
          margin: auto; background: #fff; border: 1px solid #e8edf4;
          border-radius: 24px; padding: 38px;
          box-shadow: 0 12px 35px rgba(15, 23, 42, .04);
        }
        .about-founder-avatar {
          width: 140px; height: 140px; border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          color: white; display: flex; align-items: center;
          justify-content: center; font-size: 42px; font-weight: 800;
        }
        .about-founder-card h2 { margin-bottom: 8px; }
        .about-founder-role {
          color: var(--primary); font-size: 14px;
          font-weight: 700; margin-bottom: 15px;
        }
        .about-values-heading {
          text-align: center; max-width: 650px; margin: 0 auto 42px;
        }
        .about-values-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;
        }
        .about-value-card {
          border: 1px solid #e8edf4; border-radius: 20px;
          padding: 28px; background: #fff;
          transition: transform .25s, box-shadow .25s;
        }
        .about-value-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 35px rgba(15, 23, 42, .07);
        }
        .about-value-icon {
          width: 48px; height: 48px; display: flex;
          align-items: center; justify-content: center;
          border-radius: 14px; background: #eff6ff;
          font-size: 23px; margin-bottom: 20px;
        }
        .about-value-card h3 { font-size: 19px; margin: 0 0 12px; }
        .about-value-card p { font-size: 15px; margin: 0; }
        .about-cta { padding: 0 0 80px; }
        .about-cta-box {
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: white; border-radius: 26px; padding: 55px 35px;
          text-align: center;
        }
        .about-cta-box h2 { color: white; margin-bottom: 15px; }
        .about-cta-box p {
          color: #dbeafe; max-width: 650px; margin: 0 auto 28px;
        }
        .about-cta-button {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 14px 25px; border-radius: 10px;
          background: white; color: #1d4ed8; text-decoration: none;
          font-size: 15px; font-weight: 700; transition: .2s;
        }
        .about-cta-button:hover { background: #eff6ff; transform: translateY(-2px); }
        @media (max-width: 768px) {
          .about-hero { padding: 60px 0 55px; }
          .about-hero p { font-size: 16px; }
          .about-section { padding: 55px 0; }
          .about-intro-grid { grid-template-columns: 1fr; gap: 28px; }
          .about-highlight { padding: 28px; }
          .about-founder-card {
            grid-template-columns: 1fr; text-align: center;
            padding: 28px 22px;
          }
          .about-founder-avatar {
            margin: auto; width: 110px; height: 110px; font-size: 34px;
          }
          .about-values-grid { grid-template-columns: 1fr; gap: 16px; }
          .about-value-card { padding: 24px; }
          .about-cta { padding-bottom: 55px; }
          .about-cta-box { padding: 40px 22px; }
        }
      `}</style>

      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-container about-hero-content">
          <span className="about-label">ONLINEWALAA विषयी</span>

          <h1>
            ऑनलाइन सेवा आता
            <br />
            <span>अधिक सोप्या आणि सुलभ</span>
          </h1>

          <p>
            Onlinewalaa चे उद्दिष्ट ऑनलाइन सेवा समजून घेणे
            आणि त्यांचा लाभ घेणे अधिक सोपे करणे आहे.
            आम्ही ग्राहकांना सोयीस्कर, पारदर्शक आणि
            विश्वासार्ह डिजिटल अनुभव देण्याचा प्रयत्न करतो.
          </p>
        </div>
      </section>

      {/* About Us */}
      <section className="about-section">
        <div className="about-container about-intro-grid">
          <div>
            <span className="about-label">आमच्याविषयी</span>

            <h2>
              तुमच्या सोयीसाठी तयार केलेले डिजिटल व्यासपीठ
            </h2>

            <p>
              Onlinewalaa ची सुरुवात लोकांना ऑनलाइन सेवा
              अधिक सहजतेने आणि आत्मविश्वासाने वापरता याव्यात
              या उद्देशाने करण्यात आली.
            </p>

            <p>
              अनेकदा ऑनलाइन प्रक्रिया समजून घेणे किंवा
              आवश्यक माहिती मिळवणे कठीण वाटू शकते.
              हीच अडचण कमी करण्यासाठी आम्ही सोपी माहिती,
              मार्गदर्शन आणि ग्राहक सहाय्य उपलब्ध करून
              देण्याचा प्रयत्न करतो.
            </p>

            <p>
              तंत्रज्ञानाचा उपयोग दैनंदिन कामे सोपी करण्यासाठी
              आणि उपयुक्त सेवा अधिक लोकांपर्यंत पोहोचवण्यासाठी
              व्हावा, असा आमचा विश्वास आहे.
            </p>
          </div>

          <div className="about-highlight">
            <div className="about-highlight-icon">✦</div>

            <h3>आमचे उद्दिष्ट</h3>

            <p>
              ग्राहकांना आवश्यक माहिती मिळवता यावी,
              उपलब्ध सेवांची योग्य समज व्हावी आणि गरजेनुसार
              मदत मिळावी, असा विश्वासार्ह ऑनलाइन अनुभव
              निर्माण करणे हे आमचे उद्दिष्ट आहे.
            </p>

            <p>
              सोपेपणा, पारदर्शकता आणि ग्राहकांचे समाधान
              ही आमच्या कामाची मुख्य तत्त्वे आहेत.
            </p>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="about-section about-founder">
        <div className="about-container">
          <div className="about-founder-card">
            <div className="about-founder-avatar">BK</div>

            <div>
              <span className="about-label">आमचे संस्थापक</span>

              <h2>Bhupesh Prakash Khedikar</h2>

              <div className="about-founder-role">
                संस्थापक आणि मालक, Onlinewalaa
              </div>

              <p>
                Onlinewalaa ची स्थापना Bhupesh Prakash
                Khedikar यांनी नोव्हेंबर2026 मध्ये ऑनलाइन सेवा अधिक सोप्या
                आणि सर्वांसाठी सुलभ करण्याच्या दृष्टिकोनातून केली.
              </p>

              <p>
                व्यावहारिक उपाय, पारदर्शक संवाद आणि
                ग्राहकांच्या गरजांवर लक्ष केंद्रित करून
                लोकांना विश्वासाने वापरता येईल असे डिजिटल
                व्यासपीठ निर्माण करण्याचा त्यांचा प्रयत्न आहे.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="about-section">
        <div className="about-container">
          <div className="about-values-heading">
            <span className="about-label">आमची मूल्ये</span>

            <h2>आमच्यासाठी महत्त्वाच्या गोष्टी</h2>

            <p>
              आमच्या कामाला दिशा देणारी आणि ग्राहकांना
              चांगला अनुभव देण्यासाठी मार्गदर्शन करणारी
              आमची मूलभूत तत्त्वे.
            </p>
          </div>

          <div className="about-values-grid">
            <div className="about-value-card">
              <div className="about-value-icon">◎</div>
              <h3>पारदर्शकता</h3>
              <p>
                आमच्या सेवा, प्रक्रिया आणि लागू शुल्काबद्दल
                स्पष्ट माहिती देणे, जेणेकरून ग्राहकांना
                प्रत्येक गोष्ट समजण्यास सोपी जाईल.
              </p>
            </div>

            <div className="about-value-card">
              <div className="about-value-icon">♡</div>
              <h3>ग्राहक प्रथम</h3>
              <p>
                प्रत्येक ग्राहकाच्या गरजांना महत्त्व देऊन
                त्यांच्या संपूर्ण अनुभवात उपयुक्त सहाय्य
                देण्याचा आम्ही प्रयत्न करतो.
              </p>
            </div>

            <div className="about-value-card">
              <div className="about-value-icon">✧</div>
              <h3>सोपेपणा</h3>
              <p>
                सोपी माहिती आणि वापरण्यास सहज असे
                व्यासपीठ उपलब्ध करून ऑनलाइन प्रक्रिया
                अधिक सुलभ करण्याचा आमचा प्रयत्न आहे.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="about-cta">
        <div className="about-container">
          <div className="about-cta-box">
            <h2>आम्ही तुमच्या मदतीसाठी आहोत</h2>

            <p>
              Onlinewalaa बद्दल काही प्रश्न आहेत किंवा
              मदतीची आवश्यकता आहे?
              आमच्या सहाय्यक टीमशी संपर्क साधा.
            </p>

            <a
              href="mailto:support@onlinewalaa.com"
              className="about-cta-button"
            >
              आमच्याशी संपर्क साधा →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
