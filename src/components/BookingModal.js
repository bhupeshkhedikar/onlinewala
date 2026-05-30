import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import "./BookingModal.css";

export default function BookingModal({ user, initialData, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // State for Dynamic Services from Firestore
  const [servicesData, setServicesData] = useState({});
  const [fetchingServices, setFetchingServices] = useState(true);

  // Pre-fill states from initialData
  const [service, setService] = useState(initialData?.service || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [time, setTime] = useState(initialData?.time || "");
  
  // Contact Details State
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState(user?.email || ""); 
  
  // File Upload States
  const [files, setFiles] = useState({});
  const [customDetails, setCustomDetails] = useState({});
  const [extraDocs, setExtraDocs] = useState([]);

  // State to track upload progress
  const [uploadStatus, setUploadStatus] = useState(null);

  // Generate time slots dynamically (10:00 AM → 9:00 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 10; h <= 21; h++) {
      slots.push(formatTime(h, 0));
      if (h < 21) slots.push(formatTime(h, 30));
    }
    return slots;
  };

  const formatTime = (hour, min) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = min === 0 ? "00" : min;
    return `${h}:${m} ${ampm}`;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, "services"));
        const dataObj = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          dataObj[data.name] = {
            docs: data.docs || [], 
            govtFee: data.govtFee || 0,
            serviceCharge: data.serviceCharge || 0,
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            customFields: data.customFields || [] 
          };
        });
        setServicesData(dataObj);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setFetchingServices(false);
      }
    };
    fetchServices();
  }, []);

  const handleNextStep1 = () => {
    if (!service || !date || !time) return alert("Please select all fields!");
    setCustomDetails({}); 
    setFiles({}); 
    setExtraDocs([]); 
    setStep(2);
  };

  const handleNextStep3 = () => {
    if (!name || !mobile || !email) return alert("Please fill in all contact details!");
    const hasCustomFields = servicesData[service]?.customFields?.length > 0;
    setStep(hasCustomFields ? 4 : 5);
  };

  const handleNextStep4 = () => {
    const requiredFields = servicesData[service]?.customFields?.filter(f => f.required) || [];
    for (let field of requiredFields) {
      if (!customDetails[field.label]) {
        return alert(`Please fill the required field: ${field.label}`);
      }
    }
    setStep(5); 
  };

  const handleBackFromUpload = () => {
    const hasCustomFields = servicesData[service]?.customFields?.length > 0;
    setStep(hasCustomFields ? 4 : 3);
  };

  const handleCustomDetailChange = (label, value) => {
    setCustomDetails(prev => ({ ...prev, [label]: value }));
  };

  const handleFileChange = (docName, file) => {
    setFiles((prev) => {
      const updated = { ...prev };
      if (file) updated[docName] = file;
      else delete updated[docName]; // Clean up if user cancels file selection
      return updated;
    });
  };

  const handleAddExtraDoc = () => {
    setExtraDocs([...extraDocs, { id: Date.now(), name: "", file: null }]);
  };

  const handleExtraDocNameChange = (id, newName) => {
    setExtraDocs(extraDocs.map(doc => doc.id === id ? { ...doc, name: newName } : doc));
  };

  const handleExtraDocFileChange = (id, newFile) => {
    setExtraDocs(extraDocs.map(doc => doc.id === id ? { ...doc, file: newFile } : doc));
  };

  const handleRemoveExtraDoc = (id) => {
    setExtraDocs(extraDocs.filter(doc => doc.id !== id));
  };

  // 🔥 Helper to display the file preview UI
  const renderFilePreview = (file) => {
    if (!file) return null;
    
    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
        {isImage ? (
          <img src={previewUrl} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        ) : (
          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
            PDF
          </div>
        )}
        <div style={{ overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: '500', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.name}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    const selectedServiceData = servicesData[service];
    const allDocs = selectedServiceData?.docs || [];
    const requiredDocs = allDocs.filter(d => d.isRequired);
    
    for (let doc of requiredDocs) {
      if (!files[doc.name]) return alert(`Please upload ${doc.name}`);
    }
    for (let ed of extraDocs) {
      if (!ed.name.trim() || !ed.file) {
        return alert("Please provide a name and select a file for all additional documents, or remove the empty row.");
      }
    }

    const filesToUpload = [];
    for (let docName of Object.keys(files)) {
      if (files[docName]) {
        filesToUpload.push({ name: docName, file: files[docName], isExtra: false });
      }
    }
    for (let ed of extraDocs) {
      if (ed.file && ed.name.trim()) {
        filesToUpload.push({ name: ed.name.trim(), file: ed.file, isExtra: true });
      }
    }

    setLoading(true);
    let uploadedDocs = [];

    try {
      if (filesToUpload.length > 0) {
        setUploadStatus({ current: 1, total: filesToUpload.length, fileName: filesToUpload[0].name, percentage: 0 });
      }

      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const path = `bookings/${user.uid}/${Date.now()}_${item.isExtra ? 'extra_' : ''}${item.file.name}`;
        const fileRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(fileRef, item.file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadStatus({ current: i + 1, total: filesToUpload.length, fileName: item.name, percentage: progress });
            }, 
            (error) => reject(error), 
            () => resolve()
          );
        });

        const url = await getDownloadURL(uploadTask.snapshot.ref);
        uploadedDocs.push({ name: item.name, url, type: item.file.type });
      }

      setUploadStatus({ completed: true });

      await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        userName: name,    
        userMobile: mobile, 
        userEmail: email,   
        service,
        date,
        time,
        customDetails, 
        documents: uploadedDocs,
        govtFee: selectedServiceData.govtFee,
        serviceCharge: selectedServiceData.serviceCharge,
        total: selectedServiceData.govtFee + selectedServiceData.serviceCharge,
        status: "Pending", 
        paymentStatus: "Pending", 
        createdAt: serverTimestamp(),
      });

      setLoading(false);
      setUploadStatus(null);
      setStep(6);

    } catch (error) {
      console.error(error);
      alert("Booking failed. Please try again.");
      setLoading(false);
      setUploadStatus(null);
    }
  };

  const hasCustomFields = servicesData[service]?.customFields?.length > 0;
  const totalSteps = hasCustomFields ? 5 : 4;
  const getDisplayStep = () => {
    if (step <= 3) return step;
    if (step === 4) return 4;
    if (step === 5) return hasCustomFields ? 5 : 4;
    return step;
  };

  return (
    <div className="bm-overlay">
      <div className="bm-modal">
        {step !== 6 && (
          <div className="bm-header">
            <div>
              <h2>Book a Service</h2>
              <p className="bm-subtitle">Step {getDisplayStep()} of {totalSteps}</p>
            </div>
            <button className="bm-close" onClick={onClose} disabled={loading}>✕</button>
          </div>
        )}
        
        <div className="bm-body">
          {fetchingServices ? (
            <div className="bm-loading">Loading services...</div>
          ) : (
            <>
              {/* STEP 1: Basic Details */}
              {step === 1 && (
                <div className="bm-step fade-in">
                  <div className="bm-input-group">
                    <label className="bm-label">Select Service</label>
                    <select className="bm-input" value={service} onChange={(e) => setService(e.target.value)}>
                      <option value="">Choose Service...</option>
                      {Object.keys(servicesData).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="bm-row">
                    <div className="bm-input-group">
                      <label className="bm-label">Date</label>
                      <input className="bm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="bm-input-group">
                      <label className="bm-label">Time</label>
                      <select className="bm-input" value={time} onChange={(e) => setTime(e.target.value)}>
                        <option value="">Select Slot</option>
                        {timeSlots.map((slot, i) => <option key={i} value={slot}>{slot}</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="bm-btn primary mt-2" onClick={handleNextStep1}>Check Requirements ➔</button>
                </div>
              )}

              {/* STEP 2: Requirements & Fees */}
              {step === 2 && service && servicesData[service] && (
                <div className="bm-step fade-in">
                  <div className="bm-service-card">
                    {servicesData[service].imageUrl && (
                      <img src={servicesData[service].imageUrl} alt={service} className="bm-service-img" />
                    )}
                    <div className="bm-service-info">
                      <h4>{service}</h4>
                      {servicesData[service].description && <p>{servicesData[service].description}</p>}
                    </div>
                  </div>
                  <div className="bm-fee-box">
                    <div className="bm-fee-row"><span>Govt Fee</span><span>₹{servicesData[service].govtFee}</span></div>
                    <div className="bm-fee-row"><span>Service Charge</span><span>₹{servicesData[service].serviceCharge}</span></div>
                    <div className="bm-fee-total"><span>Total Amount</span><span>₹{servicesData[service].govtFee + servicesData[service].serviceCharge}</span></div>
                  </div>
                  {servicesData[service].docs?.length > 0 && (
                    <div className="bm-docs-req">
                      <span className="bm-label">Documents Needed:</span>
                      <div className="bm-doc-pills">
                        {servicesData[service].docs.map((doc, i) => (
                          <span key={i} className="bm-pill" style={{ opacity: doc.isRequired ? 1 : 0.7 }}>
                            📄 {doc.name} {!doc.isRequired && "(Optional)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bm-actions">
                    <button className="bm-btn secondary" onClick={() => setStep(1)}>Back</button>
                    <button className="bm-btn primary" onClick={() => setStep(3)}>Enter Details ➔</button> 
                  </div>
                </div>
              )}

              {/* STEP 3: Contact Details */}
              {step === 3 && (
                <div className="bm-step fade-in">
                  <div className="bm-input-group">
                    <label className="bm-label">Full Name *</label>
                    <input className="bm-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Kumar" />
                  </div>
                  <div className="bm-input-group">
                    <label className="bm-label">Mobile Number *</label>
                    <input className="bm-input" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="e.g. 9876543210" />
                  </div>
                  <div className="bm-input-group">
                    <label className="bm-label">Email ID *</label>
                    <input className="bm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. rahul@example.com" />
                  </div>
                  <div className="bm-actions mt-2">
                    <button className="bm-btn secondary" onClick={() => setStep(2)}>Back</button>
                    <button className="bm-btn primary" onClick={handleNextStep3}>Next ➔</button>
                  </div>
                </div>
              )}

              {/* STEP 4: Additional Dynamic Information */}
              {step === 4 && service && servicesData[service]?.customFields && (
                <div className="bm-step fade-in">
                  <h4 style={{marginTop: 0, marginBottom: '15px'}}>Additional Details</h4>
                  {servicesData[service].customFields.map((field, index) => (
                    <div className="bm-input-group" key={index}>
                      <label className="bm-label">{field.label} {field.required && '*'}</label>
                      {field.type === "select" ? (
                        <select className="bm-input" value={customDetails[field.label] || ""} onChange={(e) => handleCustomDetailChange(field.label, e.target.value)}>
                          <option value="">Select Option</option>
                          {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input className="bm-input" type={field.type} value={customDetails[field.label] || ""} onChange={(e) => handleCustomDetailChange(field.label, e.target.value)} placeholder={`Enter ${field.label}`} />
                      )}
                    </div>
                  ))}
                  <div className="bm-actions mt-2">
                    <button className="bm-btn secondary" onClick={() => setStep(3)}>Back</button>
                    <button className="bm-btn primary" onClick={handleNextStep4}>Proceed to Upload ➔</button>
                  </div>
                </div>
              )}

              {/* STEP 5: Upload Documents & Submit */}
              {step === 5 && service && servicesData[service] && (
                <div className="bm-step fade-in">
                  <div className="bm-payable-banner">
                    <span>Total Payable:</span>
                    <strong>₹{servicesData[service].govtFee + servicesData[service].serviceCharge}</strong>
                  </div>

                  {!loading && (
                    <div className="bm-upload-list">
                      {/* --- Predefined Documents --- */}
                      {servicesData[service].docs?.length > 0 ? (
                        servicesData[service].docs.map((doc, i) => (
                          <div key={i} className="bm-upload-group">
                            <label className="bm-label">
                              {doc.name} {doc.isRequired && <span style={{color: 'red'}}>*</span>}
                              {!doc.isRequired && <span style={{fontSize: '12px', color: '#666', fontWeight: 'normal'}}> (Optional)</span>}
                            </label>
                            <div className="bm-file-wrapper">
                              <input className="bm-file-input" type="file" onChange={(e) => handleFileChange(doc.name, e.target.files[0])} accept="image/*,.pdf" />
                            </div>
                            {/* 🔥 Render Preview if file is selected */}
                            {renderFilePreview(files[doc.name])}
                          </div>
                        ))
                      ) : (
                        <p style={{ textAlign: "center", color: "#666", padding: "10px 0", margin: 0 }}>No predefined documents required.</p>
                      )}

                      {/* --- User-Added Extra Documents --- */}
                      <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="bm-label" style={{ margin: 0 }}>Additional Documents</span>
                          <button type="button" onClick={handleAddExtraDoc} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Add More</button>
                        </div>
                        {extraDocs.map((ed) => (
                          <div key={ed.id} className="bm-upload-group" style={{ background: '#f9fafb', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                              <input type="text" placeholder="Doc Name (e.g. Ration Card)" value={ed.name} onChange={(e) => handleExtraDocNameChange(ed.id, e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                              <button type="button" onClick={() => handleRemoveExtraDoc(ed.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '0 5px' }}>✕</button>
                            </div>
                            <input type="file" onChange={(e) => handleExtraDocFileChange(ed.id, e.target.files[0])} accept="image/*,.pdf" className="bm-file-input" />
                            
                            {/* 🔥 Render Preview if file is selected */}
                            {renderFilePreview(ed.file)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar UI */}
                  {loading && uploadStatus && (
                    <div style={{ margin: '20px 0', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {uploadStatus.completed ? (
                        <p style={{ color: '#10b981', fontWeight: 'bold', textAlign: 'center', margin: 0 }}>
                          ✅ All files uploaded! Finalizing booking...
                        </p>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                              Uploading {uploadStatus.current} of {uploadStatus.total}: {uploadStatus.fileName}
                            </span>
                            <span>{uploadStatus.percentage}%</span>
                          </div>
                          <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#4f46e5', width: `${uploadStatus.percentage}%`, transition: 'width 0.2s ease-out' }}></div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="bm-actions mt-2">
                    <button className="bm-btn secondary" onClick={handleBackFromUpload} disabled={loading}>Back</button>
                    <button className="bm-btn submit" onClick={handleSubmit} disabled={loading}>
                      {loading ? "Processing..." : "Submit Booking ✅"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 6: Success Animation Screen */}
              {step === 6 && (
                <div className="bm-step bm-success-step">
                  <div className="bm-success-animation-container">
                    <div className="bm-success-circle"><span className="bm-check">✓</span></div>
                  </div>
                  <h3 className="bm-success-heading">Booking Confirmed!</h3>
                  <p className="bm-success-subtext">Aapka slot book ho gaya hai. Kripya time par center par aayein.</p>
                  <div className="bm-actions" style={{ marginTop: '20px', width: '100%' }}>
                    <button className="bm-btn submit" onClick={onClose} style={{ width: '100%' }}>Done ✅</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}