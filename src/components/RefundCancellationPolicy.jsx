// RefundCancellationPolicy.jsx
import React from "react";

export default function RefundCancellationPolicy() {
  return (
    <div className="refund-policy-page">
      <style>{`
        .refund-policy-page {
          --blue: #2563eb;
          --dark-blue: #1d4ed8;
          --text: #1f2937;
          --muted: #64748b;
          font-family: Arial, sans-serif;
          color: var(--text);
          background: #f8fafc;
          min-height: 100vh;
          padding: 48px 20px;
        }

        .refund-policy-container {
          max-width: 1000px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
        }

        .refund-policy-header {
          border-bottom: 3px solid var(--blue);
          padding-bottom: 22px;
          margin-bottom: 30px;
        }

        .refund-policy-header h1 {
          color: var(--dark-blue);
          font-size: 32px;
          margin: 0 0 12px;
        }

        .refund-policy-header p {
          color: var(--muted);
          margin: 0;
          line-height: 1.7;
        }

        .refund-policy-section {
          margin-bottom: 28px;
        }

        .refund-policy-section h2 {
          color: var(--dark-blue);
          font-size: 21px;
          margin: 0 0 12px;
        }

        .refund-policy-section p,
        .refund-policy-section li {
          font-size: 15px;
          line-height: 1.8;
          color: #374151;
        }

        .refund-policy-section ul {
          padding-left: 22px;
          margin: 10px 0;
        }

        .refund-policy-note {
          background: #eff6ff;
          border-left: 4px solid var(--blue);
          border-radius: 8px;
          padding: 16px 18px;
          margin: 24px 0;
          line-height: 1.7;
          color: #1e40af;
        }

        .refund-policy-section a {
          color: var(--blue);
          text-decoration: none;
          font-weight: 600;
        }

        .refund-policy-section a:hover {
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .refund-policy-page {
            padding: 24px 12px;
          }

          .refund-policy-container {
            padding: 24px 18px;
            border-radius: 12px;
          }

          .refund-policy-header h1 {
            font-size: 26px;
          }

          .refund-policy-section h2 {
            font-size: 19px;
          }

          .refund-policy-section p,
          .refund-policy-section li {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="refund-policy-container">
        <header className="refund-policy-header">
          <h1>Refund & Cancellation Policy</h1>
          <p>
            Onlinewalaa वर सेवा विनंती, पेमेंट, रद्द करणे आणि परतावा
            यासंबंधीची माहिती या धोरणात दिली आहे.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>अंतिम अद्ययावत:</strong> 3 नोव्हेंबर 2026
          </p>
        </header>

        <div className="refund-policy-note">
          कृपया पेमेंट करण्यापूर्वी संबंधित सेवेची माहिती, शुल्क आणि
          अटी काळजीपूर्वक वाचा. प्रत्येक सेवा विनंतीसाठी लागू असलेल्या
          अटी वेगळ्या असू शकतात.
        </div>

        <section className="refund-policy-section">
          <h2>1. सेवा रद्द करण्याची विनंती</h2>
          <p>
            आपण सेवा विनंती रद्द करू इच्छित असल्यास, शक्य तितक्या लवकर
            support@onlinewalaa.com वर विनंती पाठवा. विनंतीवर प्रक्रिया
            सुरू झाली आहे की नाही, यानुसार रद्द करण्याची शक्यता ठरू शकते.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>2. परतावा कधी मिळू शकतो?</h2>
          <p>खालील परिस्थितींमध्ये परताव्याचा विचार केला जाऊ शकतो:</p>
          <ul>
            <li>पेमेंट यशस्वी झाले, परंतु सेवा विनंती सुरू केली गेली नाही.</li>
            <li>एकाच सेवेसाठी चुकून दोनदा पेमेंट झाले.</li>
            <li>Onlinewalaa कडून सेवा देणे शक्य झाले नाही.</li>
            <li>पेमेंट किंवा सेवा प्रक्रियेत पडताळलेली तांत्रिक त्रुटी आढळली.</li>
          </ul>
          <p>
            प्रत्येक विनंतीची तपासणी करून परिस्थितीनुसार निर्णय घेतला जाईल.
            लागू कायद्यानुसार ग्राहकांचे अधिकार अबाधित राहतील.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>3. परतावा लागू न होण्याच्या परिस्थिती</h2>
          <p>खालील परिस्थितींमध्ये परतावा मंजूर होईलच असे नाही:</p>
          <ul>
            <li>सेवा आधीच पूर्ण झाली असेल किंवा प्रक्रिया पूर्णपणे सुरू झाली असेल.</li>
            <li>वापरकर्त्याने चुकीची किंवा अपूर्ण माहिती दिली असेल.</li>
            <li>वापरकर्त्याच्या चुकीमुळे किंवा आवश्यक कागदपत्रे न दिल्यामुळे सेवा थांबली असेल.</li>
            <li>संबंधित सरकारी किंवा तृतीय-पक्ष संस्थेने अर्ज नाकारला असेल आणि Onlinewalaa ने मान्य केलेली सेवा पूर्ण केली असेल.</li>
          </ul>
          <p>
            ही अट लागू कायदे किंवा ग्राहक संरक्षण अधिकारांवर मर्यादा आणत नाही.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>4. सरकारी किंवा तृतीय-पक्ष शुल्क</h2>
          <p>
            एखाद्या सेवेसाठी सरकारी शुल्क, अधिकृत पोर्टल शुल्क किंवा
            तृतीय-पक्ष शुल्क भरले असल्यास, ते शुल्क संबंधित संस्थेच्या
            नियमांनुसार परत मिळू शकते किंवा मिळू शकणार नाही.
          </p>
          <p>
            Onlinewalaa च्या सेवा शुल्काचा आणि इतर संस्थांच्या शुल्काचा
            परतावा स्वतंत्रपणे तपासला जाऊ शकतो.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>5. परताव्याची प्रक्रिया आणि कालावधी</h2>
          <p>
            परतावा मंजूर झाल्यास, तो शक्यतो मूळ पेमेंट पद्धतीने प्रक्रिया
            केला जाईल. परतावा खात्यात जमा होण्याचा कालावधी बँक, कार्ड
            जारीकर्ता किंवा पेमेंट प्रदात्यावर अवलंबून असू शकतो.
          </p>
          <p>
            परताव्याची विनंती तपासण्यासाठी व्यवहार क्रमांक, पेमेंटचा पुरावा
            किंवा सेवा विनंती क्रमांक मागितला जाऊ शकतो.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>6. अयशस्वी किंवा प्रलंबित पेमेंट</h2>
          <p>
            पेमेंट अयशस्वी झाले असले तरी रक्कम खात्यातून वजा झाल्यास,
            प्रथम बँक किंवा पेमेंट प्रदात्याकडील व्यवहार स्थिती तपासा.
            रक्कम परत जमा न झाल्यास व्यवहाराचा संदर्भ क्रमांकासह
            आमच्याशी संपर्क साधा.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>7. परताव्यासाठी संपर्क</h2>
          <p>
            रद्द करणे किंवा परताव्याची विनंती करण्यासाठी खालील ईमेलवर
            संपर्क साधा:
          </p>
          <p>
            <a href="mailto:support@onlinewalaa.com">
              support@onlinewalaa.com
            </a>
          </p>
          <p>
            ईमेलमध्ये आपले नाव, सेवा किंवा विनंती क्रमांक, पेमेंट संदर्भ
            क्रमांक आणि समस्येचे थोडक्यात वर्णन द्या. संवेदनशील माहिती,
            OTP किंवा पासवर्ड पाठवू नका.
          </p>
        </section>

        <section className="refund-policy-section">
          <h2>8. धोरणातील बदल</h2>
          <p>
            Onlinewalaa हे धोरण वेळोवेळी अद्ययावत करू शकते. सुधारित धोरण
            या पृष्ठावर प्रकाशित झाल्यापासून लागू होईल.
          </p>
        </section>
      </div>
    </div>
  );
}