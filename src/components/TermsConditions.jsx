
import React from "react";

export default function TermsConditions() {
  const sections = [
    {
      title: "1. अटींची स्वीकृती",
      content: [
        "Onlinewalaa.com या वेबसाइटला भेट देऊन किंवा तिचा वापर करून तुम्ही या नियम व अटींशी सहमत असल्याचे मान्य करता.",
        "या अटी मान्य नसल्यास कृपया वेबसाइटचा वापर करू नये."
      ]
    },
    {
      title: "2. वेबसाइटचा वापर",
      content: [
        "Onlinewalaa चा वापर केवळ कायदेशीर आणि योग्य कारणांसाठी करावा.",
        "वेबसाइटचा वापर करताना चुकीची माहिती देणे, फसवणूक करणे, इतरांच्या अधिकारांचे उल्लंघन करणे किंवा वेबसाइटच्या कार्यात अडथळा निर्माण करणे प्रतिबंधित आहे.",
        "वेबसाइटवरील माहिती किंवा सेवांचा वापर करताना लागू असलेल्या कायद्यांचे पालन करणे ही वापरकर्त्याची जबाबदारी आहे."
      ]
    },
    {
      title: "3. सेवा आणि माहिती",
      content: [
        "Onlinewalaa विविध ऑनलाइन सेवा आणि त्यासंबंधित माहिती व सहाय्य उपलब्ध करून देण्याच्या उद्देशाने कार्य करते.",
        "सेवांचे स्वरूप, उपलब्धता, प्रक्रिया आणि आवश्यक कागदपत्रे संबंधित सेवेनुसार बदलू शकतात.",
        "काही सेवा तृतीय-पक्षाच्या वेबसाइट्स, संस्था किंवा अधिकृत पोर्टलवर अवलंबून असू शकतात.",
        "सेवेची अंतिम मंजुरी, प्रक्रिया किंवा निर्णय संबंधित अधिकृत संस्था किंवा सेवा प्रदात्याच्या नियमांनुसार घेतला जातो."
      ]
    },
    {
      title: "4. वापरकर्त्याची जबाबदारी",
      content: [
        "वापरकर्त्याने दिलेली माहिती अचूक, पूर्ण आणि अद्ययावत असणे आवश्यक आहे.",
        "आवश्यक कागदपत्रे आणि माहिती योग्य स्वरूपात देणे ही वापरकर्त्याची जबाबदारी आहे.",
        "चुकीची किंवा अपूर्ण माहिती दिल्यामुळे होणाऱ्या विलंबासाठी किंवा समस्यांसाठी वापरकर्ता जबाबदार असेल.",
        "वापरकर्त्याने स्वतःच्या खात्याची आणि वैयक्तिक माहितीची सुरक्षितता राखावी."
      ]
    },
    {
      title: "5. शुल्क आणि पेमेंट",
      content: [
        "काही सेवांसाठी शुल्क लागू होऊ शकते. लागू असलेले शुल्क सेवा सुरू करण्यापूर्वी स्पष्ट केले जाईल.",
        "वापरकर्त्याने सेवा शुल्क आणि लागू असलेले अधिकृत शुल्क यांची माहिती तपासून पेमेंट करावे.",
        "पेमेंट करताना योग्य माहिती देणे आणि व्यवहाराची पावती जतन करणे वापरकर्त्याची जबाबदारी आहे.",
        "पेमेंटमध्ये अडचण आल्यास support@onlinewalaa.com वर संपर्क साधावा."
      ]
    },
    {
      title: "6. सेवा पूर्ण होणे आणि विलंब",
      content: [
        "सेवा पूर्ण होण्यासाठी लागणारा वेळ सेवेनुसार आणि संबंधित संस्थेच्या प्रक्रियेनुसार बदलू शकतो.",
        "तांत्रिक अडचणी, सरकारी पोर्टलवरील समस्या, तृतीय-पक्ष सेवा किंवा आवश्यक माहिती अपूर्ण असल्यामुळे विलंब होऊ शकतो.",
        "सेवेची निश्चित वेळ किंवा मंजुरीची हमी दिलेली नसल्यास ती हमी समजली जाणार नाही."
      ]
    },
    {
      title: "7. परतावा आणि रद्द करण्याचे नियम",
      content: [
        "परतावा आणि सेवा रद्द करण्यासंबंधीचे नियम आमच्या Refund Policy मध्ये दिलेले आहेत.",
        "पेमेंट करण्यापूर्वी संबंधित सेवेसाठी लागू असलेले परतावा नियम तपासावेत.",
        "परताव्याची पात्रता सेवा पूर्ण झाली आहे की नाही आणि संबंधित प्रक्रिया सुरू झाली आहे की नाही यावर अवलंबून असू शकते."
      ]
    },
    {
      title: "8. तृतीय-पक्षाच्या वेबसाइट्स",
      content: [
        "Onlinewalaa वरून इतर वेबसाइट्स किंवा बाह्य पोर्टल्सच्या लिंक्स उपलब्ध असू शकतात.",
        "या वेबसाइट्सवरील माहिती, सेवा, सुरक्षितता किंवा त्यांच्या नियमांसाठी संबंधित वेबसाइटचे संचालक जबाबदार असतात.",
        "बाह्य वेबसाइटचा वापर करताना तिच्या नियम व गोपनीयता धोरणाचे पालन करावे."
      ]
    },
    {
      title: "9. बौद्धिक संपदा",
      content: [
        "Onlinewalaa वेबसाइटवरील मजकूर, डिझाइन, लोगो, ग्राफिक्स आणि इतर सामग्रीचे अधिकार संबंधित मालकांकडे आहेत.",
        "पूर्वपरवानगीशिवाय वेबसाइटवरील सामग्रीची प्रत बनवणे, पुनर्प्रकाशित करणे किंवा व्यावसायिक वापर करणे परवानगीशिवाय करू नये."
      ]
    },
    {
      title: "10. जबाबदारीची मर्यादा",
      content: [
        "वेबसाइटवरील माहिती शक्य तितकी अचूक आणि अद्ययावत ठेवण्याचा प्रयत्न केला जातो.",
        "तृतीय-पक्षाच्या सेवा, बाह्य पोर्टल्स, तांत्रिक अडचणी किंवा संबंधित संस्थांच्या निर्णयांमुळे उद्भवणाऱ्या समस्यांवर Onlinewalaa चे नियंत्रण नसू शकते.",
        "कायद्याने परवानगी दिलेल्या मर्यादेत, वेबसाइटच्या वापरामुळे उद्भवणाऱ्या अप्रत्यक्ष नुकसानीसाठी Onlinewalaa जबाबदार राहणार नाही."
      ]
    },
    {
      title: "11. नियमांमधील बदल",
      content: [
        "Onlinewalaa कोणत्याही वेळी या नियम व अटींमध्ये बदल किंवा सुधारणा करू शकते.",
        "सुधारित अटी वेबसाइटवर प्रकाशित केल्यानंतर लागू होतील.",
        "वेबसाइटचा नियमित वापर करताना अद्ययावत नियम तपासणे वापरकर्त्याची जबाबदारी आहे."
      ]
    },
    {
      title: "12. लागू कायदा",
      content: [
        "या नियम व अटी भारतातील लागू कायद्यांनुसार नियंत्रित केल्या जातील.",
        "कोणताही वाद उद्भवल्यास तो लागू कायदे आणि सक्षम न्यायालयांच्या अधिकारक्षेत्रानुसार हाताळला जाईल."
      ]
    }
  ];

  return (
    <div className="terms-page">
      <style>{`
        .terms-page {
          --primary: #2563eb;
          --primary-dark: #1d4ed8;
          --text: #172033;
          --muted: #64748b;
          font-family: Inter, Arial, sans-serif;
          color: var(--text);
          background: #fff;
        }

        .terms-page * { box-sizing: border-box; }

        .terms-container {
          width: min(1000px, 92%);
          margin: auto;
        }

        .terms-hero {
          background: linear-gradient(135deg, #eff6ff, #f8fafc 65%, #eef2ff);
          padding: 70px 0;
          text-align: center;
        }

        .terms-label {
          display: inline-block;
          padding: 9px 16px;
          border-radius: 30px;
          background: #dbeafe;
          color: var(--primary-dark);
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .terms-hero h1 {
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1.25;
          margin: 0 0 18px;
          font-weight: 800;
        }

        .terms-hero h1 span { color: var(--primary); }

        .terms-hero p {
          max-width: 720px;
          margin: auto;
          color: #526176;
          font-size: 17px;
          line-height: 1.8;
        }

        .terms-content {
          padding: 65px 0 80px;
        }

        .terms-intro {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 22px 25px;
          margin-bottom: 30px;
        }

        .terms-intro p {
          color: var(--muted);
          font-size: 15px;
          line-height: 1.85;
          margin: 0;
        }

        .terms-section {
          padding: 25px 0;
          border-bottom: 1px solid #e8edf4;
        }

        .terms-section h2 {
          font-size: 21px;
          line-height: 1.5;
          margin: 0 0 14px;
          color: var(--text);
        }

        .terms-section p {
          color: var(--muted);
          font-size: 15px;
          line-height: 1.9;
          margin: 0 0 12px;
        }

        .terms-section p:last-child { margin-bottom: 0; }

        .terms-contact {
          margin-top: 35px;
          padding: 30px;
          border-radius: 20px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: white;
          text-align: center;
        }

        .terms-contact h2 {
          font-size: 24px;
          margin: 0 0 12px;
        }

        .terms-contact p {
          color: #dbeafe;
          font-size: 15px;
          line-height: 1.8;
          margin: 0 0 18px;
        }

        .terms-contact a {
          color: #1d4ed8;
          background: white;
          display: inline-block;
          padding: 12px 22px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        @media (max-width: 768px) {
          .terms-hero { padding: 52px 0; }
          .terms-hero p { font-size: 15px; }
          .terms-content { padding: 45px 0 55px; }
          .terms-intro { padding: 20px; }
          .terms-section { padding: 22px 0; }
          .terms-section h2 { font-size: 19px; }
          .terms-section p { font-size: 14px; }
          .terms-contact { padding: 28px 20px; }
        }
      `}</style>

      {/* Hero */}
      <section className="terms-hero">
        <div className="terms-container">
          <span className="terms-label">नियम व अटी</span>

          <h1>
            वेबसाइट वापरण्याचे
            <br />
            <span>नियम आणि अटी</span>
          </h1>

          <p>
            Onlinewalaa वापरण्यापूर्वी कृपया खालील नियम
            आणि अटी काळजीपूर्वक वाचा.
            या अटी आमच्या वेबसाइटचा वापर आणि सेवांशी
            संबंधित महत्त्वाची माहिती स्पष्ट करतात.
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="terms-content">
        <div className="terms-container">
          <div className="terms-intro">
            <p>
              <strong>Onlinewalaa.com</strong> ही वेबसाइट
              वापरून तुम्ही खाली नमूद केलेल्या नियम व अटी
              मान्य करता. या अटी वेबसाइटच्या सर्व वापरकर्त्यांना
              लागू आहेत.
            </p>
          </div>

          {sections.map((section, index) => (
            <div className="terms-section" key={index}>
              <h2>{section.title}</h2>

              {section.content.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ))}

          <div className="terms-contact">
            <h2>नियम व अटींबद्दल काही प्रश्न आहेत?</h2>

            <p>
              या नियमांबद्दल अधिक माहिती किंवा स्पष्टीकरण
              हवे असल्यास आमच्याशी संपर्क साधा.
            </p>

            <a href="mailto:support@onlinewalaa.com">
              support@onlinewalaa.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
