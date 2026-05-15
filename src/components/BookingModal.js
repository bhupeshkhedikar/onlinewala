import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./BookingModal.css";

export default function BookingModal({ user, initialData, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // 🔥 State for Dynamic Services from Firestore
  const [servicesData, setServicesData] = useState({});
  const [fetchingServices, setFetchingServices] = useState(true);

  // Pre-fill states from initialData
  const [service, setService] = useState(initialData?.service || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [time, setTime] = useState(initialData?.time || "");
  
  // 🔥 Contact Details State
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState(user?.email || ""); 
  
  // File Upload State & Custom Details State
  const [files, setFiles] = useState({});
  const [customDetails, setCustomDetails] = useState({});

  // Generate time slots dynamically (10:00 AM → 9:00 PM)
  const generateTimeSlots = () => {
    const slots = [];
    let startHour = 10; // 10:00 AM
    let endHour = 21;   // 9:00 PM

    for (let h = startHour; h <= endHour; h++) {
      slots.push(formatTime(h, 0));
      if (h < endHour) {
        slots.push(formatTime(h, 30));
      }
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

  // Fetch Services dynamically when Modal opens
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
            customFields: data.customFields || [] // Fetch custom fields if any
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

  // --- Step Navigation Handlers ---

  const handleNextStep1 = () => {
    if (!service || !date || !time) return alert("Please select all fields!");
    setCustomDetails({}); // Reset custom fields if service changes
    setStep(2);
  };

  const handleNextStep3 = () => {
    if (!name || !mobile || !email) return alert("Please fill in all contact details!");
    
    // Check if service has custom fields. If yes, go to Step 4, else skip to Step 5.
    const hasCustomFields = servicesData[service]?.customFields?.length > 0;
    if (hasCustomFields) {
      setStep(4);
    } else {
      setStep(5);
    }
  };

  const handleNextStep4 = () => {
    // Validate required custom fields
    const requiredFields = servicesData[service]?.customFields?.filter(f => f.required) || [];
    for (let field of requiredFields) {
      if (!customDetails[field.label]) {
        return alert(`Please fill the required field: ${field.label}`);
      }
    }
    setStep(5); // Proceed to Upload step
  };

  const handleBackFromUpload = () => {
    const hasCustomFields = servicesData[service]?.customFields?.length > 0;
    if (hasCustomFields) {
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const handleCustomDetailChange = (label, value) => {
    setCustomDetails(prev => ({ ...prev, [label]: value }));
  };

  const handleFileChange = (docName, file) => {
    setFiles((prev) => ({ ...prev, [docName]: file }));
  };

  const handleSubmit = async () => {
    const selectedServiceData = servicesData[service];
    const requiredDocs = selectedServiceData?.docs || [];
    
    // Check if all required files are selected
    for (let doc of requiredDocs) {
      if (!files[doc]) return alert(`Please upload ${doc}`);
    }

    setLoading(true);
    try {
      let uploadedDocs = [];

      // 1. Upload files to Firebase Storage (if any)
      for (let docName of Object.keys(files)) {
        const file = files[docName];
        if (file) {
          const fileRef = ref(storage, `bookings/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          uploadedDocs.push({ name: docName, url, type: file.type });
        }
      }

      // 2. Save Booking to Firestore
      await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        userName: name,     
        userMobile: mobile, 
        userEmail: email,   
        service,
        date,
        time,
        customDetails, // Save dynamic info
        documents: uploadedDocs,
        govtFee: selectedServiceData.govtFee,
        serviceCharge: selectedServiceData.serviceCharge,
        total: selectedServiceData.govtFee + selectedServiceData.serviceCharge,
        status: "Pending", 
        paymentStatus: "Pending", 
        createdAt: serverTimestamp(),
      });

      // ✨ SUCCESS: Proceed to step 6 (Animation)
      setStep(6);

    } catch (error) {
      console.error(error);
      alert("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Logic to show correct step numbers in the header
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
        
        {/* Hide header if on success step (Step 6) */}
        {step !== 6 && (
          <div className="bm-header">
            <div>
              <h2>Book a Service</h2>
              <p className="bm-subtitle">Step {getDisplayStep()} of {totalSteps}</p>
            </div>
            <button className="bm-close" onClick={onClose}>✕</button>
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
                      {servicesData[service].description && (
                        <p>{servicesData[service].description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bm-fee-box">
                    <div className="bm-fee-row">
                      <span>Govt Fee</span>
                      <span>₹{servicesData[service].govtFee}</span>
                    </div>
                    <div className="bm-fee-row">
                      <span>Service Charge</span>
                      <span>₹{servicesData[service].serviceCharge}</span>
                    </div>
                    <div className="bm-fee-total">
                      <span>Total Amount</span>
                      <span>₹{servicesData[service].govtFee + servicesData[service].serviceCharge}</span>
                    </div>
                  </div>

                  {servicesData[service].docs?.length > 0 && (
                    <div className="bm-docs-req">
                      <span className="bm-label">Required Documents:</span>
                      <div className="bm-doc-pills">
                        {servicesData[service].docs.map((doc, i) => (
                          <span key={i} className="bm-pill">📄 {doc}</span>
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

              {/* ✨ STEP 4: Additional Dynamic Information (Conditional) */}
              {step === 4 && service && servicesData[service]?.customFields && (
                <div className="bm-step fade-in">
                  <h4 style={{marginTop: 0, marginBottom: '15px'}}>Additional Details</h4>
                  
                  {servicesData[service].customFields.map((field, index) => (
                    <div className="bm-input-group" key={index}>
                      <label className="bm-label">{field.label} {field.required && '*'}</label>
                      
                      {field.type === "select" ? (
                        <select 
                          className="bm-input"
                          value={customDetails[field.label] || ""} 
                          onChange={(e) => handleCustomDetailChange(field.label, e.target.value)}
                        >
                          <option value="">Select Option</option>
                          {field.options.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          className="bm-input"
                          type={field.type} 
                          value={customDetails[field.label] || ""} 
                          onChange={(e) => handleCustomDetailChange(field.label, e.target.value)}
                          placeholder={`Enter ${field.label}`}
                        />
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

                  <div className="bm-upload-list">
                    {servicesData[service].docs?.length > 0 ? (
                      servicesData[service].docs.map((doc, i) => (
                        <div key={i} className="bm-upload-group">
                          <label className="bm-label">{doc} *</label>
                          <div className="bm-file-wrapper">
                            <input 
                              className="bm-file-input"
                              type="file" 
                              onChange={(e) => handleFileChange(doc, e.target.files[0])} 
                              accept="image/*,.pdf" 
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: "center", color: "#666", padding: "20px 0" }}>
                        No documents required for this service.
                      </p>
                    )}
                  </div>
                  
                  <div className="bm-actions mt-2">
                    <button className="bm-btn secondary" onClick={handleBackFromUpload}>Back</button>
                    <button className="bm-btn submit" onClick={handleSubmit} disabled={loading}>
                      {loading ? "Processing..." : "Submit Booking ✅"}
                    </button>
                  </div>
                </div>
              )}

              {/* ✨ STEP 6: Success Animation Screen */}
              {step === 6 && (
                <div className="bm-step bm-success-step">
                  <div className="bm-success-animation-container">
                    <div className="bm-success-circle">
                      <span className="bm-check">✓</span>
                    </div>
                    <div className="bm-particle bm-p1"></div>
                    <div className="bm-particle bm-p2"></div>
                    <div className="bm-particle bm-p3"></div>
                    <div className="bm-particle bm-p4"></div>
                    <div className="bm-particle bm-p5"></div>
                    <div className="bm-particle bm-p6"></div>
                  </div>

                  <h3 className="bm-success-heading">Booking Confirmed!</h3>
                  <p className="bm-success-subtext">
                    Aapka slot book ho gaya hai. Kripya time par center par aayein.
                  </p>

                  <div className="bm-actions" style={{ marginTop: '20px', width: '100%' }}>
                    <button className="bm-btn submit" onClick={onClose} style={{ width: '100%' }}>
                      Done ✅
                    </button>
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