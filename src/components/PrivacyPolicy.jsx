// PrivacyPolicy.jsx
import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <style>{`
        .privacy-page {
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

        .privacy-container {
          max-width: 1000px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
        }

        .privacy-header {
          border-bottom: 3px solid var(--blue);
          padding-bottom: 22px;
          margin-bottom: 30px;
        }

        .privacy-header h1 {
          color: var(--dark-blue);
          font-size: 32px;
          margin: 0 0 12px;
        }

        .privacy-header p {
          color: var(--muted);
          margin: 0;
          line-height: 1.7;
        }

        .privacy-section {
          margin-bottom: 28px;
        }

        .privacy-section h2 {
          color: var(--dark-blue);
          font-size: 21px;
          margin: 0 0 12px;
        }

        .privacy-section p,
        .privacy-section li {
          font-size: 15px;
          line-height: 1.8;
          color: #374151;
        }

        .privacy-section ul {
          padding-left: 22px;
          margin: 10px 0;
        }

        .privacy-note {
          background: #eff6ff;
          border-left: 4px solid var(--blue);
          border-radius: 8px;
          padding: 16px 18px;
          margin: 24px 0;
          line-height: 1.7;
          color: #1e40af;
        }

        .privacy-section a {
          color: var(--blue);
          text-decoration: none;
          font-weight: 600;
        }

        .privacy-section a:hover {
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .privacy-page {
            padding: 24px 12px;
          }

          .privacy-container {
            padding: 24px 18px;
            border-radius: 12px;
          }

          .privacy-header h1 {
            font-size: 26px;
          }

          .privacy-section h2 {
            font-size: 19px;
          }

          .privacy-section p,
          .privacy-section li {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="privacy-container">
        <header className="privacy-header">
          <h1>गोपनीयता धोरण (Privacy Policy)</h1>
          <p>
            Onlinewalaa वर आपल्या वैयक्तिक माहितीची गोपनीयता आणि सुरक्षितता
            महत्त्वाची आहे. या धोरणामध्ये वेबसाइट वापरताना माहिती कशी गोळा,
            वापरली आणि सामायिक केली जाऊ शकते याची माहिती दिली आहे.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong>अंतिम अद्ययावत:</strong> 3 नोव्हेंबर 2026
          </p>
        </header>

        <div className="privacy-note">
          कृपया वेबसाइटवर उपलब्ध असलेल्या सेवा आणि फॉर्मनुसारच आपली माहिती
          द्या. कोणताही OTP, पासवर्ड किंवा बँकिंग PIN आमच्यासोबत किंवा
          कोणत्याही अनधिकृत व्यक्तीसोबत शेअर करू नका.
        </div>

        <section className="privacy-section">
          <h2>1. आम्ही कोणती माहिती गोळा करू शकतो?</h2>
          <p>आपण वेबसाइट वापरताना किंवा आमच्याशी संपर्क साधताना खालील माहिती देऊ शकता:</p>
          <ul>
            <li>नाव, ईमेल पत्ता आणि मोबाइल नंबर</li>
            <li>आपण फॉर्ममध्ये किंवा सेवा विनंतीमध्ये दिलेली माहिती</li>
            <li>सेवेसाठी आवश्यक असल्यास, आपण स्वेच्छेने अपलोड केलेली कागदपत्रे</li>
            <li>पेमेंट केल्यास, व्यवहाराची स्थिती किंवा संदर्भ क्रमांक</li>
            <li>वेबसाइट वापराशी संबंधित तांत्रिक माहिती, जसे की ब्राउझर किंवा डिव्हाइस माहिती</li>
          </ul>
          <p>
            प्रत्यक्षात गोळा न होणाऱ्या माहितीचे प्रकार या धोरणातून काढून टाका.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. माहितीचा वापर कशासाठी केला जातो?</h2>
          <ul>
            <li>आपल्या विनंतीला प्रतिसाद देण्यासाठी आणि सेवा-संबंधित मदत देण्यासाठी</li>
            <li>आपण सादर केलेली माहिती किंवा अर्ज प्रक्रिया करण्यासाठी</li>
            <li>सेवेची स्थिती, सूचना किंवा आवश्यक अपडेट्स देण्यासाठी</li>
            <li>वेबसाइटची कार्यक्षमता आणि वापरकर्ता अनुभव सुधारण्यासाठी</li>
            <li>फसवणूक, गैरवापर किंवा सुरक्षा समस्यांची तपासणी करण्यासाठी</li>
            <li>कायदेशीर आवश्यकतांचे पालन करण्यासाठी</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. माहिती कोणासोबत सामायिक केली जाऊ शकते?</h2>
          <p>
            सेवा पूर्ण करण्यासाठी आवश्यक असल्यास, माहिती संबंधित सेवा प्रदाते,
            तांत्रिक भागीदार किंवा पेमेंट प्रदात्यांसोबत सामायिक केली जाऊ शकते.
            कायद्याने आवश्यक असल्यास संबंधित अधिकाऱ्यांना माहिती दिली जाऊ शकते.
          </p>
          <p>
            आम्ही माहिती विकण्याचा उद्देश ठेवत नाही. आपल्या वेबसाइटच्या प्रत्यक्ष
            डेटा-शेअरिंग पद्धतीनुसार हा मजकूर तपासून घ्या.
          </p>
        </section>

        <section className="privacy-section">
          <h2>4. पेमेंट आणि तृतीय-पक्ष सेवा</h2>
          <p>
            वेबसाइटवर पेमेंट सुविधा उपलब्ध असल्यास, व्यवहार तृतीय-पक्ष पेमेंट
            प्रदात्याद्वारे प्रक्रिया केला जाऊ शकतो. त्या प्रदात्याच्या
            गोपनीयता धोरण आणि अटी लागू होऊ शकतात.
          </p>
          <p>
            इतर वेबसाइट्सच्या लिंकवर क्लिक केल्यास, त्या वेबसाइट्सच्या
            गोपनीयता धोरणासाठी Onlinewalaa जबाबदार नसू शकते.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Cookies आणि तांत्रिक माहिती</h2>
          <p>
            वेबसाइटची मूलभूत कार्यक्षमता, पसंती लक्षात ठेवणे किंवा वापराचे
            विश्लेषण करण्यासाठी cookies किंवा तत्सम तंत्रज्ञान वापरले जाऊ शकते,
            जर ते वेबसाइटवर सक्षम केलेले असतील. आपण आपल्या ब्राउझरमधून cookies
            नियंत्रित करू शकता.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. माहिती किती काळ ठेवली जाते?</h2>
          <p>
            सेवा पूर्ण करणे, नोंदी ठेवणे, कायदेशीर आवश्यकता पूर्ण करणे किंवा
            विवाद सोडवणे यासाठी आवश्यक असेपर्यंत माहिती ठेवली जाऊ शकते.
            लागू असलेल्या आवश्यकतांनुसार माहिती हटवली किंवा अनामिक केली जाऊ शकते.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. माहितीची सुरक्षा</h2>
          <p>
            माहितीचे अनधिकृत प्रवेश, वापर किंवा प्रकटीकरण टाळण्यासाठी योग्य
            उपाययोजना करण्याचा प्रयत्न केला जातो. तथापि, इंटरनेटवरील कोणतीही
            माहिती देवाणघेवाण पूर्णपणे सुरक्षित असल्याची हमी देता येत नाही.
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. आपले अधिकार आणि विनंत्या</h2>
          <p>
            आपल्या वैयक्तिक माहितीबाबत प्रवेश, दुरुस्ती किंवा हटवण्याची विनंती
            करण्यासाठी आपण आमच्याशी संपर्क साधू शकता. लागू कायदे आणि आवश्यक
            पडताळणीनुसार विनंती हाताळली जाईल.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. मुलांची गोपनीयता</h2>
          <p>
            पालक किंवा कायदेशीर संरक्षकांच्या देखरेखीशिवाय अल्पवयीन व्यक्तींनी
            वैयक्तिक माहिती सादर करू नये. अशा माहितीबाबत विनंती किंवा चिंता
            असल्यास आमच्याशी संपर्क साधा.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. धोरणातील बदल</h2>
          <p>
            वेबसाइटच्या सेवा, कार्यपद्धती किंवा कायदेशीर आवश्यकतांनुसार हे
            गोपनीयता धोरण वेळोवेळी अद्ययावत केले जाऊ शकते. सुधारित धोरण
            या पृष्ठावर प्रकाशित केले जाईल.
          </p>
        </section>

        <section className="privacy-section">
          <h2>11. संपर्क</h2>
          <p>
            या गोपनीयता धोरणाबाबत प्रश्न किंवा विनंती असल्यास आम्हाला ईमेल करा:
          </p>
          <p>
            <a href="mailto:support@onlinewalaa.com">
              support@onlinewalaa.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}