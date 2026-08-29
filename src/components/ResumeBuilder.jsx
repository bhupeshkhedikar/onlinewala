import React, { useState, useRef } from "react";
// Uncomment the line below after running: npm install html2pdf.js
import html2pdf from "html2pdf.js";
import "./ResumeBuilder.css";

export default function ResumeBuilder() {
  const resumeRef = useRef();
  
  // Tab State: 'edit' or 'preview'
  const [activeTab, setActiveTab] = useState("edit"); 

  const [data, setData] = useState({
    name: "RAHUL ANIL DESHMUKH",
    address: "AT POST LAKHORI\nTAH. LAKHANI DIST. BHANDARA\nMAHARASHTRA\n441804",
    contact: "+91 9876543210",
    email: "rahul.deshmukh@gmail.com",
    objective: "To secure a challenging position in a reputable organization to expand my learnings, knowledge, and skills while contributing to the growth and success of the company.",
    
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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const handlePersonalChange = (id, field, value) => {
    const updatedInfo = data.personalInfo.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setData({ ...data, personalInfo: updatedInfo });
  };

  const addPersonalInfo = () => {
    setData({ ...data, personalInfo: [...data.personalInfo, { id: Date.now(), label: "", value: "" }] });
  };

  const removePersonalInfo = (id) => {
    setData({ ...data, personalInfo: data.personalInfo.filter(item => item.id !== id) });
  };

  const handleEducationChange = (index, field, value) => {
    const updatedEdu = [...data.education];
    updatedEdu[index][field] = value;
    setData({ ...data, education: updatedEdu });
  };

  const addEducation = () => {
    setData({ ...data, education: [...data.education, { id: Date.now(), exam: "", board: "", year: "", percentage: "" }] });
  };

  const removeEducation = (id) => {
    setData({ ...data, education: data.education.filter(item => item.id !== id) });
  };

  // 🔥 PERFECT PDF EXPORT LOGIC
// 🔥 PERFECT PDF EXPORT LOGIC
  const handleDownloadPDF = () => {
    const element = resumeRef.current;

    if (!element) {
      alert("Resume element not found!");
      return;
    }

    // Temporary force full size for high-quality mobile capture
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      element.classList.add('export-mode');
    }

    const opt = {
      margin: 0, 
      filename: `${data.name.replace(/\s+/g, '_')}_Resume.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 🔥 FIX: Call html2pdf() directly, NOT window.html2pdf()
    try {
      html2pdf().set(opt).from(element).save().then(() => {
        if (isMobile) element.classList.remove('export-mode'); // Restore mobile view
      }).catch(err => {
        console.error("PDF Generation Error:", err);
        if (isMobile) element.classList.remove('export-mode');
      });
    } catch (error) {
      console.error("html2pdf is not initialized:", error);
      alert("Something went wrong with the PDF generator.");
      if (isMobile) element.classList.remove('export-mode');
    }
  };

  return (
    <div className="builder-container">
      
      {/* 🚀 TOP NAVIGATION TABS */}
      <div className="top-tabs">
        <button 
          className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} 
          onClick={() => setActiveTab('edit')}
        >
          📝 Edit Details
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} 
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview & Download
        </button>
      </div>

      {/* 🔄 TAB CONTENT AREA */}
      <div className="tab-content-area">
        
        {/* ================= TAB 1: EDIT DETAILS ================= */}
        {activeTab === 'edit' && (
          <div className="form-pane">
            <div className="form-header">
              <h4>Resume Details</h4>
              <p style={{fontSize:'10px'}}>Fill out the fields below to instantly build your resume.</p>
            </div>
            
            <div className="form-card">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={data.name} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea name="address" rows="3" value={data.address} onChange={handleChange}></textarea>
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Contact No.</label>
                  <input type="text" name="contact" value={data.contact} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Email ID</label>
                  <input type="email" name="email" value={data.email} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Career Objective</label>
                <textarea name="objective" rows="4" value={data.objective} onChange={handleChange}></textarea>
              </div>
            </div>

            <div className="form-card">
              <div className="section-header-edit">
                <input type="text" className="title-edit" name="personalInfoTitle" value={data.personalInfoTitle} onChange={handleChange} />
              </div>
              {data.personalInfo.map((item) => (
                <div className="dynamic-row" key={item.id}>
                  <input type="text" value={item.label} onChange={(e) => handlePersonalChange(item.id, 'label', e.target.value)} placeholder="Label (e.g. GENDER)" />
                  <input type="text" value={item.value} onChange={(e) => handlePersonalChange(item.id, 'value', e.target.value)} placeholder="Value" />
                  <button className="remove-btn" onClick={() => removePersonalInfo(item.id)}>✕</button>
                </div>
              ))}
              <button className="add-btn" onClick={addPersonalInfo}>+ Add Personal Info</button>
            </div>

            <div className="form-card">
              <div className="section-header-edit">
                <input type="text" className="title-edit" name="educationTitle" value={data.educationTitle} onChange={handleChange} />
              </div>
              {data.education.map((edu, index) => (
                <div className="dynamic-row education-row-mobile" key={edu.id}>
                  <input type="text" value={edu.exam} onChange={(e) => handleEducationChange(index, 'exam', e.target.value)} placeholder="Exam" />
                  <input type="text" value={edu.board} onChange={(e) => handleEducationChange(index, 'board', e.target.value)} placeholder="Board" />
                  <input type="text" value={edu.year} onChange={(e) => handleEducationChange(index, 'year', e.target.value)} placeholder="Year" />
                  <input type="text" value={edu.percentage} onChange={(e) => handleEducationChange(index, 'percentage', e.target.value)} placeholder="%" />
                  <button className="remove-btn" onClick={() => removeEducation(edu.id)}>✕</button>
                </div>
              ))}
              <button className="add-btn" onClick={addEducation}>+ Add Education</button>
            </div>

            <div className="form-card" style={{marginBottom: '40px'}}>
              <h3>Footer & Signature</h3>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Date Label & Value</label>
                  <div style={{display:'flex', gap:'5px'}}>
                    <input type="text" name="dateLabel" value={data.dateLabel} onChange={handleChange} style={{width:'40%'}}/>
                    <input type="text" name="dateValue" value={data.dateValue} onChange={handleChange} style={{width:'60%'}}/>
                  </div>
                </div>
                <div className="form-group">
                  <label>Place Label & Value</label>
                  <div style={{display:'flex', gap:'5px'}}>
                    <input type="text" name="placeLabel" value={data.placeLabel} onChange={handleChange} style={{width:'40%'}}/>
                    <input type="text" name="placeValue" value={data.placeValue} onChange={handleChange} style={{width:'60%'}}/>
                  </div>
                </div>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Sign Off</label>
                  <input type="text" name="signOff" value={data.signOff} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Signature Name</label>
                  <input type="text" name="signature" value={data.signature} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PREVIEW & DOWNLOAD ================= */}
        {activeTab === 'preview' && (
          <div className="preview-pane">
            <div className="preview-actions">
              <button className="download-btn" onClick={handleDownloadPDF}>
                ⬇ Download PDF
              </button>
            </div>

            <div className="a4-wrapper">
              <div className="a4-paper" ref={resumeRef}>
                <h1 className="resume-title">RESUME</h1>
                
                <div className="header-info">
                  <p><strong>NAME:-{data.name}</strong></p>
                  <p>ADD: {data.address.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</p>
                  <p>CONTACT NO.: {data.contact}</p>
                  <p>EMAIL ID. : {data.email}</p>
                </div>

                <div className="section">
                  <h2 className="section-title">{data.objective && "CAREER OBJECTIVE"}</h2>
                  <p className="objective-text">{data.objective}</p>
                </div>

                <div className="section">
                  <h2 className="section-title">{data.personalInfoTitle}</h2>
                  <table className="personal-table">
                    <tbody>
                      <tr><td>NAME</td><td>: {data.name}</td></tr>
                      {data.personalInfo.map((item) => (
                        <tr key={item.id}>
                          <td>{item.label}</td>
                          <td>: {item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="section">
                  <h2 className="section-title">{data.educationTitle}</h2>
                  <div className="table-responsive">
                    <table className="education-table">
                      <thead>
                        <tr>
                          <th>Sr. No.</th>
                          <th>Name of Exam</th>
                          <th>Board/University</th>
                          <th>Year of Passing</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.education.map((edu, idx) => (
                          <tr key={edu.id}>
                            <td>{idx + 1}</td>
                            <td>{edu.exam}</td>
                            <td>{edu.board}</td>
                            <td>{edu.year}</td>
                            <td>{edu.percentage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="section declaration">
                  <h2 className="section-title">{data.declarationTitle}</h2>
                  <p>I hereby declare that the Information giving above is true to the best of my knowledge.</p>
                </div>

                <div className="footer-info">
                  <div className="left-footer">
                    <p>{data.dateLabel} {data.dateValue}</p>
                    <p>{data.placeLabel} {data.placeValue}</p>
                  </div>
                  <div className="right-footer">
                    <p>{data.signOff}</p>
                    <br/><br/>
                    <p>{data.signature}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}