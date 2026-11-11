import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react";
import html2pdf from "html2pdf.js";
import "./ResumeBuilder.css";

const PAPER_W = 794;
const PAPER_H = 1123;

const INITIAL_DATA = {
  name: "RAHUL ANIL DESHMUKH",
  address: "AT POST LAKHORI\nTAH. LAKHANI DIST. BHANDARA\nMAHARASHTRA\n441804",
  contact: "+91 9876543210",
  email: "rahul.deshmukh@gmail.com",
  objective:
    "To secure a challenging position in a reputable organization to expand my learnings, knowledge, and skills while contributing to the growth and success of the company.",
  personalInfoTitle: "PERSONAL INFORMATION",
  educationTitle: "EDUCATIONAL QUALIFICATION",
  declarationTitle: "DECLARATION",
  personalInfo: [
    { id: 1, label: "FATHER NAME", value: "Suresh Deshmukh" },
    { id: 2, label: "MOTHER NAME", value: "Sunita Deshmukh" },
    { id: 3, label: "DATE OF BIRTH", value: "15/08/1996" },
    { id: 4, label: "GENDER", value: "Male" },
    { id: 5, label: "MARITAL STATUS", value: "Single" },
    { id: 6, label: "NATIONALITY", value: "Indian" },
    { id: 7, label: "CATEGORY", value: "OBC" },
    { id: 8, label: "RELIGION", value: "Hindu" },
    { id: 9, label: "LANGUAGE KNOWN", value: "Marathi, Hindi, English" }
  ],
  education: [
    { id: 1, exam: "H.S.C", board: "Nagpur Board", year: "2014", percentage: "82.00%" },
    { id: 2, exam: "S.S.C", board: "Nagpur Board", year: "2012", percentage: "88.50%" }
  ],
  dateLabel: "Date:",
  dateValue: "26/04/2026",
  placeLabel: "Place:",
  placeValue: "Pune",
  signOff: "Yours Faithfully,",
  signature: "(RAHUL DESHMUKH)"
};

const COPY = {
  en: {
    appTitle: "Easy Resume Maker",
    appSub: "Create your resume in 4 easy steps",
    language: "हिन्दी",
    step: "STEP",
    steps: ["Your details", "Family details", "Education", "Finish"],
    stepHints: [
      "First, tell us about yourself.",
      "Add your family and personal information.",
      "Enter your school and college details.",
      "Check your resume and download it."
    ],
    name: "Full name", address: "Full address", phone: "Mobile number", email: "Email address",
    objective: "About yourself / Career objective", objectiveHint: "Write 2–3 lines about the kind of work you want. You can also leave this empty.",
    father: "Father's name", mother: "Mother's name", dob: "Date of birth", gender: "Gender",
    marital: "Marital status", nationality: "Nationality", category: "Category", religion: "Religion",
    languages: "Languages known", other: "Other personal details", addDetail: "Add another detail",
    education: "Education details", exam: "Class / Exam", board: "Board / School / College",
    year: "Passing year", percentage: "Marks / Percentage", addEducation: "Add education",
    date: "Date", place: "Place", signOff: "Closing words", signature: "Your name for signature",
    previous: "Back", next: "Continue", preview: "Preview resume", download: "Download PDF",
    downloadBusy: "Preparing PDF…", edit: "Edit details", previewTitle: "Your resume preview",
    previewHint: "This is how your downloaded resume will look.",
    delete: "Delete", required: "Please enter your full name to continue.",
    namePlaceholder: "Example: Rahul Anil Deshmukh",
    addressPlaceholder: "House number, village, taluka, district, state, PIN code",
    phonePlaceholder: "Example: 9876543210",
    emailPlaceholder: "Example: name@gmail.com",
    fatherPlaceholder: "Enter father's full name", motherPlaceholder: "Enter mother's full name",
    detailName: "Detail name", detailValue: "Enter value", examPlaceholder: "Example: 10th / 12th / B.A.",
    boardPlaceholder: "Example: Maharashtra State Board", yearPlaceholder: "Example: 2024",
    marksPlaceholder: "Example: 75%",
    note: "Tip: Fill only the details you know. You can leave other boxes empty.",
    done: "Your resume is ready!", doneHint: "Check the preview once, then download your PDF.",
    noEducation: "No education added yet. Tap “Add education” to enter your qualification.",
    noPersonal: "Add any other details only if needed.",
    selectGender: "Select gender", male: "Male", female: "Female", otherGender: "Other",
    selectStatus: "Select status", single: "Single", married: "Married", widowed: "Widowed",
    objectivePlaceholder: "Example: I am hardworking and looking for a suitable job opportunity."
  },
  hi: {
    appTitle: "आसान रिज्यूमे बनाएं",
    appSub: "सिर्फ 4 आसान स्टेप में अपना रिज्यूमे बनाएं",
    language: "English",
    step: "स्टेप",
    steps: ["आपकी जानकारी", "परिवार की जानकारी", "पढ़ाई की जानकारी", "पूरा करें"],
    stepHints: [
      "सबसे पहले अपनी जानकारी भरें।",
      "परिवार और निजी जानकारी भरें।",
      "स्कूल और कॉलेज की जानकारी भरें।",
      "रिज्यूमे देखें और डाउनलोड करें।"
    ],
    name: "पूरा नाम", address: "पूरा पता", phone: "मोबाइल नंबर", email: "ईमेल पता",
    objective: "अपने बारे में / नौकरी का उद्देश्य", objectiveHint: "आप किस तरह की नौकरी चाहते हैं, इसके बारे में 2–3 लाइन लिखें। चाहें तो खाली छोड़ सकते हैं।",
    father: "पिता का नाम", mother: "माता का नाम", dob: "जन्म तारीख", gender: "लिंग",
    marital: "शादी की स्थिति", nationality: "राष्ट्रीयता", category: "जाति / वर्ग", religion: "धर्म",
    languages: "कौन-कौन सी भाषा आती है", other: "अन्य निजी जानकारी", addDetail: "एक और जानकारी जोड़ें",
    education: "पढ़ाई की जानकारी", exam: "कक्षा / परीक्षा", board: "बोर्ड / स्कूल / कॉलेज",
    year: "पास होने का साल", percentage: "नंबर / प्रतिशत", addEducation: "पढ़ाई जोड़ें",
    date: "तारीख", place: "जगह", signOff: "अंत में लिखें", signature: "हस्ताक्षर के लिए नाम",
    previous: "पीछे जाएं", next: "आगे बढ़ें", preview: "रिज्यूमे देखें", download: "PDF डाउनलोड करें",
    downloadBusy: "PDF बन रही है…", edit: "जानकारी बदलें", previewTitle: "आपका रिज्यूमे",
    previewHint: "डाउनलोड होने के बाद आपका रिज्यूमे ऐसा दिखेगा।",
    delete: "हटाएं", required: "आगे बढ़ने के लिए अपना पूरा नाम लिखें।",
    namePlaceholder: "उदाहरण: राहुल अनिल देशमुख",
    addressPlaceholder: "मकान नंबर, गांव, तहसील, जिला, राज्य, पिन कोड",
    phonePlaceholder: "उदाहरण: 9876543210",
    emailPlaceholder: "उदाहरण: name@gmail.com",
    fatherPlaceholder: "पिता का पूरा नाम लिखें", motherPlaceholder: "माता का पूरा नाम लिखें",
    detailName: "जानकारी का नाम", detailValue: "जानकारी लिखें", examPlaceholder: "उदाहरण: 10वीं / 12वीं / बी.ए.",
    boardPlaceholder: "उदाहरण: महाराष्ट्र राज्य बोर्ड", yearPlaceholder: "उदाहरण: 2024",
    marksPlaceholder: "उदाहरण: 75%",
    note: "ध्यान दें: जो जानकारी पता है वही भरें। बाकी खाली छोड़ सकते हैं।",
    done: "आपका रिज्यूमे तैयार है!", doneHint: "एक बार रिज्यूमे देख लें, फिर PDF डाउनलोड करें।",
    noEducation: "अभी पढ़ाई की जानकारी नहीं जोड़ी है। जानकारी जोड़ने के लिए नीचे बटन दबाएं।",
    noPersonal: "जरूरत हो तभी अन्य जानकारी जोड़ें।",
    selectGender: "लिंग चुनें", male: "पुरुष", female: "महिला", otherGender: "अन्य",
    selectStatus: "स्थिति चुनें", single: "अविवाहित", married: "विवाहित", widowed: "विधवा / विधुर",
    objectivePlaceholder: "उदाहरण: मैं मेहनती हूं और एक अच्छी नौकरी की तलाश में हूं।"
  }
};

function Icon({ name }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
    family: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M15 15a5 5 0 0 1 6 5"/></>,
    cap: <><path d="m2 10 10-5 10 5-10 5-10-5Z"/><path d="M6 12v5c4 3 8 3 12 0v-5M22 10v6"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 11v5m0-8h.01"/></>
  };
  return <svg className="rb-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Field({ label, children, hint }) {
  return <div className="rb-field"><label>{label}</label>{children}{hint && <small>{hint}</small>}</div>;
}

export default function ResumeBuilder() {
  const resumeRef = useRef(null);
  const previewAreaRef = useRef(null);
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState("en");
  const [showPreview, setShowPreview] = useState(false);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useState(INITIAL_DATA);
  const t = COPY[language];

  useLayoutEffect(() => {
    const el = previewAreaRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(Math.min(1, (width - 28) / PAPER_W));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showPreview]);

  const progress = useMemo(() => ((step + 1) / 4) * 100, [step]);

  const update = (key, value) => setData(current => ({ ...current, [key]: value }));
  const updatePersonal = (id, key, value) => setData(current => ({
    ...current,
    personalInfo: current.personalInfo.map(item => item.id === id ? { ...item, [key]: value } : item)
  }));
  const updateEducation = (id, key, value) => setData(current => ({
    ...current,
    education: current.education.map(item => item.id === id ? { ...item, [key]: value } : item)
  }));
  const addPersonal = () => update("personalInfo", [...data.personalInfo, { id: Date.now(), label: "", value: "" }]);
  const removePersonal = id => update("personalInfo", data.personalInfo.filter(item => item.id !== id));
  const addEducation = () => update("education", [...data.education, { id: Date.now(), exam: "", board: "", year: "", percentage: "" }]);
  const removeEducation = id => update("education", data.education.filter(item => item.id !== id));

  const nextStep = () => {
    if (step === 0 && !data.name.trim()) {
      setMessage(t.required);
      return;
    }
    setMessage("");
    if (step < 3) setStep(step + 1);
    else setShowPreview(true);
  };

  const downloadPDF = async () => {
    if (!resumeRef.current) return;
    setDownloading(true);
    try {
      await html2pdf().set({
        margin: 0,
        filename: `${(data.name || "Resume").trim().replace(/\s+/g, "_")}_Resume.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0, logging: false, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: [] }
      }).from(resumeRef.current).save();
      setMessage(language === "hi" ? "PDF डाउनलोड हो गई!" : "PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      setMessage(language === "hi" ? "PDF डाउनलोड नहीं हो पाई। दोबारा कोशिश करें।" : "Could not create PDF. Please try again.");
    } finally {
      setDownloading(false);
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    if (showPreview && pendingDownload && resumeRef.current) {
      setPendingDownload(false);
      downloadPDF();
    }
  }, [showPreview, pendingDownload]);

  const renderStep = () => {
    if (step === 0) return (
      <div className="rb-card">
        <div className="rb-card-heading"><span className="rb-card-icon"><Icon name="user"/></span><div><h2>{t.steps[0]}</h2><p>{t.stepHints[0]}</p></div></div>
        <Field label={`${t.name} *`}>
          <input value={data.name} onChange={e => update("name", e.target.value)} placeholder={t.namePlaceholder} autoComplete="name"/>
        </Field>
        <Field label={t.address} hint={language === "hi" ? "हर नई लाइन के लिए Enter दबाएं।" : "Press Enter to start a new line."}>
          <textarea rows="3" value={data.address} onChange={e => update("address", e.target.value)} placeholder={t.addressPlaceholder}/>
        </Field>
        <div className="rb-two-col">
          <Field label={t.phone}><input type="tel" value={data.contact} onChange={e => update("contact", e.target.value)} placeholder={t.phonePlaceholder}/></Field>
          <Field label={t.email}><input type="email" value={data.email} onChange={e => update("email", e.target.value)} placeholder={t.emailPlaceholder}/></Field>
        </div>
        <Field label={t.objective} hint={t.objectiveHint}>
          <textarea rows="4" value={data.objective} onChange={e => update("objective", e.target.value)} placeholder={t.objectivePlaceholder}/>
        </Field>
      </div>
    );

    if (step === 1) return (
      <div className="rb-card">
        <div className="rb-card-heading"><span className="rb-card-icon"><Icon name="family"/></span><div><h2>{t.steps[1]}</h2><p>{t.stepHints[1]}</p></div></div>
        <div className="rb-two-col">
          <Field label={t.father}><input value={data.personalInfo.find(x => x.label === "FATHER NAME")?.value || ""} onChange={e => {
            const item = data.personalInfo.find(x => x.label === "FATHER NAME");
            if (item) updatePersonal(item.id, "value", e.target.value);
            else update("personalInfo", [...data.personalInfo, { id: Date.now(), label: "FATHER NAME", value: e.target.value }]);
          }} placeholder={t.fatherPlaceholder}/></Field>
          <Field label={t.mother}><input value={data.personalInfo.find(x => x.label === "MOTHER NAME")?.value || ""} onChange={e => {
            const item = data.personalInfo.find(x => x.label === "MOTHER NAME");
            if (item) updatePersonal(item.id, "value", e.target.value);
            else update("personalInfo", [...data.personalInfo, { id: Date.now(), label: "MOTHER NAME", value: e.target.value }]);
          }} placeholder={t.motherPlaceholder}/></Field>
          <Field label={t.dob}><input value={data.personalInfo.find(x => x.label === "DATE OF BIRTH")?.value || ""} onChange={e => {
            const item = data.personalInfo.find(x => x.label === "DATE OF BIRTH");
            if (item) updatePersonal(item.id, "value", e.target.value);
            else update("personalInfo", [...data.personalInfo, { id: Date.now(), label: "DATE OF BIRTH", value: e.target.value }]);
          }} placeholder="DD/MM/YYYY"/></Field>
          <Field label={t.gender}>
            <select value={data.personalInfo.find(x => x.label === "GENDER")?.value || ""} onChange={e => {
              const item = data.personalInfo.find(x => x.label === "GENDER");
              if (item) updatePersonal(item.id, "value", e.target.value);
              else update("personalInfo", [...data.personalInfo, { id: Date.now(), label: "GENDER", value: e.target.value }]);
            }}>
              <option value="">{t.selectGender}</option><option value="Male">{t.male}</option><option value="Female">{t.female}</option><option value="Other">{t.otherGender}</option>
            </select>
          </Field>
          <Field label={t.marital}>
            <select value={data.personalInfo.find(x => x.label === "MARITAL STATUS")?.value || ""} onChange={e => {
              const item = data.personalInfo.find(x => x.label === "MARITAL STATUS");
              if (item) updatePersonal(item.id, "value", e.target.value);
              else update("personalInfo", [...data.personalInfo, { id: Date.now(), label: "MARITAL STATUS", value: e.target.value }]);
            }}>
              <option value="">{t.selectStatus}</option><option value="Single">{t.single}</option><option value="Married">{t.married}</option><option value="Widowed">{t.widowed}</option>
            </select>
          </Field>
          {[
            ["NATIONALITY", t.nationality, "Indian"],
            ["CATEGORY", t.category, "OBC / SC / ST / Open"],
            ["RELIGION", t.religion, "Hindu"],
            ["LANGUAGE KNOWN", t.languages, "Marathi, Hindi, English"]
          ].map(([key, label, placeholder]) => {
            const item = data.personalInfo.find(x => x.label === key);
            return <Field key={key} label={label}><input value={item?.value || ""} placeholder={placeholder} onChange={e => {
              if (item) updatePersonal(item.id, "value", e.target.value);
              else update("personalInfo", [...data.personalInfo, { id: Date.now(), label: key, value: e.target.value }]);
            }}/></Field>;
          })}
        </div>
        <div className="rb-note"><Icon name="info"/><span>{t.note}</span></div>
        <div className="rb-subheading"><h3>{t.other}</h3><p>{t.noPersonal}</p></div>
        {data.personalInfo.filter(item => !["FATHER NAME","MOTHER NAME","DATE OF BIRTH","GENDER","MARITAL STATUS","NATIONALITY","CATEGORY","RELIGION","LANGUAGE KNOWN"].includes(item.label)).map(item => (
          <div className="rb-repeat-card" key={item.id}>
            <div className="rb-repeat-fields">
              <input aria-label={t.detailName} value={item.label} onChange={e => updatePersonal(item.id, "label", e.target.value)} placeholder={t.detailName}/>
              <input aria-label={t.detailValue} value={item.value} onChange={e => updatePersonal(item.id, "value", e.target.value)} placeholder={t.detailValue}/>
            </div>
            <button type="button" className="rb-delete" onClick={() => removePersonal(item.id)} aria-label={t.delete}><Icon name="trash"/><span>{t.delete}</span></button>
          </div>
        ))}
        <button type="button" className="rb-add" onClick={addPersonal}><Icon name="plus"/>{t.addDetail}</button>
      </div>
    );

    if (step === 2) return (
      <div className="rb-card">
        <div className="rb-card-heading"><span className="rb-card-icon"><Icon name="cap"/></span><div><h2>{t.steps[2]}</h2><p>{t.stepHints[2]}</p></div></div>
        {data.education.length === 0 && <div className="rb-empty">{t.noEducation}</div>}
        {data.education.map((edu, index) => (
          <div className="rb-education-card" key={edu.id}>
            <div className="rb-repeat-title"><strong>{language === "hi" ? `पढ़ाई ${index + 1}` : `Education ${index + 1}`}</strong>
              <button type="button" className="rb-delete" onClick={() => removeEducation(edu.id)}><Icon name="trash"/><span>{t.delete}</span></button>
            </div>
            <div className="rb-two-col">
              <Field label={t.exam}><input value={edu.exam} onChange={e => updateEducation(edu.id, "exam", e.target.value)} placeholder={t.examPlaceholder}/></Field>
              <Field label={t.board}><input value={edu.board} onChange={e => updateEducation(edu.id, "board", e.target.value)} placeholder={t.boardPlaceholder}/></Field>
              <Field label={t.year}><input inputMode="numeric" value={edu.year} onChange={e => updateEducation(edu.id, "year", e.target.value)} placeholder={t.yearPlaceholder}/></Field>
              <Field label={t.percentage}><input value={edu.percentage} onChange={e => updateEducation(edu.id, "percentage", e.target.value)} placeholder={t.marksPlaceholder}/></Field>
            </div>
          </div>
        ))}
        <button type="button" className="rb-add" onClick={addEducation}><Icon name="plus"/>{t.addEducation}</button>
        <div className="rb-note"><Icon name="info"/><span>{t.note}</span></div>
      </div>
    );

    return (
      <div className="rb-card">
        <div className="rb-card-heading"><span className="rb-card-icon"><Icon name="check"/></span><div><h2>{t.steps[3]}</h2><p>{t.stepHints[3]}</p></div></div>
        <div className="rb-success"><span className="rb-success-icon"><Icon name="check"/></span><div><strong>{t.done}</strong><p>{t.doneHint}</p></div></div>
        <div className="rb-two-col">
          <Field label={t.date}><input value={data.dateValue} onChange={e => update("dateValue", e.target.value)} placeholder="DD/MM/YYYY"/></Field>
          <Field label={t.place}><input value={data.placeValue} onChange={e => update("placeValue", e.target.value)} placeholder="Your city / village"/></Field>
          <Field label={t.signOff}><input value={data.signOff} onChange={e => update("signOff", e.target.value)}/></Field>
          <Field label={t.signature}><input value={data.signature} onChange={e => update("signature", e.target.value)} placeholder={data.name}/></Field>
        </div>
        <button type="button" className="rb-preview-action" onClick={() => setShowPreview(true)}><Icon name="eye"/>{t.preview}</button>
      </div>
    );
  };

  return (
    <div className="resume-builder">
      <header className="rb-header">
        <div className="rb-brand">
          <div className="rb-logo"><Icon name="user"/></div>
          <div><h1>{t.appTitle}</h1><p>{t.appSub}</p></div>
        </div>
        <button type="button" className="rb-language" onClick={() => setLanguage(language === "hi" ? "en" : "hi")}>{t.language}</button>
      </header>

      <nav className="rb-top-tabs" aria-label="Resume sections">
        <button type="button" className={`rb-top-tab ${!showPreview ? "active" : ""}`} aria-selected={!showPreview} onClick={() => setShowPreview(false)}>
          <Icon name="user" /><span>{language === "hi" ? "जानकारी भरें" : "Enter Details"}</span>
        </button>
        <button type="button" className={`rb-top-tab ${showPreview ? "active" : ""}`} aria-selected={showPreview} onClick={() => setShowPreview(true)}>
          <Icon name="eye" /><span>{language === "hi" ? "रिज्यूमे देखें" : "Preview Resume"}</span>
        </button>
      </nav>

      {!showPreview ? (
        <main className="rb-main">
          <section className="rb-intro">
            <span className="rb-eyebrow">{t.step} {step + 1} / 4</span>
            <h2>{t.steps[step]}</h2>
            <p>{t.stepHints[step]}</p>
            <div className="rb-progress"><span style={{ width: `${progress}%` }}/></div>
            <div className="rb-step-labels">{t.steps.map((label, index) => <span key={label} className={index <= step ? "done" : ""}>{index + 1}. {label}</span>)}</div>
          </section>

          {renderStep()}

          {message && <div className="rb-message" role="status">{message}</div>}
          <div className="rb-navigation">
            <button type="button" className="rb-back" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}><Icon name="back"/>{t.previous}</button>
            <button type="button" className="rb-next" onClick={nextStep}>{step === 3 ? t.preview : t.next}<Icon name="arrow"/></button>
          </div>
        </main>
      ) : (
        <main className="rb-preview-screen">
          <div className="rb-preview-heading">
            <div><h2>{t.previewTitle}</h2><p>{t.previewHint}</p></div>
            <button type="button" className="rb-edit-button" onClick={() => { setShowPreview(false); setStep(3); }}><Icon name="back"/>{t.edit}</button>
          </div>
          <div className="rb-paper-area" ref={previewAreaRef}>
            <div className="rb-paper-frame" style={{ width: PAPER_W * scale, height: PAPER_H * scale }}>
              <div className="rb-paper-scaler" style={{ transform: `scale(${scale})` }}>
                <div className="rb-a4-paper" ref={resumeRef}>
                  <div className="rb-resume-border">
                    <h2 className="rb-resume-title">RESUME</h2>
                    <div className="rb-header-info">
                      <h3><strong>{data.name}</strong></h3> <br/>
                      <p><strong>ADDRESS:</strong> {data.address.split("\n").map((line, index) => <React.Fragment key={index}>{line}<br/></React.Fragment>)}</p>
                      <p><strong>CONTACT NO:</strong> {data.contact}</p>
                      <p><strong>EMAIL ID:</strong> {data.email}</p>
                    </div>
                    {data.objective && <div className="rb-resume-section"><h3><strong>CAREER OBJECTIVE</strong></h3><br/><p className="rb-objective">{data.objective}</p></div>}
                    <div className="rb-resume-section"><h3><strong>{data.personalInfoTitle}</strong></h3><br/>
                      <table className="rb-personal-table"><tbody>
                        <tr><td>NAME</td><td>: {data.name}</td></tr>
                        {data.personalInfo.filter(item => item.label || item.value).map(item => <tr key={item.id}><td>{item.label}</td><td>: {item.value}</td></tr>)}
                      </tbody></table>
                    </div>
                    <div className="rb-resume-section"><h3><strong>{data.educationTitle}</strong></h3> <br/>
                      <table className="rb-education-table"><thead><tr><th>Sr. No.</th><th>Name of Exam</th><th>Board/University</th><th>Year of Passing</th><th>Percentage</th></tr></thead>
                        <tbody>{data.education.filter(item => item.exam || item.board || item.year || item.percentage).map((edu, index) => <tr key={edu.id}><td>{index + 1}</td><td>{edu.exam}</td><td>{edu.board}</td><td>{edu.year}</td><td>{edu.percentage}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <div className="rb-resume-section rb-declaration"><h3><strong>{data.declarationTitle}</strong></h3><br/><p>I hereby declare that the Information given above is true to the best of my knowledge.</p></div>
                    <div className="rb-footer-info"><div><p>{data.dateLabel} {data.dateValue}</p><p>{data.placeLabel} {data.placeValue}</p></div><div className="rb-right-footer"><p>{data.signOff}</p><div className="rb-signature-space"/><p>{data.signature}</p></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rb-preview-actions">
            <button type="button" className="rb-back" onClick={() => { setShowPreview(false); setStep(3); }}><Icon name="back"/>{t.edit}</button>
          </div>
        </main>
      )}
      {message && showPreview && <div className="rb-toast" role="status">{message}</div>}

      <button type="button" className="rb-floating-download" onClick={() => {
        if (showPreview) downloadPDF();
        else { setPendingDownload(true); setShowPreview(true); }
      }} disabled={downloading}>
        <Icon name="download" />
        <span>{downloading ? t.downloadBusy : t.download}</span>
      </button>
    </div>
  );
}
