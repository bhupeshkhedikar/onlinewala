import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
// 🔥 NAYA: 'increment' ko import kiya gaya hai
import { doc, updateDoc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import "./AddApplication.css";

export default function AddApplication({ userId, user }) {
    // --- STATES ---
    const [form, setForm] = useState({ name: "", govtFee: "", serviceCharge: "", paid: true, note: "" });
    const [extraServices, setExtraServices] = useState([]);
    const [formFile, setFormFile] = useState(null);
    const [docFile, setDocFile] = useState(null);
    const [isSubmittingApp, setIsSubmittingApp] = useState(false);

    const [docFiles, setDocFiles] = useState([]);
    const [docMeta, setDocMeta] = useState([]);
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);

    const [previewIndex, setPreviewIndex] = useState(null);
    const [zoom, setZoom] = useState(1);

    // 🔥 INVOICE STATE
    const [invoiceData, setInvoiceData] = useState(null);

    // Cleanup object URLs for memory management
    useEffect(() => {
        return () => {
            docFiles.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
        };
    }, [docFiles]);

    // --- CALCULATIONS ---
    const baseTotal = Number(form.govtFee || 0) + Number(form.serviceCharge || 0);
    const extraTotal = extraServices.reduce((sum, s) => sum + Number(s.govtFee || 0) + Number(s.serviceCharge || 0), 0);
    const total = baseTotal + extraTotal;

    // --- EXTRA SERVICES ---
    const addExtraService = () => setExtraServices([...extraServices, { name: "", govtFee: "", serviceCharge: "" }]);
    const updateExtraService = (i, field, value) => {
        const updated = [...extraServices];
        updated[i] = { ...updated[i], [field]: value };
        setExtraServices(updated);
    };
    const removeExtraService = (i) => setExtraServices(extraServices.filter((_, index) => index !== i));

    // --- ADD APPLICATION ---
    const uploadFile = async (file, path) => {
        if (!file) return "";
        const fileRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const handleAdd = async () => {
        if (!user || !form.name.trim()) return alert("Service Name is required.");
        setIsSubmittingApp(true);

        try {
            const formUrl = await uploadFile(formFile, `forms/${userId}`);
            const docsUrl = await uploadFile(docFile, `docs/${userId}`);

            const newApp = {
                ...form,
                govtFee: Number(form.govtFee),
                serviceCharge: Number(form.serviceCharge),
                extraServices,
                total,
                date: new Date().toISOString(),
                formUrl,
                docsUrl
            };

            const updatedApps = [...(user?.applications || []), newApp];
            
            // 🔥 NAYA CODE: Application save karne ke sath tickets badhao
            await updateDoc(doc(db, "users", userId), { 
                applications: updatedApps,
                tickets: increment(1) // Ek form = Ek free spin ticket!
            });

            // Reset fields
            setForm({ name: "", govtFee: "", serviceCharge: "", paid: true, note: "" });
            setExtraServices([]);
            setFormFile(null);
            setDocFile(null);
            
            alert("Application submitted & 1 Free Spin Ticket added! 🎉");

        } catch (error) {
            console.error(error);
            alert("Failed to add application.");
        } finally {
            setIsSubmittingApp(false);
        }
    };

    const handleDeleteApp = async (index) => {
        if (!window.confirm("Delete this application?")) return;
        const updated = user?.applications?.filter((_, i) => i !== index);
        await updateDoc(doc(db, "users", userId), { applications: updated });
    };

    const togglePaid = async (index) => {
        const updated = [...(user?.applications || [])];
        updated[index] = { ...updated[index], paid: !updated[index].paid };
        await updateDoc(doc(db, "users", userId), { applications: updated });
    };

    // 🔥 PRINT HANDLER
    const handlePrint = (app) => {
        setInvoiceData(app);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    // --- DOCUMENT UPLOAD ---
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files).map(file => ({
            file,
            preview: file.type.includes("image") ? URL.createObjectURL(file) : null
        }));
        setDocFiles(files);
        setDocMeta(files.map(() => ({ title: "", subtitle: "", progress: 0, status: "Pending" })));
    };

    const formatInvoiceDate = (dateVal) => {
        if (!dateVal) return new Date().toLocaleString('en-IN');
        if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleString('en-IN');
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? new Date().toLocaleString('en-IN') : d.toLocaleString('en-IN');
    };

    const handleUploadDocs = async () => {
        if (!user || docFiles.length === 0) return;
        setIsUploadingDocs(true);
        let uploaded = [];

        try {
            for (let i = 0; i < docFiles.length; i++) {
                const file = docFiles[i].file;
                const fileRef = ref(storage, `userDocs/${userId}/${Date.now()}_${file.name}`);
                const uploadTask = uploadBytesResumable(fileRef, file);

                await new Promise((resolve, reject) => {
                    uploadTask.on("state_changed",
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setDocMeta(prev => {
                                const newMeta = [...prev];
                                newMeta[i] = { ...newMeta[i], progress: Math.round(progress), status: "Uploading..." };
                                return newMeta;
                            });
                        },
                        reject,
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            setDocMeta(prev => {
                                const newMeta = [...prev];
                                newMeta[i] = { ...newMeta[i], progress: 100, status: "Done ✅" };
                                return newMeta;
                            });

                            uploaded.push({
                                url,
                                name: file.name,
                                size: (file.size / 1024).toFixed(1) + " KB",
                                type: file.type,
                                title: docMeta[i]?.title || file.name,
                                subtitle: docMeta[i]?.subtitle || ""
                            });
                            resolve();
                        }
                    );
                });
            }

            const updatedDocs = [...(user?.documents || []), ...uploaded];
            await updateDoc(doc(db, "users", userId), { documents: updatedDocs });

            setDocFiles([]);
            setDocMeta([]);
        } catch (error) {
            console.error(error);
            alert("Upload failed.");
        } finally {
            setIsUploadingDocs(false);
        }
    };

    const handleDeleteDoc = async (index) => {
        if (!window.confirm("Delete this document?")) return;
        const updatedDocs = user?.documents?.filter((_, i) => i !== index);
        await updateDoc(doc(db, "users", userId), { documents: updatedDocs });
    };

    return (
        <div className="aa-wrapper">

            {/* --- NORMAL UI --- */}
            <div className="aa-layout">

                {/* LEFT COLUMN: Data Entry Forms */}
                <div className="aa-col-left">
                    {/* Add App Card */}
                    <div className="aa-card">
                        <h2 className="aa-heading">Create Application</h2>

                        <div className="aa-form-group">
                            <label className="aa-label">Service Name</label>
                            <input className="aa-input" placeholder="e.g. Passport Renewal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>

                        <div className="aa-row-split">
                            <div className="aa-form-group">
                                <label className="aa-label">Govt Fee (₹)</label>
                                <input className="aa-input" type="number" placeholder="0" value={form.govtFee} onChange={e => setForm({ ...form, govtFee: e.target.value })} />
                            </div>
                            <div className="aa-form-group">
                                <label className="aa-label">Service Charge (₹)</label>
                                <input className="aa-input" type="number" placeholder="0" value={form.serviceCharge} onChange={e => setForm({ ...form, serviceCharge: e.target.value })} />
                            </div>
                        </div>

                        <div className="aa-form-group">
                            <label className="aa-label">Payment Status</label>
                            <select className="aa-select" value={form.paid} onChange={e => setForm({ ...form, paid: e.target.value === "true" })}>
                                <option value="true">Paid</option>
                                <option value="false">Pending</option>
                            </select>
                        </div>

                        {/* 🔥 Added Note Field */}
                        <div className="aa-form-group">
                            <label className="aa-label">Extra Note (Optional)</label>
                            <textarea 
                                className="aa-input" 
                                placeholder="Add any additional details, status updates, or internal notes here..." 
                                value={form.note} 
                                onChange={e => setForm({ ...form, note: e.target.value })} 
                                rows="3"
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {/* Extra Services Box */}
                        <div className="aa-extras-box">
                            <div className="aa-extras-header">
                                <span className="aa-subheading">Additional Services</span>
                                <button className="aa-btn-text" onClick={addExtraService}>+ Add Item</button>
                            </div>

                            {extraServices.map((s, i) => (
                                <div key={i} className="aa-extra-item">
                                    <input className="aa-input aa-flex-2" placeholder="Item Name" value={s.name} onChange={e => updateExtraService(i, "name", e.target.value)} />
                                    <input className="aa-input aa-flex-1" type="number" placeholder="Govt" value={s.govtFee} onChange={e => updateExtraService(i, "govtFee", e.target.value)} />
                                    <input className="aa-input aa-flex-1" type="number" placeholder="Fee" value={s.serviceCharge} onChange={e => updateExtraService(i, "serviceCharge", e.target.value)} />
                                    <button className="aa-btn-del" onClick={() => removeExtraService(i)}>✕</button>
                                </div>
                            ))}
                        </div>

                        {/* File Attachments */}
                        <div className="aa-file-row">
                            <div className="aa-form-group">
                                <label className="aa-label">App Form (Optional)</label>
                                <input className="aa-file-input" type="file" onChange={e => setFormFile(e.target.files[0])} />
                            </div>
                            <div className="aa-form-group">
                                <label className="aa-label">Support Doc (Optional)</label>
                                <input className="aa-file-input" type="file" onChange={e => setDocFile(e.target.files[0])} />
                            </div>
                        </div>

                        {/* Total Area */}
                        <div className="aa-total-banner">
                            <span>Total Estimated Cost</span>
                            <h3>₹{total}</h3>
                        </div>

                        <button className="aa-btn-primary" onClick={handleAdd} disabled={isSubmittingApp}>
                            {isSubmittingApp ? "Saving..." : "Submit Application"}
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Upload, Display Apps, Display Docs */}
                <div className="aa-col-right">

                    {/* Upload Documents Card */}
                    <div className="aa-card">
                        <h2 className="aa-heading">Upload Documents</h2>
                        <div className="aa-upload-trigger">
                            <input type="file" id="aa-doc-upload" multiple onChange={handleFileSelect} hidden />
                            <label htmlFor="aa-doc-upload" className="aa-btn-secondary">Browse Files to Upload</label>
                        </div>

                        {docFiles.length > 0 && (
                            <div className="aa-upload-queue">
                                {docFiles.map((f, i) => (
                                    <div key={i} className="aa-queue-item">
                                        {f.preview ? <img src={f.preview} className="aa-thumb" alt="preview" /> : <div className="aa-thumb-placeholder">DOC</div>}
                                        <div className="aa-queue-info">
                                            <p className="aa-truncate">{f.file.name}</p>
                                            <div className="aa-queue-inputs">
                                                <input className="aa-input aa-input-sm" placeholder="Title" value={docMeta[i]?.title || ""} onChange={e => {
                                                    const newMeta = [...docMeta]; newMeta[i].title = e.target.value; setDocMeta(newMeta);
                                                }} />
                                                <input className="aa-input aa-input-sm" placeholder="Subtitle" value={docMeta[i]?.subtitle || ""} onChange={e => {
                                                    const newMeta = [...docMeta]; newMeta[i].subtitle = e.target.value; setDocMeta(newMeta);
                                                }} />
                                            </div>
                                            <div className="aa-progress-bar"><div className="aa-progress-fill" style={{ width: `${docMeta[i]?.progress || 0}%` }} /></div>
                                            <span className="aa-status-text">{docMeta[i]?.status}</span>
                                        </div>
                                    </div>
                                ))}
                                <button className="aa-btn-primary" onClick={handleUploadDocs} disabled={isUploadingDocs}>
                                    {isUploadingDocs ? "Uploading Data..." : "Confirm Uploads"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Applications List */}
                    <div className="aa-card">
                        <h2 className="aa-heading">Current Applications</h2>
                        <div className="aa-list">
                            {!user?.applications?.length && <div className="aa-empty">No applications filed yet.</div>}

                            {user?.applications?.map((app, i) => (
                                <div key={i} className="aa-list-item">

                                    <div className="aa-list-header">
                                        <div className="aa-list-title-group">
                                            <span className="aa-list-title">{app.name}</span>
                                            <span className="aa-list-date">
                                                <span className="aa-list-date">
                                                    Filed: {formatInvoiceDate(app.date)}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="aa-list-actions">
                                            <button className="aa-btn-icon-blue" onClick={() => handlePrint(app)} title="Print Invoice">🖨️</button>
                                            <span className={`aa-badge ${app.paid ? "aa-badge-paid" : "aa-badge-pending"}`} onClick={() => togglePaid(i)}>
                                                {app.paid ? "Paid" : "Pending"}
                                            </span>
                                            <button className="aa-btn-icon-red" onClick={() => handleDeleteApp(i)} title="Delete">✕</button>
                                        </div>
                                    </div>

                                    {/* 🔥 Added Optional Note Display */}
                                    {app.note && (
                                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', fontStyle: 'italic' }}>
                                            <strong>Note:</strong> {app.note}
                                        </div>
                                    )}

                                    <div className="aa-list-price">₹{app.total}</div>

                                    {app.extraServices?.length > 0 && (
                                        <div className="aa-list-extras">
                                            {app.extraServices.map((s, j) => (
                                                <div key={j} className="aa-list-extra-row">
                                                    <span>{s.name}</span>
                                                    <span>₹{Number(s.govtFee) + Number(s.serviceCharge)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Documents Grid */}
                    <div className="aa-card">
                        <h2 className="aa-heading">Saved Documents</h2>
                        {!user?.documents?.length && <div className="aa-empty">No documents found.</div>}

                        <div className="aa-doc-grid">
                            {user?.documents?.map((d, i) => (
                                <div key={i} className="aa-doc-card">
                                    <div className="aa-doc-visual" onClick={() => setPreviewIndex(i)}>
                                        {d.type.includes("image") ? <img src={d.url} alt={d.title} /> : <div className="aa-doc-pdf">PDF</div>}
                                    </div>
                                    <div className="aa-doc-details">
                                        <span className="aa-doc-title" title={d.title || d.name}>{d.title || d.name}</span>
                                        {d.subtitle && <span className="aa-doc-sub">{d.subtitle}</span>}
                                        <div className="aa-doc-footer">
                                            <div className="aa-doc-meta-info">
                                                <span className="aa-doc-size">{d.size}</span>
                                                <span className="aa-doc-type">
                                                    {d.type ? d.type.split('/').pop().toUpperCase() : 'FILE'}
                                                </span>
                                            </div>
                                            <div className="aa-doc-btns">
                                                <a href={d.url} download className="aa-btn-icon-blue" title="Download">⬇</a>
                                                <button className="aa-btn-icon-red" onClick={() => handleDeleteDoc(i)} title="Delete">🗑</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* --- MEDIA VIEWER MODAL --- */}
            {previewIndex !== null && (
                <div className="aa-modal">
                    <div className="aa-modal-header">
                        <div className="aa-zoom-tools">
                            <button onClick={() => setZoom(z => z + 0.25)}>+</button>
                            <button onClick={() => setZoom(z => Math.max(1, z - 0.25))}>-</button>
                            <span className="aa-zoom-level">{Math.round(zoom * 100)}%</span>
                        </div>
                        <button className="aa-modal-close" onClick={() => { setPreviewIndex(null); setZoom(1); }}>✕</button>
                    </div>

                    <button className="aa-nav-btn aa-nav-left" onClick={() => setPreviewIndex((previewIndex - 1 + user.documents.length) % user.documents.length)}>◀</button>
                    <button className="aa-nav-btn aa-nav-right" onClick={() => setPreviewIndex((previewIndex + 1) % user.documents.length)}>▶</button>

                    <div className="aa-viewer">
                        {user.documents[previewIndex]?.type.includes("image") ? (
                            <img src={user.documents[previewIndex].url} style={{ transform: `scale(${zoom})` }} alt="preview" />
                        ) : (
                            <iframe src={user.documents[previewIndex].url} title="document" />
                        )}
                    </div>
                </div>
            )}

            {/* 🔥 INVOICE PRINT TEMPLATE (Hidden by default, visible only on print) */}
            <div className="aa-print-only">
                {invoiceData && (
                    <div className="aa-invoice">
                        <div className="aa-invoice-header">
                            <h1>INVOICE</h1>
                            <div className="aa-invoice-meta">
                                <p><strong>Date:</strong> {formatInvoiceDate(invoiceData?.date)}</p>
                                <p><strong>Status:</strong> {invoiceData.paid ? "PAID" : "PENDING"}</p>
                            </div>
                        </div>

                        <div className="aa-invoice-customer">
                            <p><strong>Billed To:</strong></p>
                            <p>{user?.name || "Customer"}</p>
                            <p>{user?.email || ""}</p>
                        </div>

                        <table className="aa-invoice-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Govt Fee</th>
                                    <th>Service Charge</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Main Service */}
                                <tr>
                                    <td><strong>{invoiceData.name}</strong></td>
                                    <td>₹{invoiceData.govtFee || 0}</td>
                                    <td>₹{invoiceData.serviceCharge || 0}</td>
                                    <td>₹{Number(invoiceData.govtFee || 0) + Number(invoiceData.serviceCharge || 0)}</td>
                                </tr>

                                {/* Extra Services */}
                                {invoiceData.extraServices?.map((s, i) => (
                                    <tr key={i}>
                                        <td>{s.name}</td>
                                        <td>₹{s.govtFee || 0}</td>
                                        <td>₹{s.serviceCharge || 0}</td>
                                        <td>₹{Number(s.govtFee || 0) + Number(s.serviceCharge || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* 🔥 Display Note on Invoice if it exists */}
                        {invoiceData.note && (
                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderLeft: '3px solid #ccc' }}>
                                <p style={{ margin: 0 }}><strong>Note:</strong> {invoiceData.note}</p>
                            </div>
                        )}

                        <div className="aa-invoice-total">
                            <h2>Total Amount: ₹{invoiceData.total}</h2>
                        </div>

                        <div className="aa-invoice-footer">
                            <p>Thank you for your business!</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}