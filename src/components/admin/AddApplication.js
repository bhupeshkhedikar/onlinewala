import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import {
    ref,
    uploadBytes,
    getDownloadURL,
    uploadBytesResumable
} from "firebase/storage";

import "./AddApplication.css";
import AllInvoicesPrint from "../AllInvoicesPrint";



export default function AddApplication({ userId, user }) {

    // --- STATES ---
    const [form, setForm] = useState({
        name: "",
        govtFee: "",
        serviceCharge: "",
        paid: true,
        note: ""
    });
const [showBulkPrint, setShowBulkPrint] = useState(false);
    const [extraServices, setExtraServices] = useState([]);

    // 🔥 DISCOUNT STATES
    const [discountType, setDiscountType] = useState("percent");
    const [discountValue, setDiscountValue] = useState("");

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

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            docFiles.forEach((f) => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
        };
    }, [docFiles]);

    // --- CALCULATIONS ---
    const baseTotal =
        Number(form.govtFee || 0) +
        Number(form.serviceCharge || 0);

    const extraTotal = extraServices.reduce(
        (sum, s) =>
            sum +
            Number(s.govtFee || 0) +
            Number(s.serviceCharge || 0),
        0
    );

    const subTotal = baseTotal + extraTotal;

    // 🔥 DISCOUNT CALCULATION
    let discountAmount = 0;

    if (discountType === "percent") {
        discountAmount =
            (subTotal * Number(discountValue || 0)) / 100;
    } else {
        discountAmount = Number(discountValue || 0);
    }

    // Prevent negative totals
    if (discountAmount > subTotal) {
        discountAmount = subTotal;
    }

    const total = subTotal - discountAmount;

    // --- EXTRA SERVICES ---
    const addExtraService = () => {
        setExtraServices([
            ...extraServices,
            {
                name: "",
                govtFee: "",
                serviceCharge: ""
            }
        ]);
    };

    const updateExtraService = (i, field, value) => {
        const updated = [...extraServices];
        updated[i] = {
            ...updated[i],
            [field]: value
        };
        setExtraServices(updated);
    };

    const removeExtraService = (i) => {
        setExtraServices(
            extraServices.filter((_, index) => index !== i)
        );
    };

    // --- FILE UPLOAD ---
    const uploadFile = async (file, path) => {
        if (!file) return "";

        const fileRef = ref(
            storage,
            `${path}/${Date.now()}_${file.name}`
        );

        await uploadBytes(fileRef, file);

        return await getDownloadURL(fileRef);
    };

    // --- ADD APPLICATION ---
    const handleAdd = async () => {

        if (!user || !form.name.trim()) {
            return alert("Service Name is required.");
        }

        setIsSubmittingApp(true);

        try {

            const formUrl = await uploadFile(
                formFile,
                `forms/${userId}`
            );

            const docsUrl = await uploadFile(
                docFile,
                `docs/${userId}`
            );

            const newApp = {
                ...form,

                govtFee: Number(form.govtFee),
                serviceCharge: Number(form.serviceCharge),

                extraServices,

                // 🔥 DISCOUNT DATA
                subTotal,
                discountType,
                discountValue: Number(discountValue || 0),
                discountAmount,

                total,

                date: new Date().toISOString(),

                formUrl,
                docsUrl
            };

            const updatedApps = [
                ...(user?.applications || []),
                newApp
            ];

            await updateDoc(
                doc(db, "users", userId),
                {
                    applications: updatedApps,
                    tickets: increment(1)
                }
            );

            // RESET
            setForm({
                name: "",
                govtFee: "",
                serviceCharge: "",
                paid: true,
                note: ""
            });

            setExtraServices([]);

            setDiscountValue("");
            setDiscountType("percent");

            setFormFile(null);
            setDocFile(null);

            alert(
                "Application submitted & 1 Free Spin Ticket added! 🎉"
            );

        } catch (error) {

            console.error(error);
            alert("Failed to add application.");

        } finally {

            setIsSubmittingApp(false);

        }
    };

    // --- DELETE APPLICATION ---
    const handleDeleteApp = async (index) => {

        if (!window.confirm("Delete this application?")) return;

        const updated = user?.applications?.filter(
            (_, i) => i !== index
        );

        await updateDoc(
            doc(db, "users", userId),
            {
                applications: updated
            }
        );
    };

    // --- TOGGLE PAID ---
    const togglePaid = async (index) => {

        const updated = [...(user?.applications || [])];

        updated[index] = {
            ...updated[index],
            paid: !updated[index].paid
        };

        await updateDoc(
            doc(db, "users", userId),
            {
                applications: updated
            }
        );
    };

    // --- PRINT ---
    const handlePrint = (app) => {
        setInvoiceData(app);

        setTimeout(() => {
            window.print();
        }, 500);
    };

    // --- DOCUMENT SELECT ---
    const handleFileSelect = (e) => {

        const files = Array.from(e.target.files).map((file) => ({
            file,
            preview: file.type.includes("image")
                ? URL.createObjectURL(file)
                : null
        }));

        setDocFiles(files);

        setDocMeta(
            files.map(() => ({
                title: "",
                subtitle: "",
                progress: 0,
                status: "Pending"
            }))
        );
    };

    // --- FORMAT DATE ---
    const formatInvoiceDate = (dateVal) => {

        if (!dateVal) {
            return new Date().toLocaleString("en-IN");
        }

        if (dateVal.seconds) {
            return new Date(
                dateVal.seconds * 1000
            ).toLocaleString("en-IN");
        }

        const d = new Date(dateVal);

        return isNaN(d.getTime())
            ? new Date().toLocaleString("en-IN")
            : d.toLocaleString("en-IN");
    };

    // --- UPLOAD DOCS ---
    const handleUploadDocs = async () => {

        if (!user || docFiles.length === 0) return;

        setIsUploadingDocs(true);

        let uploaded = [];

        try {

            for (let i = 0; i < docFiles.length; i++) {

                const file = docFiles[i].file;

                const fileRef = ref(
                    storage,
                    `userDocs/${userId}/${Date.now()}_${file.name}`
                );

                const uploadTask =
                    uploadBytesResumable(fileRef, file);

                await new Promise((resolve, reject) => {

                    uploadTask.on(
                        "state_changed",

                        (snapshot) => {

                            const progress =
                                (
                                    snapshot.bytesTransferred /
                                    snapshot.totalBytes
                                ) * 100;

                            setDocMeta((prev) => {

                                const newMeta = [...prev];

                                newMeta[i] = {
                                    ...newMeta[i],
                                    progress: Math.round(progress),
                                    status: "Uploading..."
                                };

                                return newMeta;
                            });
                        },

                        reject,

                        async () => {

                            const url = await getDownloadURL(
                                uploadTask.snapshot.ref
                            );

                            setDocMeta((prev) => {

                                const newMeta = [...prev];

                                newMeta[i] = {
                                    ...newMeta[i],
                                    progress: 100,
                                    status: "Done ✅"
                                };

                                return newMeta;
                            });

                            uploaded.push({
                                url,
                                name: file.name,
                                size:
                                    (
                                        file.size / 1024
                                    ).toFixed(1) + " KB",
                                type: file.type,
                                title:
                                    docMeta[i]?.title ||
                                    file.name,
                                subtitle:
                                    docMeta[i]?.subtitle || ""
                            });

                            resolve();
                        }
                    );
                });
            }

            const updatedDocs = [
                ...(user?.documents || []),
                ...uploaded
            ];

            await updateDoc(
                doc(db, "users", userId),
                {
                    documents: updatedDocs
                }
            );

            setDocFiles([]);
            setDocMeta([]);

        } catch (error) {

            console.error(error);
            alert("Upload failed.");

        } finally {

            setIsUploadingDocs(false);

        }
    };

    // --- DELETE DOC ---
    const handleDeleteDoc = async (index) => {

        if (!window.confirm("Delete this document?"))
            return;

        const updatedDocs = user?.documents?.filter(
            (_, i) => i !== index
        );

        await updateDoc(
            doc(db, "users", userId),
            {
                documents: updatedDocs
            }
        );
    };

    return (

        <div className="aa-wrapper">

            <div className="aa-layout">

                {/* LEFT COLUMN */}
                <div className="aa-col-left">

                    <div className="aa-card">

                        <h2 className="aa-heading">
                            Create Application
                        </h2>

                        {/* SERVICE NAME */}
                        <div className="aa-form-group">

                            <label className="aa-label">
                                Service Name
                            </label>

                            <input
                                className="aa-input"
                                placeholder="e.g. Passport Renewal"
                                value={form.name}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        name: e.target.value
                                    })
                                }
                            />
                        </div>

                        {/* FEES */}
                        <div className="aa-row-split">

                            <div className="aa-form-group">

                                <label className="aa-label">
                                    Govt Fee (₹)
                                </label>

                                <input
                                    className="aa-input"
                                    type="number"
                                    placeholder="0"
                                    value={form.govtFee}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            govtFee:
                                                e.target.value
                                        })
                                    }
                                />
                            </div>

                            <div className="aa-form-group">

                                <label className="aa-label">
                                    Service Charge (₹)
                                </label>

                                <input
                                    className="aa-input"
                                    type="number"
                                    placeholder="0"
                                    value={form.serviceCharge}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            serviceCharge:
                                                e.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* PAYMENT */}
                        <div className="aa-form-group">

                            <label className="aa-label">
                                Payment Status
                            </label>

                            <select
                                className="aa-select"
                                value={form.paid}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        paid:
                                            e.target.value ===
                                            "true"
                                    })
                                }
                            >
                                <option value="true">
                                    Paid
                                </option>

                                <option value="false">
                                    Pending
                                </option>
                            </select>
                        </div>

                        {/* NOTE */}
                        <div className="aa-form-group">

                            <label className="aa-label">
                                Extra Note
                            </label>

                            <textarea
                                className="aa-input"
                                rows="3"
                                placeholder="Add note..."
                                value={form.note}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        note: e.target.value
                                    })
                                }
                            />
                        </div>

                        {/* EXTRA SERVICES */}
                        <div className="aa-extras-box">

                            <div className="aa-extras-header">

                                <span className="aa-subheading">
                                    Additional Services
                                </span>

                                <button
                                    className="aa-btn-text"
                                    onClick={addExtraService}
                                >
                                    + Add Item
                                </button>
                            </div>

                            {extraServices.map((s, i) => (

                                <div
                                    key={i}
                                    className="aa-extra-item"
                                >

                                    <input
                                        className="aa-input aa-flex-2"
                                        placeholder="Item Name"
                                        value={s.name}
                                        onChange={(e) =>
                                            updateExtraService(
                                                i,
                                                "name",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className="aa-input aa-flex-1"
                                        type="number"
                                        placeholder="Govt"
                                        value={s.govtFee}
                                        onChange={(e) =>
                                            updateExtraService(
                                                i,
                                                "govtFee",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <input
                                        className="aa-input aa-flex-1"
                                        type="number"
                                        placeholder="Fee"
                                        value={s.serviceCharge}
                                        onChange={(e) =>
                                            updateExtraService(
                                                i,
                                                "serviceCharge",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <button
                                        className="aa-btn-del"
                                        onClick={() =>
                                            removeExtraService(i)
                                        }
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* 🔥 DISCOUNT SECTION */}
                        <div
                            className="aa-card"
                            style={{
                                marginTop: "15px",
                                padding: "15px"
                            }}
                        >

                            <h3
                                style={{
                                    marginBottom: "12px"
                                }}
                            >
                                Apply Discount
                            </h3>

                            <div className="aa-row-split">

                                <div className="aa-form-group">

                                    <label className="aa-label">
                                        Discount Type
                                    </label>

                                    <select
                                        className="aa-select"
                                        value={discountType}
                                        onChange={(e) =>
                                            setDiscountType(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="percent">
                                            Percentage (%)
                                        </option>

                                        <option value="rupee">
                                            Rupee (₹)
                                        </option>
                                    </select>
                                </div>

                                <div className="aa-form-group">

                                    <label className="aa-label">
                                        {discountType ===
                                        "percent"
                                            ? "Discount %"
                                            : "Discount ₹"}
                                    </label>

                                    <input
                                        className="aa-input"
                                        type="number"
                                        placeholder={
                                            discountType ===
                                            "percent"
                                                ? "Enter %"
                                                : "Enter amount"
                                        }
                                        value={discountValue}
                                        onChange={(e) =>
                                            setDiscountValue(
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FILES */}
                        <div className="aa-file-row">

                            <div className="aa-form-group">

                                <label className="aa-label">
                                    App Form
                                </label>

                                <input
                                    className="aa-file-input"
                                    type="file"
                                    onChange={(e) =>
                                        setFormFile(
                                            e.target.files[0]
                                        )
                                    }
                                />
                            </div>

                            <div className="aa-form-group">

                                <label className="aa-label">
                                    Support Doc
                                </label>

                                <input
                                    className="aa-file-input"
                                    type="file"
                                    onChange={(e) =>
                                        setDocFile(
                                            e.target.files[0]
                                        )
                                    }
                                />
                            </div>
                        </div>

                        {/* TOTAL */}
                        <div className="aa-total-banner">

                            <span>Subtotal</span>

                            <h4>₹{subTotal}</h4>

                            {Number(discountValue) > 0 && (
                                <>
                                    <span
                                        style={{
                                            marginTop: "8px",
                                            display: "block"
                                        }}
                                    >
                                        Discount Applied
                                    </span>

                                    <h4
                                        style={{
                                            color: "red"
                                        }}
                                    >
                                        -
                                        {discountType ===
                                        "percent"
                                            ? `${discountValue}%`
                                            : `₹${discountAmount}`}
                                    </h4>
                                </>
                            )}

                            <span
                                style={{
                                    marginTop: "10px",
                                    display: "block"
                                }}
                            >
                                Final Total
                            </span>

                            <h3>₹{total}</h3>
                        </div>

                        {/* SUBMIT */}
                        <button
                            className="aa-btn-primary"
                            onClick={handleAdd}
                            disabled={isSubmittingApp}
                        >
                            {isSubmittingApp
                                ? "Saving..."
                                : "Submit Application"}
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="aa-col-right">

                    {/* APPLICATIONS */}
                    <div className="aa-card">

                        <h2 className="aa-heading">
                            Current Applications
                        </h2>

                        <div className="aa-list">

                            {!user?.applications?.length && (
                                <div className="aa-empty">
                                    No applications filed yet.
                                </div>
                            )}

                            {user?.applications?.map(
                                (app, i) => (

                                    <div
                                        key={i}
                                        className="aa-list-item"
                                    >

                                        <div className="aa-list-header">

                                            <div className="aa-list-title-group">

                                                <span className="aa-list-title">
                                                    {app.name}
                                                </span>

                                                <span className="aa-list-date">
                                                    Filed:
                                                    {" "}
                                                    {formatInvoiceDate(
                                                        app.date
                                                    )}
                                                </span>
                                            </div>

                                            <div className="aa-list-actions">

                                                <button
                                                    className="aa-btn-icon-blue"
                                                    onClick={() =>
                                                        handlePrint(
                                                            app
                                                        )
                                                    }
                                                >
                                                    🖨️
                                                </button>

                                                <span
                                                    className={`aa-badge ${
                                                        app.paid
                                                            ? "aa-badge-paid"
                                                            : "aa-badge-pending"
                                                    }`}
                                                    onClick={() =>
                                                        togglePaid(
                                                            i
                                                        )
                                                    }
                                                >
                                                    {app.paid
                                                        ? "Paid"
                                                        : "Pending"}
                                                </span>

                                                <button
                                                    className="aa-btn-icon-red"
                                                    onClick={() =>
                                                        handleDeleteApp(
                                                            i
                                                        )
                                                    }
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>

                                        {app.note && (
                                            <div
                                                style={{
                                                    fontSize:
                                                        "0.85rem",
                                                    color:
                                                        "#666",
                                                    marginBottom:
                                                        "8px"
                                                }}
                                            >
                                                <strong>
                                                    Note:
                                                </strong>{" "}
                                                {app.note}
                                            </div>
                                        )}

                                        {app.discountValue >
                                            0 && (
                                            <div
                                                style={{
                                                    marginBottom:
                                                        "8px",
                                                    color:
                                                        "red",
                                                    fontSize:
                                                        "0.85rem"
                                                }}
                                            >
                                                Discount:
                                                {" "}
                                                {app.discountType ===
                                                "percent"
                                                    ? `${app.discountValue}%`
                                                    : `₹${app.discountAmount}`}
                                            </div>
                                        )}

                                        <div className="aa-list-price">
                                            ₹{app.total}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* PRINT INVOICE */}
            <div className="aa-print-only">

                {invoiceData && (

                    <div className="aa-invoice">

                        <div className="aa-invoice-header">

                            <h1>INVOICE</h1>

                            <div className="aa-invoice-meta">

                                <p>
                                    <strong>Date:</strong>
                                    {" "}
                                    {formatInvoiceDate(
                                        invoiceData.date
                                    )}
                                </p>

                                <p>
                                    <strong>Status:</strong>
                                    {" "}
                                    {invoiceData.paid
                                        ? "PAID"
                                        : "PENDING"}
                                </p>
                            </div>
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

                                <tr>

                                    <td>
                                        <strong>
                                            {invoiceData.name}
                                        </strong>
                                    </td>

                                    <td>
                                        ₹
                                        {invoiceData.govtFee ||
                                            0}
                                    </td>

                                    <td>
                                        ₹
                                        {invoiceData.serviceCharge ||
                                            0}
                                    </td>

                                    <td>
                                        ₹
                                        {Number(
                                            invoiceData.govtFee ||
                                                0
                                        ) +
                                            Number(
                                                invoiceData.serviceCharge ||
                                                    0
                                            )}
                                    </td>
                                </tr>

                                {invoiceData.extraServices?.map(
                                    (s, i) => (

                                        <tr key={i}>

                                            <td>{s.name}</td>

                                            <td>
                                                ₹
                                                {s.govtFee || 0}
                                            </td>

                                            <td>
                                                ₹
                                                {s.serviceCharge ||
                                                    0}
                                            </td>

                                            <td>
                                                ₹
                                                {Number(
                                                    s.govtFee
                                                ) +
                                                    Number(
                                                        s.serviceCharge
                                                    )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>

                        {/* 🔥 DISCOUNT */}
                        {invoiceData.discountValue > 0 && (

                            <div
                                style={{
                                    marginTop: "15px"
                                }}
                            >

                                <p>
                                    <strong>
                                        Subtotal:
                                    </strong>
                                    {" "}
                                    ₹
                                    {invoiceData.subTotal}
                                </p>

                                <p
                                    style={{
                                        color: "red"
                                    }}
                                >
                                    <strong>
                                        Discount:
                                    </strong>
                                    {" "}
                                    {invoiceData.discountType ===
                                    "percent"
                                        ? `${invoiceData.discountValue}%`
                                        : `₹${invoiceData.discountAmount}`}
                                </p>
                            </div>
                        )}

                        {invoiceData.note && (

                            <div
                                style={{
                                    marginTop: "20px",
                                    padding: "15px",
                                    backgroundColor:
                                        "#f9f9f9"
                                }}
                            >

                                <p>
                                    <strong>Note:</strong>
                                    {" "}
                                    {invoiceData.note}
                                </p>
                            </div>
                        )}

                        <div className="aa-invoice-total">

                            <h2>
                                Total Amount:
                                {" "}
                                ₹{invoiceData.total}
                            </h2>
                        </div>

                        <div className="aa-invoice-footer">

                            <p>
                                Thank you for your business!
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <button 
    className="aa-btn-primary" 
    onClick={() => setShowBulkPrint(true)}
    style={{ marginBottom: '15px' }}
>
    Print All Invoices
</button>

// ... render at the absolute bottom of your component return
{showBulkPrint && (
    <AllInvoicesPrint 
        user={user} 
        onClose={() => setShowBulkPrint(false)} 
    />
)}
        </div>
        
    );
}