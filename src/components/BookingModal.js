import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
import "./BookingModal.css";

export default function BookingModal({
  user,
  initialData,
  onClose
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // सेवा
  const [servicesData, setServicesData] = useState({});
  const [fetchingServices, setFetchingServices] = useState(true);

  // बुकिंग माहिती
  const [service, setService] = useState(
    initialData?.service || ""
  );

  const [date, setDate] = useState(
    initialData?.date || ""
  );

  const [time, setTime] = useState(
    initialData?.time || ""
  );

  // संपर्क माहिती
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState(
    user?.email || ""
  );

  // कागदपत्रे
  const [files, setFiles] = useState({});
  const [customDetails, setCustomDetails] = useState({});
  const [extraDocs, setExtraDocs] = useState([]);

  // अपलोड स्थिती
  const [uploadStatus, setUploadStatus] = useState(null);

  /* =====================================================
     तारीख संबंधित मदतनीस
  ===================================================== */

  const getTodayString = () => {
    const today = new Date();

    const yyyy = today.getFullYear();

    const mm = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const dd = String(
      today.getDate()
    ).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    const today = getTodayString();

    if (
      selectedDate &&
      selectedDate < today
    ) {
      alert(
        "मागील तारखा निवडता येणार नाहीत. कृपया आजची किंवा पुढील तारीख निवडा."
      );

      setDate("");
      return;
    }

    setDate(selectedDate);
  };

  /* =====================================================
     सेवा वर्णन - अधिक वाचा
  ===================================================== */

  function ServiceDescription({ description }) {
    const [expanded, setExpanded] = useState(false);

    const isLong = description.length > 120;

    return (
      <div className="bm-description-wrapper">

        <p
          className={`bm-service-description ${
            expanded ? "expanded" : ""
          }`}
        >
          {description}
        </p>

        {isLong && (
          <button
            type="button"
            className="bm-read-more"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? "कमी वाचा ▲"
              : "अधिक वाचा ▼"}
          </button>
        )}

      </div>
    );
  }

  /* =====================================================
     वेळेचे स्लॉट
  ===================================================== */

  const formatTime = (hour, min) => {
    const ampm =
      hour >= 12 ? "PM" : "AM";

    const h =
      hour % 12 === 0
        ? 12
        : hour % 12;

    const m =
      min === 0
        ? "00"
        : min;

    return `${h}:${m} ${ampm}`;
  };

  const generateTimeSlots = () => {
    const slots = [];

    for (let h = 10; h <= 21; h++) {
      slots.push(formatTime(h, 0));

      if (h < 21) {
        slots.push(formatTime(h, 30));
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  /* =====================================================
     सेवा मिळवा
  ===================================================== */

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "services")
        );

        const dataObj = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();

          dataObj[data.name] = {
            docs: data.docs || [],

            govtFee: Number(
              data.govtFee || 0
            ),

            serviceCharge: Number(
              data.serviceCharge || 0
            ),

            description:
              data.description || "",

            imageUrl:
              data.imageUrl || "",

            customFields:
              data.customFields || []
          };
        });

        setServicesData(dataObj);

      } catch (error) {
        console.error(
          "सेवा मिळवताना त्रुटी:",
          error
        );
      } finally {
        setFetchingServices(false);
      }
    };

    fetchServices();
  }, []);

  /* =====================================================
     स्टेप मदतनीस
  ===================================================== */

  const selectedServiceData =
    servicesData[service];

  const hasCustomFields =
    selectedServiceData?.customFields
      ?.length > 0;

  const totalSteps = hasCustomFields
    ? 5
    : 4;

  const getDisplayStep = () => {
    if (step <= 3) return step;

    if (step === 4) return 4;

    if (step === 5) {
      return hasCustomFields
        ? 5
        : 4;
    }

    return step;
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "बुकिंगची माहिती";

      case 2:
        return "सेवेची माहिती";

      case 3:
        return "संपर्काची माहिती";

      case 4:
        return "अतिरिक्त माहिती";

      case 5:
        return "कागदपत्रे";

      case 6:
        return "बुकिंग निश्चित झाले";

      default:
        return "सेवा बुक करा";
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 1:
        return "📅";

      case 2:
        return "ℹ️";

      case 3:
        return "👤";

      case 4:
        return "📝";

      case 5:
        return "📂";

      case 6:
        return "✓";

      default:
        return "✨";
    }
  };

  /* =====================================================
     स्टेप 1
  ===================================================== */

  const handleNextStep1 = () => {
    if (!service || !date || !time) {
      alert(
        "कृपया सेवा, तारीख आणि वेळ निवडा."
      );
      return;
    }

    setCustomDetails({});
    setFiles({});
    setExtraDocs([]);

    setStep(2);
  };

  /* =====================================================
     स्टेप 3
  ===================================================== */

  const handleNextStep3 = () => {
    if (!name.trim()) {
      alert("कृपया तुमचे पूर्ण नाव लिहा.");
      return;
    }

    if (!mobile.trim()) {
      alert("कृपया तुमचा मोबाईल क्रमांक लिहा.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      alert(
        "कृपया 10 अंकी योग्य मोबाईल क्रमांक लिहा."
      );
      return;
    }

    if (!email.trim()) {
      alert("कृपया तुमचा ई-मेल पत्ता लिहा.");
      return;
    }

    const hasFields =
      servicesData[service]?.customFields
        ?.length > 0;

    setStep(
      hasFields
        ? 4
        : 5
    );
  };

  /* =====================================================
     स्टेप 4
  ===================================================== */

  const handleNextStep4 = () => {
    const requiredFields =
      servicesData[service]?.customFields?.filter(
        (field) => field.required
      ) || [];

    for (const field of requiredFields) {
      const value =
        customDetails[field.label];

      if (
        !value ||
        !String(value).trim()
      ) {
        alert(
          `कृपया आवश्यक माहिती भरा: ${field.label}`
        );
        return;
      }
    }

    setStep(5);
  };

  const handleBackFromUpload = () => {
    const hasFields =
      servicesData[service]?.customFields
        ?.length > 0;

    setStep(
      hasFields
        ? 4
        : 3
    );
  };

  /* =====================================================
     अतिरिक्त माहिती
  ===================================================== */

  const handleCustomDetailChange = (
    label,
    value
  ) => {
    setCustomDetails((prev) => ({
      ...prev,
      [label]: value
    }));
  };

  /* =====================================================
     कागदपत्रे
  ===================================================== */

  const handleFileChange = (
    docName,
    file
  ) => {
    setFiles((prev) => {
      const updated = {
        ...prev
      };

      if (file) {
        updated[docName] = file;
      } else {
        delete updated[docName];
      }

      return updated;
    });
  };

  const handleAddExtraDoc = () => {
    setExtraDocs((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        file: null
      }
    ]);
  };

  const handleExtraDocNameChange = (
    id,
    newName
  ) => {
    setExtraDocs((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              name: newName
            }
          : doc
      )
    );
  };

  const handleExtraDocFileChange = (
    id,
    newFile
  ) => {
    setExtraDocs((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              file: newFile
            }
          : doc
      )
    );
  };

  const handleRemoveExtraDoc = (id) => {
    setExtraDocs((prev) =>
      prev.filter(
        (doc) => doc.id !== id
      )
    );
  };

  /* =====================================================
     फाईल पूर्वदृश्य
  ===================================================== */

  const renderFilePreview = (file) => {
    if (!file) return null;

    const isImage =
      file.type?.startsWith("image/");

    const previewUrl = isImage
      ? URL.createObjectURL(file)
      : null;

    return (
      <div className="bm-file-preview">

        <div className="bm-file-preview-icon">
          {isImage ? (
            <img
              src={previewUrl}
              alt="पूर्वदृश्य"
            />
          ) : (
            <span>PDF</span>
          )}
        </div>

        <div className="bm-file-preview-info">
          <strong title={file.name}>
            {file.name}
          </strong>

          <span>
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>

        <div className="bm-file-check">
          ✓
        </div>

      </div>
    );
  };

  /* =====================================================
     बुकिंग सबमिट
  ===================================================== */

  const handleSubmit = async () => {
    const selectedData =
      servicesData[service];

    const allDocs =
      selectedData?.docs || [];

    const requiredDocs =
      allDocs.filter(
        (doc) => doc.isRequired
      );

    for (const doc of requiredDocs) {
      if (!files[doc.name]) {
        alert(
          `कृपया ${doc.name} अपलोड करा.`
        );
        return;
      }
    }

    for (const ed of extraDocs) {
      if (
        !ed.name.trim() ||
        !ed.file
      ) {
        alert(
          "सर्व अतिरिक्त कागदपत्रांसाठी नाव आणि फाईल द्या किंवा रिकामी नोंद काढून टाका."
        );
        return;
      }
    }

    const filesToUpload = [];

    Object.keys(files).forEach(
      (docName) => {
        if (files[docName]) {
          filesToUpload.push({
            name: docName,
            file: files[docName],
            isExtra: false
          });
        }
      }
    );

    extraDocs.forEach((ed) => {
      if (
        ed.file &&
        ed.name.trim()
      ) {
        filesToUpload.push({
          name: ed.name.trim(),
          file: ed.file,
          isExtra: true
        });
      }
    });

    setLoading(true);

    let uploadedDocs = [];

    try {
      if (filesToUpload.length > 0) {
        setUploadStatus({
          current: 1,
          total:
            filesToUpload.length,
          fileName:
            filesToUpload[0].name,
          percentage: 0
        });
      }

      for (
        let i = 0;
        i < filesToUpload.length;
        i++
      ) {
        const item =
          filesToUpload[i];

        const safeFileName =
          item.file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path =
          `bookings/${user.uid}/` +
          `${Date.now()}_` +
          `${item.isExtra ? "extra_" : ""}` +
          safeFileName;

        const fileRef =
          ref(storage, path);

        const uploadTask =
          uploadBytesResumable(
            fileRef,
            item.file
          );

        await new Promise(
          (resolve, reject) => {
            uploadTask.on(
              "state_changed",

              (snapshot) => {
                const progress =
                  Math.round(
                    (snapshot.bytesTransferred /
                      snapshot.totalBytes) *
                      100
                  );

                setUploadStatus({
                  current: i + 1,
                  total:
                    filesToUpload.length,
                  fileName:
                    item.name,
                  percentage:
                    progress
                });
              },

              (error) => {
                reject(error);
              },

              () => {
                resolve();
              }
            );
          }
        );

        const url =
          await getDownloadURL(
            uploadTask.snapshot.ref
          );

        uploadedDocs.push({
          name: item.name,
          url,
          type: item.file.type
        });
      }

      setUploadStatus({
        completed: true
      });

      const govtFee =
        Number(
          selectedData?.govtFee || 0
        );

      const serviceCharge =
        Number(
          selectedData?.serviceCharge || 0
        );

      await addDoc(
        collection(db, "bookings"),
        {
          userId: user.uid,

          userName:
            name.trim(),

          userMobile:
            mobile.trim(),

          userEmail:
            email.trim(),

          service,

          date,

          time,

          customDetails,

          documents:
            uploadedDocs,

          govtFee,

          serviceCharge,

          total:
            govtFee +
            serviceCharge,

          status:
            "Pending",

          paymentStatus:
            "Pending",

          createdAt:
            serverTimestamp()
        }
      );

      setLoading(false);
      setUploadStatus(null);

      setStep(6);

    } catch (error) {
      console.error(
        "बुकिंगमध्ये त्रुटी:",
        error
      );

      alert(
        "बुकिंग पूर्ण होऊ शकले नाही. कृपया पुन्हा प्रयत्न करा."
      );

      setLoading(false);
      setUploadStatus(null);
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="bm-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >

      <div
        className={`bm-modal ${
          step === 6
            ? "bm-modal-success"
            : ""
        }`}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        {step !== 6 && (
          <div className="bm-header">

            <div className="bm-header-left">

              <div className="bm-header-icon">
                {getStepIcon()}
              </div>

              <div>
                <h2>
                  {getStepTitle()}
                </h2>

                <p className="bm-subtitle">
                  स्टेप{" "}
                  {getDisplayStep()}{" "}
                  पैकी{" "}
                  {totalSteps}
                </p>
              </div>

            </div>

            <button
              className="bm-close"
              onClick={onClose}
              disabled={loading}
              aria-label="बंद करा"
            >
              ×
            </button>

          </div>
        )}

        {/* =================================================
            PROGRESS
        ================================================= */}

        {step !== 6 && (
          <div className="bm-progress-wrapper">

            <div className="bm-progress-track">

              <div
                className="bm-progress-fill"
                style={{
                  width: `${
                    ((getDisplayStep() - 1) /
                      (totalSteps - 1)) *
                    100
                  }%`
                }}
              />

            </div>

            <div className="bm-progress-steps">

              {Array.from({
                length: totalSteps
              }).map((_, index) => {
                const number =
                  index + 1;

                const active =
                  number <=
                  getDisplayStep();

                return (
                  <div
                    key={number}
                    className={`bm-progress-step ${
                      active
                        ? "active"
                        : ""
                    }`}
                  >
                    <span>
                      {number <
                      getDisplayStep()
                        ? "✓"
                        : number}
                    </span>
                  </div>
                );
              })}

            </div>

          </div>
        )}

        {/* =================================================
            BODY
        ================================================= */}

        <div className="bm-body">

          {fetchingServices ? (

            <div className="bm-loading-state">

              <div className="bm-loader" />

              <h3>
                सेवा लोड होत आहेत
              </h3>

              <p>
                कृपया थोडा वेळ प्रतीक्षा करा...
              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  STEP 1 - बुकिंग माहिती
              ================================================= */}

              {step === 1 && (
                <div className="bm-step fade-in">

                  <div className="bm-welcome-box">

                    <div className="bm-welcome-icon">
                      ✨
                    </div>

                    <div>
                      <h3>
                        सेवा बुक करा
                      </h3>

                      <p>
                        तुमची आवडती सेवा,
                        तारीख आणि वेळ निवडा.
                      </p>
                    </div>

                  </div>

                  <div className="bm-input-group">

                    <label className="bm-label">
                      सेवा निवडा
                      <span>*</span>
                    </label>

                    <div className="bm-select-wrapper">

                      <select
                        className="bm-input"
                        value={service}
                        onChange={(e) =>
                          setService(
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          सेवा निवडा...
                        </option>

                        {Object.keys(
                          servicesData
                        ).map((s) => (
                          <option
                            key={s}
                            value={s}
                          >
                            {s}
                          </option>
                        ))}

                      </select>

                    </div>

                  </div>

                  <div className="bm-row">

                    <div className="bm-input-group">

                      <label className="bm-label">
                        तारीख
                        <span>*</span>
                      </label>

                      <input
                        className="bm-input"
                        type="date"
                        value={date}
                        min={getTodayString()}
                        onChange={
                          handleDateChange
                        }
                      />

                    </div>

                    <div className="bm-input-group">

                      <label className="bm-label">
                        वेळ
                        <span>*</span>
                      </label>

                      <select
                        className="bm-input"
                        value={time}
                        onChange={(e) =>
                          setTime(
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          वेळ निवडा
                        </option>

                        {timeSlots.map(
                          (slot) => (
                            <option
                              key={slot}
                              value={slot}
                            >
                              {slot}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                  </div>

                  <div className="bm-info-strip">

                    <span>
                      🔒
                    </span>

                    <p>
                      तुमची माहिती सुरक्षितपणे
                      हाताळली जाते.
                    </p>

                  </div>

                  <button
                    className="bm-btn primary bm-full-btn"
                    onClick={
                      handleNextStep1
                    }
                  >
                    पुढे जा
                    <span>→</span>
                  </button>

                </div>
              )}

              {/* =================================================
                  STEP 2 - सेवा माहिती
              ================================================= */}

              {step === 2 &&
                service &&
                servicesData[service] && (
                  <div className="bm-step fade-in">

                    <div className="bm-service-card">

                      <div className="bm-service-image-wrap">

                        {servicesData[
                          service
                        ].imageUrl ? (

                          <img
                            src={
                              servicesData[
                                service
                              ].imageUrl
                            }
                            alt={service}
                            className="bm-service-img"
                          />

                        ) : (

                          <div className="bm-service-placeholder">
                            ✨
                          </div>

                        )}

                      </div>

                      <div className="bm-service-info">

                        <span className="bm-small-badge">
                          निवडलेली सेवा
                        </span>

                        <h4>
                          {service}
                        </h4>

                        {servicesData[
                          service
                        ].description && (
                          <ServiceDescription
                            description={
                              servicesData[
                                service
                              ].description
                            }
                          />
                        )}

                      </div>

                    </div>

                    {/* शुल्क */}

                    <div className="bm-section-heading">

                      <span>💰</span>

                      <h3>
                        सेवा शुल्क
                      </h3>

                    </div>

                    <div className="bm-fee-box">

                      <div className="bm-fee-row">

                        <span>
                          शासकीय शुल्क
                        </span>

                        <strong>
                          ₹
                          {
                            servicesData[
                              service
                            ].govtFee
                          }
                        </strong>

                      </div>

                      <div className="bm-fee-row">

                        <span>
                          सेवा शुल्क
                        </span>

                        <strong>
                          ₹
                          {
                            servicesData[
                              service
                            ].serviceCharge
                          }
                        </strong>

                      </div>

                      <div className="bm-fee-total">

                        <span>
                          एकूण रक्कम
                        </span>

                        <strong>
                          ₹
                          {Number(
                            servicesData[
                              service
                            ].govtFee || 0
                          ) +
                            Number(
                              servicesData[
                                service
                              ].serviceCharge ||
                                0
                            )}
                        </strong>

                      </div>

                    </div>

                    {/* आवश्यक कागदपत्रे */}

                    {servicesData[
                      service
                    ].docs?.length > 0 && (
                      <div className="bm-docs-req">

                        <div className="bm-section-heading">

                          <span>
                            📋
                          </span>

                          <h3>
                            आवश्यक कागदपत्रे
                          </h3>

                        </div>

                        <div className="bm-doc-pills">

                          {servicesData[
                            service
                          ].docs.map(
                            (doc, i) => (
                              <span
                                key={i}
                                className={`bm-pill ${
                                  doc.isRequired
                                    ? "required"
                                    : "optional"
                                }`}
                              >

                                <span>
                                  📄
                                </span>

                                {doc.name}

                                {!doc.isRequired && (
                                  <small>
                                    ऐच्छिक
                                  </small>
                                )}

                              </span>
                            )
                          )}

                        </div>

                      </div>
                    )}

                    <div className="bm-actions">

                      <button
                        className="bm-btn secondary"
                        onClick={() =>
                          setStep(1)
                        }
                      >
                        ← मागे
                      </button>

                      <button
                        className="bm-btn primary"
                        onClick={() =>
                          setStep(3)
                        }
                      >
                        पुढे
                        <span>→</span>
                      </button>

                    </div>

                  </div>
                )}

              {/* =================================================
                  STEP 3 - संपर्क माहिती
              ================================================= */}

              {step === 3 && (
                <div className="bm-step fade-in">

                  <div className="bm-section-intro">

                    <div className="bm-intro-icon">
                      👤
                    </div>

                    <div>

                      <h3>
                        तुमची संपर्क माहिती
                      </h3>

                      <p>
                        तुमच्या बुकिंगबाबत
                        संपर्क करण्यासाठी ही
                        माहिती वापरली जाईल.
                      </p>

                    </div>

                  </div>

                  <div className="bm-input-group">

                    <label className="bm-label">
                      पूर्ण नाव
                      <span>*</span>
                    </label>

                    <input
                      className="bm-input"
                      type="text"
                      value={name}
                      onChange={(e) =>
                        setName(
                          e.target.value
                        )
                      }
                      placeholder="तुमचे पूर्ण नाव लिहा"
                    />

                  </div>

                  <div className="bm-input-group">

                    <label className="bm-label">
                      मोबाईल क्रमांक
                      <span>*</span>
                    </label>

                    <div className="bm-phone-input">

                      <span>
                        +91
                      </span>

                      <input
                        className="bm-input"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) =>
                          setMobile(
                            e.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                        placeholder="10 अंकी मोबाईल क्रमांक"
                      />

                    </div>

                  </div>

                  <div className="bm-input-group">

                    <label className="bm-label">
                      ई-मेल पत्ता
                      <span>*</span>
                    </label>

                    <input
                      className="bm-input"
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      placeholder="तुमचा ई-मेल पत्ता"
                    />

                  </div>

                  <div className="bm-security-note">

                    <span>
                      🔐
                    </span>

                    <div>

                      <strong>
                        तुमची माहिती सुरक्षित आहे
                      </strong>

                      <p>
                        आम्ही तुमची संपर्क माहिती
                        कोणत्याही तृतीय पक्षासोबत
                        शेअर करत नाही.
                      </p>

                    </div>

                  </div>

                  <div className="bm-actions">

                    <button
                      className="bm-btn secondary"
                      onClick={() =>
                        setStep(2)
                      }
                    >
                      ← मागे
                    </button>

                    <button
                      className="bm-btn primary"
                      onClick={
                        handleNextStep3
                      }
                    >
                      पुढे
                      <span>→</span>
                    </button>

                  </div>

                </div>
              )}

              {/* =================================================
                  STEP 4 - अतिरिक्त माहिती
              ================================================= */}

              {step === 4 &&
                service &&
                servicesData[service]
                  ?.customFields && (
                  <div className="bm-step fade-in">

                    <div className="bm-section-intro">

                      <div className="bm-intro-icon">
                        📝
                      </div>

                      <div>

                        <h3>
                          अतिरिक्त माहिती
                        </h3>

                        <p>
                          या सेवेसाठी आवश्यक
                          असलेली माहिती भरा.
                        </p>

                      </div>

                    </div>

                    {servicesData[
                      service
                    ].customFields.map(
                      (field, index) => (
                        <div
                          className="bm-input-group"
                          key={index}
                        >

                          <label className="bm-label">

                            {field.label}

                            {field.required && (
                              <span>
                                *
                              </span>
                            )}

                          </label>

                          {field.type ===
                          "select" ? (

                            <select
                              className="bm-input"
                              value={
                                customDetails[
                                  field.label
                                ] || ""
                              }
                              onChange={(e) =>
                                handleCustomDetailChange(
                                  field.label,
                                  e.target.value
                                )
                              }
                            >

                              <option value="">
                                पर्याय निवडा
                              </option>

                              {(
                                field.options ||
                                []
                              ).map(
                                (
                                  opt,
                                  i
                                ) => (
                                  <option
                                    key={i}
                                    value={opt}
                                  >
                                    {opt}
                                  </option>
                                )
                              )}

                            </select>

                          ) : field.type ===
                            "textarea" ? (

                            <textarea
                              className="bm-input bm-textarea"
                              value={
                                customDetails[
                                  field.label
                                ] || ""
                              }
                              onChange={(e) =>
                                handleCustomDetailChange(
                                  field.label,
                                  e.target.value
                                )
                              }
                              placeholder={`${field.label} लिहा`}
                              rows={4}
                            />

                          ) : (

                            <input
                              className="bm-input"
                              type={
                                field.type ||
                                "text"
                              }
                              value={
                                customDetails[
                                  field.label
                                ] || ""
                              }
                              onChange={(e) =>
                                handleCustomDetailChange(
                                  field.label,
                                  e.target.value
                                )
                              }
                              placeholder={`${field.label} लिहा`}
                            />

                          )}

                        </div>
                      )
                    )}

                    <div className="bm-actions">

                      <button
                        className="bm-btn secondary"
                        onClick={() =>
                          setStep(3)
                        }
                      >
                        ← मागे
                      </button>

                      <button
                        className="bm-btn primary"
                        onClick={
                          handleNextStep4
                        }
                      >
                        पुढे
                        <span>→</span>
                      </button>

                    </div>

                  </div>
                )}

              {/* =================================================
                  STEP 5 - कागदपत्रे
              ================================================= */}

              {step === 5 &&
                service &&
                servicesData[service] && (
                  <div className="bm-step fade-in">

                    {/* देय रक्कम */}

                    <div className="bm-payable-banner">

                      <div>

                        <span>
                          एकूण देय रक्कम
                        </span>

                        <small>
                          {service}
                        </small>

                      </div>

                      <strong>
                        ₹
                        {Number(
                          servicesData[
                            service
                          ].govtFee || 0
                        ) +
                          Number(
                            servicesData[
                              service
                            ].serviceCharge ||
                              0
                          )}
                      </strong>

                    </div>

                    {!loading && (
                      <div className="bm-upload-list">

                        {/* आवश्यक कागदपत्रे */}

                        {servicesData[
                          service
                        ].docs?.length > 0 ? (

                          <div className="bm-upload-section">

                            <div className="bm-section-heading">

                              <span>
                                📄
                              </span>

                              <h3>
                                आवश्यक कागदपत्रे
                              </h3>

                            </div>

                            {servicesData[
                              service
                            ].docs.map(
                              (
                                doc,
                                i
                              ) => (
                                <div
                                  key={i}
                                  className="bm-upload-group"
                                >

                                  <label className="bm-label">

                                    {doc.name}

                                    {doc.isRequired ? (
                                      <span>
                                        *
                                      </span>
                                    ) : (
                                      <small className="bm-optional-label">
                                        ऐच्छिक
                                      </small>
                                    )}

                                  </label>

                                  <div className="bm-file-wrapper">

                                    <input
                                      className="bm-file-input"
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={(e) =>
                                        handleFileChange(
                                          doc.name,
                                          e.target
                                            .files?.[0]
                                        )
                                      }
                                    />

                                    <div className="bm-upload-placeholder">

                                      <span className="bm-upload-icon">
                                        ⬆
                                      </span>

                                      <span>
                                        फाईल निवडा
                                      </span>

                                    </div>

                                  </div>

                                  {renderFilePreview(
                                    files[
                                      doc.name
                                    ]
                                  )}

                                </div>
                              )
                            )}

                          </div>

                        ) : (

                          <div className="bm-no-docs">

                            <span>
                              📂
                            </span>

                            <p>
                              कोणतीही पूर्वनिश्चित
                              कागदपत्रे आवश्यक नाहीत.
                            </p>

                          </div>

                        )}

                        {/* अतिरिक्त कागदपत्रे */}

                        <div className="bm-extra-section">

                          <div className="bm-extra-header">

                            <div className="bm-section-heading">

                              <span>
                                ➕
                              </span>

                              <h3>
                                अतिरिक्त कागदपत्रे
                              </h3>

                            </div>

                            <button
                              type="button"
                              className="bm-add-doc-btn"
                              onClick={
                                handleAddExtraDoc
                              }
                            >
                              + जोडा
                            </button>

                          </div>

                          {extraDocs.length ===
                          0 ? (

                            <div className="bm-extra-empty">

                              <span>
                                📎
                              </span>

                              <p>
                                आणखी एखादे कागदपत्र
                                अपलोड करायचे आहे?
                              </p>

                              <button
                                type="button"
                                onClick={
                                  handleAddExtraDoc
                                }
                              >
                                कागदपत्र जोडा
                              </button>

                            </div>

                          ) : (

                            extraDocs.map(
                              (
                                ed,
                                index
                              ) => (
                                <div
                                  key={ed.id}
                                  className="bm-extra-doc"
                                >

                                  <div className="bm-extra-doc-header">

                                    <span>
                                      कागदपत्र{" "}
                                      {index + 1}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveExtraDoc(
                                          ed.id
                                        )
                                      }
                                    >
                                      ×
                                    </button>

                                  </div>

                                  <input
                                    className="bm-input"
                                    type="text"
                                    placeholder="कागदपत्राचे नाव"
                                    value={
                                      ed.name
                                    }
                                    onChange={(e) =>
                                      handleExtraDocNameChange(
                                        ed.id,
                                        e.target
                                          .value
                                      )
                                    }
                                  />

                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="bm-file-input"
                                    onChange={(e) =>
                                      handleExtraDocFileChange(
                                        ed.id,
                                        e.target
                                          .files?.[0]
                                      )
                                    }
                                  />

                                  {renderFilePreview(
                                    ed.file
                                  )}

                                </div>
                              )
                            )

                          )}

                        </div>

                      </div>
                    )}

                    {/* अपलोड प्रगती */}

                    {loading &&
                      uploadStatus && (
                        <div className="bm-progress-card">

                          {uploadStatus.completed ? (

                            <div className="bm-upload-complete">

                              <div>
                                ✓
                              </div>

                              <p>
                                सर्व फाईल यशस्वीपणे
                                अपलोड झाल्या!
                              </p>

                            </div>

                          ) : (

                            <>

                              <div className="bm-progress-header">

                                <span>
                                  अपलोड होत आहे{" "}
                                  {
                                    uploadStatus.current
                                  }{" "}
                                  पैकी{" "}
                                  {
                                    uploadStatus.total
                                  }
                                </span>

                                <strong>
                                  {
                                    uploadStatus.percentage
                                  }
                                  %
                                </strong>

                              </div>

                              <div className="bm-progress-file">
                                {
                                  uploadStatus.fileName
                                }
                              </div>

                              <div className="bm-upload-progress-track">

                                <div
                                  className="bm-upload-progress-fill"
                                  style={{
                                    width: `${uploadStatus.percentage}%`
                                  }}
                                />

                              </div>

                            </>

                          )}

                        </div>
                      )}

                    <div className="bm-actions">

                      <button
                        className="bm-btn secondary"
                        onClick={
                          handleBackFromUpload
                        }
                        disabled={loading}
                      >
                        ← मागे
                      </button>

                      <button
                        className="bm-btn submit"
                        onClick={
                          handleSubmit
                        }
                        disabled={loading}
                      >

                        {loading ? (
                          <>
                            <span className="bm-button-loader" />
                            प्रक्रिया सुरू आहे...
                          </>
                        ) : (
                          <>
                            बुकिंग सबमिट करा
                            <span>✓</span>
                          </>
                        )}

                      </button>

                    </div>

                  </div>
                )}

              {/* =================================================
                  STEP 6 - यशस्वी बुकिंग
              ================================================= */}

              {step === 6 && (
                <div className="bm-success-step fade-in">

                  <div className="bm-success-animation-container">

                    <span className="bm-particle bm-p1" />
                    <span className="bm-particle bm-p2" />
                    <span className="bm-particle bm-p3" />
                    <span className="bm-particle bm-p4" />
                    <span className="bm-particle bm-p5" />
                    <span className="bm-particle bm-p6" />

                    <div className="bm-success-circle">

                      <span className="bm-check">
                        ✓
                      </span>

                    </div>

                  </div>

                  <span className="bm-success-badge">
                    यशस्वी
                  </span>

                  <h3 className="bm-success-heading">
                    बुकिंग निश्चित झाले!
                  </h3>

                  <p className="bm-success-subtext">
                    तुमची सेवा बुकिंग
                    यशस्वीरित्या सबमिट झाली आहे.
                    कृपया निवडलेल्या तारीख आणि
                    वेळेनुसार केंद्रावर उपस्थित रहा.
                  </p>

                  <div className="bm-success-details">

                    <div>

                      <span>
                        सेवा
                      </span>

                      <strong>
                        {service}
                      </strong>

                    </div>

                    <div>

                      <span>
                        तारीख
                      </span>

                      <strong>
                        {date}
                      </strong>

                    </div>

                    <div>

                      <span>
                        वेळ
                      </span>

                      <strong>
                        {time}
                      </strong>

                    </div>

                  </div>

                  <button
                    className="bm-btn submit bm-done-btn"
                    onClick={onClose}
                  >
                    पूर्ण झाले
                    <span>✓</span>
                  </button>

                </div>
              )}

            </>

          )}

        </div>

      </div>

    </div>
  );
}