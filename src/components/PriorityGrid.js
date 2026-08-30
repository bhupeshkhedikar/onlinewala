import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import "./PriorityGrid.css";

export default function PriorityGrid() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  /* =====================================================
     AUTOMATIC ENGLISH → MARATHI SERVICE TRANSLATION
  ===================================================== */

  const translateService = (title = "") => {
    if (!title) return "";

    const original = String(title).trim();

    /*
      Exact translations
    */
    const translations = {
      "Aadhaar Card": "आधार कार्ड",
      "Aadhar Card": "आधार कार्ड",
      "PAN Card": "पॅन कार्ड",
      "PAN": "पॅन कार्ड",
      "Voter ID": "मतदार ओळखपत्र",
      "Voter Card": "मतदार ओळखपत्र",

      "Driving Licence": "ड्रायव्हिंग लायसन्स",
      "Driving License": "ड्रायव्हिंग लायसन्स",
      "Learning Licence": "लर्निंग लायसन्स",

      "Passport": "पासपोर्ट",
      "Passport Application": "पासपोर्ट अर्ज",

      "Ration Card": "रेशन कार्ड",
      "Birth Certificate": "जन्म प्रमाणपत्र",
      "Death Certificate": "मृत्यू प्रमाणपत्र",
      "Marriage Certificate": "विवाह प्रमाणपत्र",

      "Income Certificate": "उत्पन्न प्रमाणपत्र",
      "Caste Certificate": "जात प्रमाणपत्र",
      "Domicile Certificate": "रहिवासी प्रमाणपत्र",
      "Non Creamy Layer": "नॉन क्रिमी लेयर प्रमाणपत्र",

      "EWS Certificate": "ईडब्ल्यूएस प्रमाणपत्र",
      "Character Certificate": "चारित्र्य प्रमाणपत्र",

      "Police Verification": "पोलीस पडताळणी",
      "Police Clearance": "पोलीस क्लिअरन्स",

      "Government Scheme": "शासकीय योजना",
      "Government Schemes": "शासकीय योजना",

      "Online Application": "ऑनलाईन अर्ज",
      "Application Form": "अर्ज फॉर्म",
      "Form Filling": "फॉर्म भरणे",

      "Document Upload": "कागदपत्र अपलोड",
      "Document Printing": "कागदपत्र प्रिंट",
      "Document Scan": "कागदपत्र स्कॅन",

      "Print": "प्रिंट",
      "Printing": "प्रिंटिंग",
      "Xerox": "झेरॉक्स",
      "Scanning": "स्कॅनिंग",

      "Photo": "फोटो",
      "Passport Photo": "पासपोर्ट फोटो",

      "Online Payment": "ऑनलाईन पेमेंट",
      "Bill Payment": "बिल पेमेंट",
      "Electricity Bill": "वीज बिल",
      "Water Bill": "पाणी बिल",
      "Mobile Recharge": "मोबाईल रिचार्ज",
      "DTH Recharge": "डीटीएच रिचार्ज",

      "Job Application": "नोकरी अर्ज",
      "Job Registration": "नोकरी नोंदणी",
      "Government Job": "शासकीय नोकरी",

      "Resume": "रेझ्युमे",
      "Resume Builder": "रेझ्युमे तयार करा",
      "Biodata": "बायोडाटा",
      "Biodata Builder": "बायोडाटा तयार करा",

      "Income Tax": "आयकर",
      "ITR": "आयटीआर",
      "ITR Filing": "आयटीआर भरणे",

      "GST Registration": "जीएसटी नोंदणी",
      "GST Return": "जीएसटी रिटर्न",

      "Shop Act": "शॉप ॲक्ट",
      "Udyam Registration": "उद्यम नोंदणी",
      "Business Registration": "व्यवसाय नोंदणी",

      "PM Kisan": "पीएम किसान",
      "PM Kisan Registration": "पीएम किसान नोंदणी",

      "Ayushman Bharat": "आयुष्मान भारत",
      "Ayushman Card": "आयुष्मान कार्ड",

      "Health Card": "आरोग्य कार्ड",
      "Insurance": "विमा",

      "Scholarship": "शिष्यवृत्ती",
      "Scholarship Form": "शिष्यवृत्ती अर्ज",

      "Admission Form": "प्रवेश अर्ज",
      "College Admission": "महाविद्यालय प्रवेश",
      "School Admission": "शाळा प्रवेश",

      "Bank Account": "बँक खाते",
      "Bank Account Opening": "बँक खाते उघडणे",
      "Bank Form": "बँक फॉर्म",

      "Online Form": "ऑनलाईन फॉर्म",
      "Online Services": "ऑनलाईन सेवा",
      "Online Service": "ऑनलाईन सेवा",

      "Certificate": "प्रमाणपत्र",
      "Registration": "नोंदणी",
      "Renewal": "नूतनीकरण",
      "Correction": "दुरुस्ती",
      "Update": "अपडेट",
      "Verification": "पडताळणी",

      "Other Services": "इतर सेवा",
      "Other Service": "इतर सेवा"
    };

    /*
      Exact match first
    */

    if (translations[original]) {
      return translations[original];
    }

    /*
      Case-insensitive exact match
    */

    const matchedKey = Object.keys(translations).find(
      key =>
        key.toLowerCase() === original.toLowerCase()
    );

    if (matchedKey) {
      return translations[matchedKey];
    }

    /*
      Word-by-word translation.
      This helps with dynamically added services.
    */

    const wordTranslations = {
      aadhaar: "आधार",
      aadhar: "आधार",
      pan: "पॅन",
      card: "कार्ड",
      voter: "मतदार",
      id: "ओळखपत्र",

      driving: "ड्रायव्हिंग",
      licence: "लायसन्स",
      license: "लायसन्स",
      learning: "लर्निंग",

      passport: "पासपोर्ट",

      ration: "रेशन",
      birth: "जन्म",
      death: "मृत्यू",
      marriage: "विवाह",

      certificate: "प्रमाणपत्र",

      income: "उत्पन्न",
      caste: "जात",
      domicile: "रहिवासी",
      residence: "रहिवासी",
      character: "चारित्र्य",

      police: "पोलीस",
      verification: "पडताळणी",
      clearance: "क्लिअरन्स",

      government: "शासकीय",
      scheme: "योजना",
      schemes: "योजना",

      online: "ऑनलाईन",
      offline: "ऑफलाईन",
      application: "अर्ज",
      applications: "अर्ज",
      form: "फॉर्म",
      forms: "फॉर्म",

      document: "कागदपत्र",
      documents: "कागदपत्रे",
      upload: "अपलोड",
      download: "डाउनलोड",
      print: "प्रिंट",
      printing: "प्रिंटिंग",
      scan: "स्कॅन",
      scanning: "स्कॅनिंग",

      photo: "फोटो",
      photos: "फोटो",

      payment: "पेमेंट",
      payments: "पेमेंट",
      bill: "बिल",
      bills: "बिले",

      electricity: "वीज",
      water: "पाणी",
      mobile: "मोबाईल",
      recharge: "रिचार्ज",

      job: "नोकरी",
      jobs: "नोकऱ्या",

      registration: "नोंदणी",
      register: "नोंदणी",

      renewal: "नूतनीकरण",
      correction: "दुरुस्ती",
      update: "अपडेट",

      resume: "रेझ्युमे",
      biodata: "बायोडाटा",

      builder: "तयार करा",

      income: "उत्पन्न",
      tax: "कर",

      scholarship: "शिष्यवृत्ती",
      admission: "प्रवेश",
      school: "शाळा",
      college: "महाविद्यालय",

      bank: "बँक",
      account: "खाते",

      health: "आरोग्य",
      insurance: "विमा",

      business: "व्यवसाय",
      shop: "दुकान",

      service: "सेवा",
      services: "सेवा"
    };

    /*
      Preserve already Marathi text.
      If title already contains Devanagari,
      don't translate it.
    */

    if (/[\u0900-\u097F]/.test(original)) {
      return original;
    }

    /*
      Convert individual words
    */

    const translated = original
      .split(/\s+/)
      .map(word => {
        const cleanWord = word
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
          .toLowerCase();

        return (
          wordTranslations[cleanWord] ||
          word
        );
      })
      .join(" ");

    return translated;
  };


  /* =====================================================
     FIRESTORE
  ===================================================== */

  useEffect(() => {

    const q = query(
      collection(db, "priority_services"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {

        const data = snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data()
          })
        );

        setItems(data);
        setLoading(false);
      },

      (error) => {

        console.error(
          "Error loading priority services:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();

  }, []);


  /* =====================================================
     LOADING SKELETON
  ===================================================== */

  const renderSkeletons = () => {

    return Array.from({
      length: 6
    }).map((_, index) => (

      <div
        className="pCard pSkeletonCard"
        key={index}
      >

        <div className="pSkeleton-icon" />

        <div className="pSkeleton-line" />

        <div className="pSkeleton-line small" />

      </div>

    ));

  };


  /* =====================================================
     DISPLAY ITEMS
  ===================================================== */

  const displayedItems = showAll
    ? items
    : items.slice(0, 6);


  return (

    <section className="priorityGrid-wrapper">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="pGrid-header">

        <div className="pHeader-icon">
          ⚡
        </div>

        <div className="pHeader-content">

          <div className="pTitle-row">

            <h2>
              जलद सेवा
            </h2>

            {items.length > 0 && (

              <span className="pService-count">
                {items.length} सेवा
              </span>

            )}

          </div>

          <p>
            आमच्या सर्वाधिक लोकप्रिय सेवांचा
            त्वरित लाभ घ्या
          </p>

        </div>

      </div>


      {/* =================================================
          GRID
      ================================================= */}

      <div className="priorityGrid">

        {loading ? (

          renderSkeletons()

        ) : items.length === 0 ? (

          <div className="pEmpty">

            <div className="pEmpty-icon">
              📦
            </div>

            <h3>
              सध्या कोणतीही सेवा उपलब्ध नाही
            </h3>

            <p>
              कृपया थोड्या वेळाने पुन्हा तपासा.
            </p>

          </div>

        ) : (

          displayedItems.map(
            (item, index) => (

              <div
                key={item.id}
                className="pCard"
              >

                {/* TOP BADGE */}

                <span className="pCard-number">

                  {String(
                    index + 1
                  ).padStart(2, "0")}

                </span>


                {/* GLOW */}

                <span className="pCard-glow" />


                {/* ICON */}

                <div className="pIcon">

                  {item.imageUrl ? (

                    <img
                      src={item.imageUrl}
                      alt={
                        translateService(
                          item.title
                        )
                      }
                      loading="lazy"

                      onError={(e) => {

                        e.currentTarget.style.display =
                          "none";

                        const fallback =
                          e.currentTarget
                            .parentElement
                            .querySelector(
                              ".pFallback"
                            );

                        if (fallback) {

                          fallback.style.display =
                            "flex";

                        }

                      }}

                    />

                  ) : null}


                  <span
                    className="pFallback"
                    style={{
                      display:
                        item.imageUrl
                          ? "none"
                          : "flex"
                    }}
                  >
                    ✨
                  </span>

                </div>


                {/* =================================================
                    TRANSLATED TITLE
                ================================================= */}

                <p className="pCard-title">

                  {translateService(
                    item.title
                  )}

                </p>


                {/* ACTION */}

                <div className="pCard-action">

                  <span>
                    त्वरित सेवा
                  </span>

                  <span className="pArrow">
                    →
                  </span>

                </div>


                {/* BOTTOM LINE */}

                <span className="pBottom-line" />

              </div>

            )
          )

        )}

      </div>


      {/* =================================================
          SEE MORE
      ================================================= */}

      {!loading &&
        items.length > 6 && (

          <div className="pMore-wrapper">

            <button
              type="button"
              className="pMore-btn"
              onClick={() =>
                setShowAll(!showAll)
              }
              aria-expanded={showAll}
            >

              <span>

                {showAll
                  ? "कमी पहा"
                  : "अधिक सेवा पहा"}

              </span>

              <span
                className={`pMore-arrow ${
                  showAll
                    ? "rotate"
                    : ""
                }`}
              >
                ↓
              </span>

            </button>

          </div>

        )}

    </section>

  );
}