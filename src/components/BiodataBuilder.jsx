import React, { useState, useRef } from "react";
// Uncomment the line below after running: npm install html2pdf.js
import html2pdf from "html2pdf.js";
import "./BiodataBuilder.css";

// 🔥 TRANSLATION DICTIONARIES
const mrToEn = {
  "नाव": "Name",
  "जन्म तारीख": "Date of Birth",
  "जन्म वेळ": "Time of Birth",
  "जन्म स्थळ": "Place of Birth",
  "उंची": "Height",
  "जन्म राशी": "Rashi",
  "जन्म नाव": "Birth Name",
  "रक्तगट": "Blood Group",
  "शिक्षण": "Education",
  "व्यवसाय": "Occupation",
  "जात": "Caste",
  "देवक": "Devak",
  "वडिलांचे नाव": "Father's Name",
  "आईचे नाव": "Mother's Name",
  "भाऊ": "Brother",
  "बहीण": "Sister",
  "चुलते": "Paternal Uncles",
  "मामा": "Maternal Uncles",
  "काका": "Uncles",
  "नातेवाईक": "Relatives",
  "पत्ता": "Address",
  "संपर्क": "Contact No."
};

const enToMr = Object.entries(mrToEn).reduce((acc, [mr, en]) => {
  acc[en] = mr;
  return acc;
}, {});

export default function BiodataBuilder() {
  const biodataRef = useRef();
  const [activeTab, setActiveTab] = useState("edit"); 
  const [lang, setLang] = useState("mr"); // 'mr' or 'en'

  const titleOptions = lang === 'mr' ? [
    "॥ श्री गणेशाय नमः ॥",
    "भगवान बाबा हनुमानजी को प्रणाम\nमहानत्यागी बाबा जुमदेवजी को प्रणाम\n।। परमात्मा एक ।।",
    "Custom"
  ] : [
    "॥ श्री गणेशाय नमः ॥",
    "भगवान बाबा हनुमानजी को प्रणाम\nमहानत्यागी बाबा जुमदेवजी को प्रणाम\n।। परमात्मा एक ।।",
    "Custom"
  ];

  const godImageOptions = [
    { id: "ganpati", name: "Ganpati", url: "https://png.pngtree.com/png-vector/20250121/ourmid/pngtree-ganesha-the-embodiment-of-prosperity-and-joy-png-image_15287837.png" },
    { id: "gajanan", name: "Gajanan Maharaj", url: "https://e7.pngegg.com/pngimages/461/123/png-clipart-shree-gajanan-maharaj-sansthan-shegaon-gajanan-maharaj-temples-saint-vidarbha-dna-2-miscellaneous-physical-fitness-thumbnail.png" },
    { id: "hanuman", name: "Hanumanji", url: "https://i.pinimg.com/736x/b6/fd/6e/b6fd6e25743629976301758ee0940e96.jpg" },
    { id: "jumdev", name: "Baba Jumdevji", url: "https://sevakparivar.in/wp-content/uploads/2025/09/IMG_20200429_160041.jpg" },
    { id: "none", name: "No Image", url: "" },
    { id: "custom", name: "Custom Image", url: "" }
  ];

  const [data, setData] = useState({
    titleSelection: "॥ श्री गणेशाय नमः ॥",
    titleTop: "॥ श्री गणेशाय नमः ॥",
    titleMain: "परिचय पत्रिका",
    
    godImageSelection: "ganpati",
    ganpatiUrl: "https://png.pngtree.com/png-vector/20250121/ourmid/pngtree-ganesha-the-embodiment-of-prosperity-and-joy-png-image_15287837.png",
    imageSize: 65,

    photoUrl: "https://img.freepik.com/free-photo/handsome-confident-smiling-man-with-hands-crossed-chest_176420-18743.jpg",

    personalDetails: [
      { id: 1, label: "नाव", value: "अमोल राजाराम पाटील" },
      { id: 2, label: "जन्म तारीख", value: "10/08/1994" },
      { id: 3, label: "जन्म वेळ", value: "संध्या ८ वा." },
      { id: 4, label: "जन्म स्थळ", value: "जाखुरी, ता. रामपूर, जि. पुणे" },
      { id: 5, label: "उंची", value: "५ फुट ५ इंच" },
      { id: 6, label: "जन्म राशी", value: "मेष" },
      { id: 7, label: "जन्म नाव", value: "सार्थक" },
      { id: 8, label: "रक्तगट", value: "B+ve" }
    ],
    
    educationDetails: [
      { id: 1, label: "शिक्षण", value: "M.B.B.S. M.D. (मेडीकल कॉलेज, पुणे)" },
      { id: 2, label: "व्यवसाय", value: "डॉक्टर" }
    ],

    familyDetails: [
      { id: 1, label: "जात", value: "हिंदू - मराठा" },
      { id: 2, label: "देवक", value: "आंबा सौंदड" },
      { id: 3, label: "वडिलांचे नाव", value: "श्री. राजाराम साहेबराव पाटील (मोरया उद्योग समुह, पुणे)" },
      { id: 4, label: "आईचे नाव", value: "सौ. आशालता राजाराम पाटील (गृहिणी)" },
      { id: 5, label: "भाऊ", value: "चि. अदित्य राजाराम पाटील" },
      { id: 6, label: "बहीण", value: "कु. सुजाता राजाराम पाटील" },
      { id: 7, label: "चुलते", value: "श्री. शामराव साहेबराव पाटील\nश्री. भाऊसाहेब साहेबराव पाटील" },
      { id: 8, label: "मामा", value: "श्री. सोपान रामभाऊ दाभाडे (खराडी, ता. खेड, जि. पुणे)\nश्री. दिपक रामभाऊ दाभाडे (खराडी, ता. खेड, जि. पुणे)" },
      { id: 9, label: "काका", value: "श्री. सचिन कारभारी पानसरे (चंदननगर, ता. खेड, जि. पुणे)" },
      { id: 10, label: "नातेवाईक", value: "पाटील, दाभाडे, पानसरे, देशमुख, राहाणे, बोरकर,\nथोरात, खानवीलकर, जाधव" }
    ],

    contactDetails: [
      { id: 1, label: "पत्ता", value: "मु.पो. देवगाव, ता. रामपूर, जि. पुणे" },
      { id: 2, label: "संपर्क", value: "मो. 9657917189" }
    ]
  });

  // 🔥 LANGUAGE TOGGLE LOGIC
  const toggleLanguage = (newLang) => {
    if (lang === newLang) return;
    const tMap = newLang === "en" ? mrToEn : enToMr;

    setData(prev => {
      // Helper function to translate arrays
      const translateArray = (arr) => arr.map(item => ({
        ...item,
        label: tMap[item.label] || item.label
      }));

      // Translate Main Titles
      let newTitleMain = prev.titleMain;
      if (newLang === "en" && prev.titleMain === "परिचय पत्रिका") newTitleMain = "BIODATA";
      if (newLang === "mr" && prev.titleMain === "BIODATA") newTitleMain = "परिचय पत्रिका";

      let newTitleTop = prev.titleTop;
      if (newLang === "en" && prev.titleTop === "॥ श्री गणेशाय नमः ॥") newTitleTop = "|| Shree Ganeshay Namah ||";
      if (newLang === "mr" && prev.titleTop === "|| Shree Ganeshay Namah ||") newTitleTop = "॥ श्री गणेशाय नमः ॥";

      return {
        ...prev,
        titleMain: newTitleMain,
        titleTop: newTitleTop,
        titleSelection: newTitleTop,
        personalDetails: translateArray(prev.personalDetails),
        educationDetails: translateArray(prev.educationDetails),
        familyDetails: translateArray(prev.familyDetails),
        contactDetails: translateArray(prev.contactDetails)
      };
    });
    setLang(newLang);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const handleTitleSelection = (value) => {
    if (value === "Custom") {
      setData({ ...data, titleSelection: value, titleTop: "" });
    } else {
      setData({ ...data, titleSelection: value, titleTop: value });
    }
  };

  const handleImageSelection = (id, url) => {
    setData({ ...data, godImageSelection: id, ganpatiUrl: url });
  };

  const handleCustomGodImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = URL.createObjectURL(e.target.files[0]);
      setData({ ...data, ganpatiUrl: file });
    }
  };

  const handlePhotoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = URL.createObjectURL(e.target.files[0]);
      setData({ ...data, photoUrl: file });
    }
  };

  const handleDynamicChange = (section, id, field, value) => {
    const updatedDetails = data[section].map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setData({ ...data, [section]: updatedDetails });
  };

  const addDynamicField = (section) => {
    setData({ ...data, [section]: [...data[section], { id: Date.now(), label: "", value: "" }] });
  };

  const removeDynamicField = (section, id) => {
    setData({ ...data, [section]: data[section].filter(item => item.id !== id) });
  };

  const getSafeImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  };

  const handleDownloadPDF = () => {
    const element = biodataRef.current;
    if (!element) return;

    const isMobile = window.innerWidth <= 768;
    if (isMobile) element.classList.add('export-mode');

    const personName = data.personalDetails[0]?.value || "Biodata";

    const opt = {
      margin: 0, 
      filename: `${personName.replace(/\s+/g, '_')}_Biodata.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, allowTaint: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      html2pdf().set(opt).from(element).save().then(() => {
        if (isMobile) element.classList.remove('export-mode');
      }).catch(err => {
        console.error("PDF Generation Error:", err);
        if (isMobile) element.classList.remove('export-mode');
      });
    } catch (err) {
      console.error("html2pdf is not initialized:", err);
      alert("Something went wrong with the PDF generator. Ensure it is imported correctly.");
      if (isMobile) element.classList.remove('export-mode');
    }
  };

  return (
    <div className="builder-container">
      
      {/* MOBILE NAV */}
      <div className="mobile-bottom-nav">
        <button className={activeTab === 'edit' ? "active" : ""} onClick={() => setActiveTab('edit')}>
          📝 Edit Details
        </button>
        <button className={activeTab === 'preview' ? "active" : ""} onClick={() => setActiveTab('preview')}>
          👁️ Preview & Download
        </button>
      </div>

      {/* DESKTOP NAV */}
      <div className="top-tabs desktop-only">
        <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
          📝 Edit Details
        </button>
        <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
          👁️ Preview & Download
        </button>
      </div>

      <div className="tab-content-area">
        
        {/* ================= TAB 1: EDIT DETAILS ================= */}
        {activeTab === 'edit' && (
          <div className="form-pane">
            <div className="form-header">
              <h4>Biodata Details</h4>
              <p style={{fontSize:'10px'}}>Select your language, theme, and customize your details below.</p>
            </div>

            {/* 🔥 LANGUAGE TOGGLE */}
            <div className="form-card">
              <h3>Language / भाषा</h3>
              <div className="lang-switch-container">
                <button className={`lang-btn ${lang === 'mr' ? 'active' : ''}`} onClick={() => toggleLanguage('mr')}>मराठी (Marathi)</button>
                <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => toggleLanguage('en')}>English</button>
              </div>
            </div>

            {/* THEME & HEADER */}
            <div className="form-card">
              <h3>Theme & Header Settings</h3>
              
              <div className="form-group">
                <label>Main Title (मुख्य शीर्षक)</label>
                <input type="text" name="titleMain" value={data.titleMain} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Top Greeting Text</label>
                <div className="radio-group-vertical">
                  {titleOptions.map((opt, i) => (
                    <label key={i} className="radio-label" style={{alignItems: 'flex-start'}}>
                      <input 
                        type="radio" 
                        name="topTitle" 
                        checked={data.titleSelection === opt} 
                        onChange={() => handleTitleSelection(opt)} 
                        style={{marginTop: '4px'}}
                      />
                      <div style={{ lineHeight: '1.4' }}>
                        {opt.split('\n').map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
                {data.titleSelection === "Custom" && (
                  <textarea 
                    name="titleTop" 
                    rows="3"
                    value={data.titleTop} 
                    onChange={handleChange} 
                    placeholder="Enter custom greeting..." 
                    style={{marginTop: '10px'}} 
                  />
                )}
              </div>

              <div className="form-group" style={{marginTop: '20px'}}>
                <label>Header Image (Deity/Logo)</label>
                <div className="image-selection-grid">
                  {godImageOptions.map((img) => (
                    <div 
                      key={img.id} 
                      className={`image-choice-card ${data.godImageSelection === img.id ? 'selected' : ''}`}
                      onClick={() => handleImageSelection(img.id, img.url)}
                    >
                      {img.url ? <img src={getSafeImageUrl(img.url)} alt={img.name} /> : <div className="no-image-icon">{img.name === "No Image" ? "🚫" : "📂"}</div>}
                      <p>{img.name}</p>
                    </div>
                  ))}
                </div>
                {data.godImageSelection === "custom" && (
                  <div style={{marginTop: '10px'}}>
                    <input type="file" accept="image/*" onChange={handleCustomGodImage} />
                  </div>
                )}
                
                {data.ganpatiUrl && (
                  <div style={{marginTop: '20px'}}>
                    <label style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>Image Size</span>
                      <span style={{color: '#0b5ed7'}}>{data.imageSize}px</span>
                    </label>
                    <input 
                      type="range" name="imageSize" min="30" max="150" 
                      value={data.imageSize} onChange={handleChange} className="size-slider"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* PROFILE PHOTO */}
            <div className="form-card">
              <h3>Profile Photo</h3>
              <div className="form-group">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
              </div>
            </div>

            {/* DYNAMIC PERSONAL DETAILS */}
            <div className="form-card">
              <h3>Personal Details (वैयक्तिक माहिती)</h3>
              {data.personalDetails.map((item) => (
                <div className="dynamic-row" key={item.id}>
                  <input type="text" value={item.label} onChange={(e) => handleDynamicChange('personalDetails', item.id, 'label', e.target.value)} placeholder="Field Name" className="label-input" />
                  <textarea value={item.value} onChange={(e) => handleDynamicChange('personalDetails', item.id, 'value', e.target.value)} placeholder="Value" rows="1" />
                  <button className="remove-btn" onClick={() => removeDynamicField('personalDetails', item.id)}>✕</button>
                </div>
              ))}
              <button className="add-btn" onClick={() => addDynamicField('personalDetails')}>+ Add Personal Detail</button>
            </div>

            {/* DYNAMIC EDUCATION DETAILS */}
            <div className="form-card">
              <h3>Education & Profession (शिक्षण व व्यवसाय)</h3>
              {data.educationDetails.map((item) => (
                <div className="dynamic-row" key={item.id}>
                  <input type="text" value={item.label} onChange={(e) => handleDynamicChange('educationDetails', item.id, 'label', e.target.value)} placeholder="Field Name" className="label-input" />
                  <textarea value={item.value} onChange={(e) => handleDynamicChange('educationDetails', item.id, 'value', e.target.value)} placeholder="Value" rows="1" />
                  <button className="remove-btn" onClick={() => removeDynamicField('educationDetails', item.id)}>✕</button>
                </div>
              ))}
              <button className="add-btn" onClick={() => addDynamicField('educationDetails')}>+ Add Education/Profession</button>
            </div>

            {/* DYNAMIC FAMILY DETAILS */}
            <div className="form-card">
              <h3>Family Details (कौटुंबिक माहिती)</h3>
              {data.familyDetails.map((item) => (
                <div className="dynamic-row" key={item.id}>
                  <input type="text" value={item.label} onChange={(e) => handleDynamicChange('familyDetails', item.id, 'label', e.target.value)} placeholder="Field Name" className="label-input" />
                  <textarea value={item.value} onChange={(e) => handleDynamicChange('familyDetails', item.id, 'value', e.target.value)} placeholder="Value (Press Enter for new line)" rows="2" />
                  <button className="remove-btn" onClick={() => removeDynamicField('familyDetails', item.id)}>✕</button>
                </div>
              ))}
              <button className="add-btn" onClick={() => addDynamicField('familyDetails')}>+ Add Family Detail</button>
            </div>

            {/* DYNAMIC CONTACT DETAILS */}
            <div className="form-card" style={{marginBottom: '100px'}}>
              <h3>Contact (संपर्क)</h3>
              {data.contactDetails.map((item) => (
                <div className="dynamic-row" key={item.id}>
                  <input type="text" value={item.label} onChange={(e) => handleDynamicChange('contactDetails', item.id, 'label', e.target.value)} placeholder="Field Name" className="label-input" />
                  <textarea value={item.value} onChange={(e) => handleDynamicChange('contactDetails', item.id, 'value', e.target.value)} placeholder="Value (Press Enter for new line)" rows="2" />
                  <button className="remove-btn" onClick={() => removeDynamicField('contactDetails', item.id)}>✕</button>
                </div>
              ))}
              <button className="add-btn" onClick={() => addDynamicField('contactDetails')}>+ Add Contact Info</button>
            </div>

          </div>
        )}

        {/* ================= TAB 2: PREVIEW & DOWNLOAD ================= */}
        {activeTab === 'preview' && (
          <div className="preview-pane">
            <div className="preview-actions">
              <button className="download-btn" onClick={handleDownloadPDF}>
                ⬇ Download Biodata
              </button>
            </div>

            <div className="a4-wrapper">
              <div className="biodata-paper" ref={biodataRef}>
                <div className="biodata-inner-border">
                  
                  {/* Header */}
                  <div className="bio-header">
                    {data.ganpatiUrl && (
                      <img 
                        src={getSafeImageUrl(data.ganpatiUrl)} 
                        alt="Header Deity" 
                        className="bio-ganpati" 
                        style={{ width: `${data.imageSize}px`, height: `${data.imageSize}px` }}
                        crossOrigin="anonymous"
                      />
                    )}
                    <div className="bio-titles">
                      {data.titleTop && (
                        <h4 className="top-shree">
                          {data.titleTop.split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </h4>
                      )}
                      {data.titleMain && (
                        <div className="main-title-box">
                          <h1 className="main-title">{data.titleMain}</h1>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Row: Personal Details & Photo */}
                  <div className="bio-top-row">
                    <table className="bio-table main-info-table">
                      <tbody>
                        {data.personalDetails.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="bio-label align-top">{item.label}</td>
                            <td className="bio-colon align-top">:</td>
                            <td className={`bio-value align-top ${idx === 0 ? 'bold-text' : ''}`}>
                              {item.value.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="bio-photo-box">
                      {data.photoUrl && <img src={getSafeImageUrl(data.photoUrl)} alt="Profile" crossOrigin="anonymous" />}
                    </div>
                  </div>

                  {/* Bottom Row: Rest of the Dynamic Details */}
                  <table className="bio-table">
                    <tbody>
                      {data.educationDetails.map((item) => (
                        <tr key={item.id}>
                          <td className="bio-label align-top">{item.label}</td>
                          <td className="bio-colon align-top">:</td>
                          <td className="bio-value align-top">
                            {item.value.split('\n').map((line, i) => <div key={i} className="mb-2">{line}</div>)}
                          </td>
                        </tr>
                      ))}

                      {data.familyDetails.map((item) => (
                        <tr key={item.id}>
                          <td className="bio-label align-top">{item.label}</td>
                          <td className="bio-colon align-top">:</td>
                          <td className="bio-value align-top">
                            {item.value.split('\n').map((line, i) => <div key={i} className="mb-2">{line}</div>)}
                          </td>
                        </tr>
                      ))}
                      
                      {data.contactDetails.length > 0 && (
                        <tr><td colSpan="3"><hr className="bio-divider" /></td></tr>
                      )}

                      {data.contactDetails.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="bio-label align-top">{item.label}</td>
                          <td className="bio-colon align-top">:</td>
                          <td className={`bio-value align-top ${idx === data.contactDetails.length - 1 ? 'bold-text' : ''}`}>
                            {item.value.split('\n').map((line, i) => <div key={i} className="mb-2">{line}</div>)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}