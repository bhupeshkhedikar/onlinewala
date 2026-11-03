import { useState, useEffect } from "react";
import { db, storage } from "./firebase";
// 🔥 NAYA: 'increment' ko import kiya gaya hai
import { doc, updateDoc, increment, collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import "./AddApplication.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function AddApplication({ userId, user }) {
    // --- STATES ---
    const [form, setForm] = useState({ name: "", govtFee: "", serviceCharge: "", paid: true, note: "", discountType: "amount", discountValue: "" });
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
    const [activeTab, setActiveTab] = useState("create");

    // Category-wise WhatsApp PDF library + application-specific attachments
    const [pdfCategories, setPdfCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedLibraryDocumentIds, setSelectedLibraryDocumentIds] = useState([]);
    const [individualPdfFiles, setIndividualPdfFiles] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [libraryCategoryId, setLibraryCategoryId] = useState("");
    const [libraryDocType, setLibraryDocType] = useState("question-paper");
    const [libraryPdfFiles, setLibraryPdfFiles] = useState([]);
    const [isSavingLibrary, setIsSavingLibrary] = useState(false);
    const [editingLibraryDoc, setEditingLibraryDoc] = useState(null);
    const [libraryDocDraft, setLibraryDocDraft] = useState({ title: "", type: "other" });

    useEffect(() => {
        const loadPdfCategories = async () => {
            try {
                const snap = await getDocs(collection(db, "applicationDocumentCategories"));
                const categories = snap.docs.map(item => ({ id: item.id, ...item.data() }));
                setPdfCategories(categories.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))));
            } catch (error) {
                console.error("PDF category load failed:", error);
            }
        };
        loadPdfCategories();
    }, []);

    const selectedCategory = pdfCategories.find(item => item.id === selectedCategoryId);
    const availableCategoryDocuments = (selectedCategory?.documents || []).filter(item => item.active !== false);
    const selectedCategoryDocuments = availableCategoryDocuments.filter(item => selectedLibraryDocumentIds.includes(item.id));

    const toggleLibraryDocumentSelection = (documentId) => {
        setSelectedLibraryDocumentIds(prev => prev.includes(documentId)
            ? prev.filter(id => id !== documentId)
            : [...prev, documentId]
        );
    };

    const createPdfCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return alert("Category name enter karein.");
        setIsSavingLibrary(true);
        try {
            const categoryRef = await addDoc(collection(db, "applicationDocumentCategories"), {
                name,
                documents: [],
                active: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            const created = { id: categoryRef.id, name, documents: [], active: true };
            setPdfCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setLibraryCategoryId(categoryRef.id);
            setNewCategoryName("");
            alert("Category created successfully.");
        } catch (error) {
            console.error(error);
            alert("Category create nahi ho payi.");
        } finally {
            setIsSavingLibrary(false);
        }
    };

    const uploadCategoryPdfs = async () => {
        if (!libraryCategoryId) return alert("Pehle category select karein.");
        if (!libraryPdfFiles.length) return alert("PDF files select karein.");
        if (libraryPdfFiles.some(file => file.type !== "application/pdf")) return alert("Sirf PDF files allowed hain.");
        setIsSavingLibrary(true);
        try {
            const uploaded = await Promise.all(libraryPdfFiles.map(async file => {
                const storagePath = `application-documents/categories/${libraryCategoryId}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, storagePath);
                await uploadBytes(fileRef, file, { contentType: "application/pdf" });
                return {
                    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    title: file.name.replace(/\.pdf$/i, ""),
                    type: libraryDocType,
                    storagePath,
                    url: await getDownloadURL(fileRef),
                    active: true,
                    createdAt: new Date().toISOString()
                };
            }));
            const category = pdfCategories.find(item => item.id === libraryCategoryId);
            const updatedDocuments = [...(category?.documents || []), ...uploaded];
            await updateDoc(doc(db, "applicationDocumentCategories", libraryCategoryId), {
                documents: updatedDocuments,
                updatedAt: serverTimestamp()
            });
            setPdfCategories(prev => prev.map(item => item.id === libraryCategoryId ? { ...item, documents: updatedDocuments } : item));
            setLibraryPdfFiles([]);
            alert(`${uploaded.length} PDF(s) library mein upload ho gaye.`);
        } catch (error) {
            console.error(error);
            alert("PDF upload failed. Firebase Storage rules aur permissions check karein.");
        } finally {
            setIsSavingLibrary(false);
        }
    };

    const startEditLibraryDocument = (category, item) => {
        setEditingLibraryDoc({ categoryId: category.id, documentId: item.id });
        setLibraryDocDraft({ title: item.title || "", type: item.type || "other" });
    };

    const saveLibraryDocument = async () => {
        const title = libraryDocDraft.title.trim();
        if (!title) return alert("Document name enter karein.");
        const category = pdfCategories.find(item => item.id === editingLibraryDoc?.categoryId);
        if (!category) return alert("Category nahi mili.");
        setIsSavingLibrary(true);
        try {
            const updatedDocuments = (category.documents || []).map(item =>
                item.id === editingLibraryDoc.documentId
                    ? { ...item, title, type: libraryDocDraft.type, updatedAt: new Date().toISOString() }
                    : item
            );
            await updateDoc(doc(db, "applicationDocumentCategories", category.id), {
                documents: updatedDocuments,
                updatedAt: serverTimestamp()
            });
            setPdfCategories(prev => prev.map(item => item.id === category.id ? { ...item, documents: updatedDocuments } : item));
            setEditingLibraryDoc(null);
            alert("Document details updated successfully.");
        } catch (error) {
            console.error("Library document update failed:", error);
            alert("Document update nahi ho paya. Firebase permissions check karein.");
        } finally {
            setIsSavingLibrary(false);
        }
    };

    const deleteLibraryDocument = async (category, item) => {
        if (!window.confirm(`Delete '${item.title}'? Ye action undo nahi hoga.`)) return;
        setIsSavingLibrary(true);
        try {
            const updatedDocuments = (category.documents || []).filter(docItem => docItem.id !== item.id);
            await updateDoc(doc(db, "applicationDocumentCategories", category.id), {
                documents: updatedDocuments,
                updatedAt: serverTimestamp()
            });
            setPdfCategories(prev => prev.map(cat => cat.id === category.id ? { ...cat, documents: updatedDocuments } : cat));
            if (item.storagePath) {
                try {
                    await deleteObject(ref(storage, item.storagePath));
                } catch (storageError) {
                    console.warn("Document removed from library, but Storage cleanup failed:", storageError);
                    alert("Document library se delete ho gaya, lekin Storage file delete nahi ho payi. Firebase Storage rules check karein.");
                    return;
                }
            }
            if (editingLibraryDoc?.documentId === item.id) setEditingLibraryDoc(null);
            alert("Document deleted successfully.");
        } catch (error) {
            console.error("Library document delete failed:", error);
            alert("Document delete nahi ho paya. Firebase permissions check karein.");
        } finally {
            setIsSavingLibrary(false);
        }
    };

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
    const extraTotal = extraServices.reduce(
        (sum, s) => sum + Number(s.govtFee || 0) + Number(s.serviceCharge || 0),
        0
    );
    const subtotal = baseTotal + extraTotal;
    const rawDiscount = Math.max(0, Number(form.discountValue || 0));
    const discountAmount = form.discountType === "percentage"
        ? Math.min(subtotal, subtotal * Math.min(rawDiscount, 100) / 100)
        : Math.min(subtotal, rawDiscount);
    const total = Math.max(0, subtotal - discountAmount);

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
            const category = pdfCategories.find(item => item.id === selectedCategoryId);
            const categoryDocuments = (category?.documents || []).filter(item =>
                item.active !== false && selectedLibraryDocumentIds.includes(item.id)
            );
            const individualDocuments = await Promise.all(individualPdfFiles.map(async file => {
                if (file.type !== "application/pdf") throw new Error(`${file.name} is not a PDF file.`);
                const storagePath = `application-documents/custom/${userId}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, storagePath);
                await uploadBytes(fileRef, file, { contentType: "application/pdf" });
                return { title: file.name.replace(/\.pdf$/i, ""), type: "individual", storagePath, url: await getDownloadURL(fileRef) };
            }));

            const newApp = {
                ...form,
                govtFee: Number(form.govtFee),
                serviceCharge: Number(form.serviceCharge),
                extraServices,
                subtotal,
                discountType: form.discountType,
                discountValue: rawDiscount,
                discountAmount,
                total,
                date: new Date().toISOString(),
                formUrl,
                docsUrl,
                documentCategoryId: selectedCategoryId || "",
                documentCategoryName: category?.name || "",
                categoryDocuments,
                individualDocuments
            };

            const updatedApps = [...(user?.applications || []), newApp];
            
            // 🔥 NAYA CODE: Application save karne ke sath tickets badhao
            await updateDoc(doc(db, "users", userId), { 
                applications: updatedApps,
                tickets: increment(1) // Ek form = Ek free spin ticket!
            });

            // Generate the same styled invoice PDF, upload it to Firebase Storage,
            // then ask the Cloud Function to send it with the selected PDFs.
            // Application saving must remain successful even if WhatsApp sending fails.
            try {
                const invoiceResult = await handleDownloadInvoice(newApp, true);
                if (!invoiceResult?.blob) {
                    throw new Error("Invoice PDF could not be generated.");
                }

                const invoiceStoragePath = `application-invoices/${userId}/${Date.now()}_${invoiceResult.fileName}`;
                const invoiceRef = ref(storage, invoiceStoragePath);
                await uploadBytes(invoiceRef, invoiceResult.blob, {
                    contentType: "application/pdf"
                });

                const documentStoragePaths = [
                    ...categoryDocuments.map(item => item.storagePath).filter(Boolean),
                    ...individualDocuments.map(item => item.storagePath).filter(Boolean)
                ];

                // Save the generated invoice path and exact selected attachments with this application.
                const applicationWithFiles = {
                    ...newApp,
                    invoiceStoragePath,
                    whatsappDocumentStoragePaths: documentStoragePaths
                };
                const appsWithInvoice = [...updatedApps];
                appsWithInvoice[appsWithInvoice.length - 1] = applicationWithFiles;
                await updateDoc(doc(db, "users", userId), {
                    applications: appsWithInvoice
                });

                const functions = getFunctions(undefined, "asia-south1");
                const sendApplicationWhatsAppDocuments = httpsCallable(
                    functions,
                    "sendApplicationWhatsAppDocuments"
                );

                const whatsappResult = await sendApplicationWhatsAppDocuments({
                    userId,
                    applicationName: newApp.name,
                    subtotal: Number(newApp.subtotal || 0),
                    discountAmount: Number(newApp.discountAmount || 0),
                    total: Number(newApp.total || 0),
                    invoiceStoragePath,
                    documentStoragePaths
                });

                console.log("WhatsApp document delivery response:", whatsappResult.data);
            } catch (whatsappError) {
                console.error("WhatsApp invoice/documents sending failed:", whatsappError);
                // The application and ticket are already saved. WhatsApp failure won't roll them back.
            }

            // Reset fields
            setForm({ name: "", govtFee: "", serviceCharge: "", paid: true, note: "", discountType: "amount", discountValue: "" });
            setExtraServices([]);
            setFormFile(null);
            setDocFile(null);
            setSelectedCategoryId("");
            setSelectedLibraryDocumentIds([]);
            setIndividualPdfFiles([]);
            
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

    // Download invoice using the exact OnlineWalaa invoice design from AdminInvoiceDashboard.
    const handleDownloadInvoice = async (app, returnBlob = false) => {
        setInvoiceData(app);

        await new Promise((resolve) =>
            requestAnimationFrame(() =>
                requestAnimationFrame(resolve)
            )
        );

        let exportWrapper = null;
        let exportStyle = null;

        try {
            const originalInvoice = document.querySelector(
                ".exact-invoice-container"
            );

            if (!originalInvoice) {
                throw new Error("Invoice template not found.");
            }

            exportWrapper = document.createElement("div");
            exportWrapper.setAttribute("data-invoice-export", "true");
            Object.assign(exportWrapper.style, {
                position: "fixed",
                left: "0",
                top: "0",
                width: "794px",
                height: "1123px",
                background: "#ffffff",
                zIndex: "-1",
                overflow: "hidden",
                opacity: "1",
                pointerEvents: "none",
                "--primary-blue": "#1a73e8",
                "--accent-orange": "#f59e0b"
            });

            const invoiceClone = originalInvoice.cloneNode(true);
            Object.assign(invoiceClone.style, {
                display: "block",
                visibility: "visible",
                position: "relative",
                left: "0",
                top: "0",
                margin: "0",
                marginTop: "0",
                width: "794px",
                height: "1123px",
                minHeight: "1123px",
                background: "#ffffff",
                overflow: "hidden",
                boxSizing: "border-box"
            });

            exportWrapper.appendChild(invoiceClone);
            document.body.appendChild(exportWrapper);

            exportStyle = document.createElement("style");
            exportStyle.setAttribute("data-invoice-export-style", "true");
            exportStyle.textContent = `
                * {
                    box-sizing: border-box;
                }

                [data-invoice-export="true"] {
                    width: 794px !important;
                    height: 1123px !important;
                    min-width: 794px !important;
                    min-height: 1123px !important;
                    background: #ffffff !important;
                    overflow: hidden !important;
                    font-family: "Segoe UI", Arial, sans-serif !important;
                }

                [data-invoice-export="true"]
                .exact-invoice-container {
                    display: block !important;
                    visibility: visible !important;
                    position: relative !important;
                    width: 794px !important;
                    height: 1123px !important;
                    min-height: 1123px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    overflow: hidden !important;
                    position: relative !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                [data-invoice-export="true"]
                .top-wave-container {
                    position: absolute !important;
                    top: 0 !important;
                    right: 0 !important;
                    width: 450px !important;
                    height: 200px !important;
                    z-index: 10 !important;
                }

                [data-invoice-export="true"]
                .top-svg {
                    width: 100% !important;
                    height: 100% !important;
                }

                [data-invoice-export="true"]
                .title-inside-wave {
                    position: absolute !important;
                    top: 40px !important;
                    right: 50px !important;
                    text-align: right !important;
                    color: white !important;
                }

                [data-invoice-export="true"]
                .title-inside-wave h1 {
                    margin: 0 !important;
                    font-size: 32px !important;
                    font-weight: 800 !important;
                    letter-spacing: 2px !important;
                }

                [data-invoice-export="true"]
                .invoice-header-exact {
                    display: flex !important;
                    justify-content: space-between !important;
                    padding: 40px 50px 30px !important;
                    position: relative !important;
                    z-index: 5 !important;
                }

                [data-invoice-export="true"]
                .exact-logo-design {
                    display: inline-block !important;
                    text-align: center !important;
                    margin-bottom: 40px !important;
                }

                [data-invoice-export="true"]
                .exact-logo-design h2 {
                    font-size: 38px !important;
                    color: #1a73e8 !important;
                    margin: 0 !important;
                    font-weight: 800 !important;
                    line-height: 1.1 !important;
                }

                [data-invoice-export="true"]
                .exact-logo-design h2 span {
                    color: #f59e0b !important;
                }

                [data-invoice-export="true"]
                .tag-gray {
                    color: #64748b !important;
                    font-size: 14px !important;
                    font-weight: 700 !important;
                    margin: 4px 0 0 !important;
                }

                [data-invoice-export="true"]
                .tag-orange {
                    color: #f59e0b !important;
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    margin: 2px 0 0 !important;
                }

                [data-invoice-export="true"]
                .site-url {
                    color: #64748b !important;
                    font-size: 12px !important;
                    font-weight: 700 !important;
                    margin: 4px 0 0 !important;
                }

                [data-invoice-export="true"]
                .site-url span {
                    color: #f59e0b !important;
                }

                [data-invoice-export="true"]
                .bill-to-box {
                    margin-top: 10px !important;
                }

                [data-invoice-export="true"]
                .sub-label {
                    font-size: 12px !important;
                    color: #666 !important;
                    margin: 0 0 5px !important;
                    font-weight: 600 !important;
                }

                [data-invoice-export="true"]
                .client-name {
                    margin: 0 0 5px !important;
                    font-size: 18px !important;
                    color: #1a73e8 !important;
                    font-weight: 800 !important;
                }

                [data-invoice-export="true"]
                .right-head {
                    padding-top: 120px !important;
                }

                [data-invoice-export="true"]
                .meta-table {
                    border-collapse: collapse !important;
                    font-size: 12px !important;
                    margin-top: 9px !important;
                }

                [data-invoice-export="true"]
                .meta-table td {
                    padding: 4px 10px !important;
                }

                [data-invoice-export="true"]
                .meta-label {
                    font-weight: 700 !important;
                    color: #1a73e8 !important;
                    text-align: right !important;
                }

                [data-invoice-export="true"]
                .meta-value {
                    color: #555 !important;
                    text-align: left !important;
                    font-weight: 600 !important;
                }

                [data-invoice-export="true"]
                .exact-table-wrapper {
                    padding: 0 50px !important;
                    margin-bottom: 30px !important;
                }

                [data-invoice-export="true"]
                .exact-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    font-size: 13px !important;
                }

                [data-invoice-export="true"]
                .exact-table thead tr {
                    background: #1a73e8 !important;
                    color: #ffffff !important;
                }

                [data-invoice-export="true"]
                .exact-table th {
                    padding: 12px !important;
                    font-weight: 600 !important;
                }

                [data-invoice-export="true"]
                .th-left {
                    border-top-left-radius: 20px !important;
                    border-bottom-left-radius: 20px !important;
                }

                [data-invoice-export="true"]
                .th-right {
                    border-top-right-radius: 20px !important;
                    border-bottom-right-radius: 20px !important;
                }

                [data-invoice-export="true"]
                .exact-table td {
                    padding: 15px 10px !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    color: #1e293b !important;
                }

                [data-invoice-export="true"]
                .text-center {
                    text-align: center !important;
                }

                [data-invoice-export="true"]
                .text-left {
                    text-align: left !important;
                }

                [data-invoice-export="true"]
                .exact-bottom-grid {
                    display: flex !important;
                    justify-content: space-between !important;
                    padding: 10px 50px !important;
                }

                [data-invoice-export="true"]
                .notes-col {
                    width: 45% !important;
                }

                [data-invoice-export="true"]
                .col-title {
                    font-size: 12px !important;
                    color: #1a73e8 !important;
                    font-weight: 700 !important;
                    margin: 0 0 5px !important;
                }

                [data-invoice-export="true"]
                .col-desc {
                    font-size: 12px !important;
                    color: #64748b !important;
                    margin: 0 !important;
                    line-height: 1.5 !important;
                    font-weight: 500 !important;
                }

                [data-invoice-export="true"]
                .status-indicator {
                    margin-top: 15px !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                    color: #1a73e8 !important;
                }

                [data-invoice-export="true"]
                .totals-col {
                    width: 38% !important;
                    padding-right: 10px !important;
                }

                [data-invoice-export="true"]
                .tot-row {
                    display: flex !important;
                    justify-content: space-between !important;
                    font-size: 13px !important;
                    color: #1a73e8 !important;
                    font-weight: 600 !important;
                    padding: 6px 10px !important;
                }

                [data-invoice-export="true"]
                .grand-tot-pill {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    background: #1a73e8 !important;
                    border-radius: 20px !important;
                    padding: 6px 15px 6px 6px !important;
                    margin-top: 10px !important;
                    color: #ffffff !important;
                }

                [data-invoice-export="true"]
                .pill-badge {
                    background: #f59e0b !important;
                    color: #ffffff !important;
                    padding: 4px 15px !important;
                    border-radius: 15px !important;
                    font-size: 12px !important;
                    font-weight: 700 !important;
                }

                [data-invoice-export="true"]
                .pill-amount {
                    font-size: 16px !important;
                    font-weight: 700 !important;
                }

                [data-invoice-export="true"]
                .thank-you-section {
                    text-align: center !important;
                    margin-top: 20px !important;
                    padding: 15px 0 !important;
                }

                [data-invoice-export="true"]
                .thank-you-title {
                    color: #1a73e8 !important;
                    font-size: 20px !important;
                    font-weight: 800 !important;
                    margin: 0 0 5px !important;
                    letter-spacing: 1px !important;
                }

                [data-invoice-export="true"]
                .visit-again-text {
                    color: #64748b !important;
                    font-size: 13px !important;
                    margin: 0 !important;
                    font-weight: 600 !important;
                    line-height: 1.4 !important;
                }

                [data-invoice-export="true"]
                .exact-footer-sig {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 40px 50px !important;
                    position: absolute !important;
                    bottom: 140px !important;
                    left: 0 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                [data-invoice-export="true"]
                .query-box {
                    width: 45% !important;
                }

                [data-invoice-export="true"]
                .no-sig-text {
                    font-size: 10px !important;
                    color: #94a3b8 !important;
                    margin-top: 10px !important;
                    font-style: italic !important;
                }

                [data-invoice-export="true"]
                .spin-win-banner-horizontal {
                    width: 48% !important;
                    background: linear-gradient(
                        90deg,
                        #ea580c 0%,
                        #f97316 100%
                    ) !important;
                    padding: 10px 15px !important;
                    border-radius: 12px !important;
                    color: #ffffff !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    box-shadow:
                        0 4px 10px
                        rgba(234, 88, 12, 0.2) !important;
                }

                [data-invoice-export="true"]
                .banner-text-content {
                    flex: 1 !important;
                    text-align: left !important;
                }

                [data-invoice-export="true"]
                .banner-title {
                    display: block !important;
                    font-size: 15px !important;
                    font-weight: 800 !important;
                    margin-bottom: 4px !important;
                }

                [data-invoice-export="true"]
                .banner-desc {
                    font-size: 11px !important;
                    margin: 0 0 8px !important;
                    line-height: 1.3 !important;
                    color: #fff7ed !important;
                }

                [data-invoice-export="true"]
                .banner-link {
                    display: inline-block !important;
                    background: #ffffff !important;
                    color: #ea580c !important;
                    padding: 4px 10px !important;
                    border-radius: 15px !important;
                    font-size: 11px !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.5px !important;
                }

                [data-invoice-export="true"]
                .banner-illustration-wheel {
                    width: 75px !important;
                    height: 80px !important;
                    flex-shrink: 0 !important;
                    margin-left: 15px !important;
                }

                [data-invoice-export="true"]
                .bottom-wave-container {
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 120px !important;
                    z-index: 10 !important;
                }

                [data-invoice-export="true"]
                .bottom-svg {
                    width: 100% !important;
                    height: 100% !important;
                }
            `;
            document.head.appendChild(exportStyle);

            if (document.fonts?.ready) await document.fonts.ready;

            await new Promise((resolve) =>
                requestAnimationFrame(() =>
                    requestAnimationFrame(resolve)
                )
            );

            const canvas = await html2canvas(invoiceClone, {
                scale: 2,
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123,
                backgroundColor: "#ffffff",
                useCORS: true,
                allowTaint: false,
                logging: false,
                imageTimeout: 15000,
                scrollX: 0,
                scrollY: 0
            });

            if (!canvas || !canvas.width || !canvas.height) {
                throw new Error("Invoice PDF canvas is empty.");
            }

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const scale = Math.min(
                pageWidth / canvas.width,
                pageHeight / canvas.height
            );
            const imageWidth = canvas.width * scale;
            const imageHeight = canvas.height * scale;
            const x = (pageWidth - imageWidth) / 2;
            const y = (pageHeight - imageHeight) / 2;

            pdf.addImage(
                canvas.toDataURL("image/jpeg", 0.98),
                "JPEG",
                x,
                y,
                imageWidth,
                imageHeight
            );

            const invoiceDate = app?.date?.seconds
                ? new Date(app.date.seconds * 1000)
                : app?.date
                    ? new Date(app.date)
                    : new Date();
            const validDate = Number.isNaN(invoiceDate.getTime())
                ? new Date()
                : invoiceDate;
            const datePart = validDate
                .toLocaleDateString("en-IN")
                .replace(/\//g, "-");
            const safeName = String(user?.name || "Customer")
                .trim()
                .replace(/[^a-zA-Z0-9_-]/g, "_")
                .slice(0, 60) || "Customer";
            const invoiceNumber = app?.invoiceNumber ||
                `INV-${String(validDate.getTime()).slice(-6)}`;

            const fileName = `Invoice-${safeName}-${datePart}-${invoiceNumber}.pdf`;
            if (returnBlob) {
                return { blob: pdf.output("blob"), fileName };
            }
            pdf.save(fileName);
        } catch (error) {
            console.error("Invoice PDF generation failed:", error);
            if (returnBlob) throw error;
            alert("Invoice PDF डाउनलोड नहीं हो पाया। कृपया दोबारा कोशिश करें।");
        } finally {
            if (exportWrapper) exportWrapper.remove();
            if (exportStyle) exportStyle.remove();
            setInvoiceData(null);
        }
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
            <div className="aa-tabs-header">
                <div className="aa-tabs-title-wrap">
                    <span className="aa-tabs-eyebrow">SERVICE MANAGEMENT</span>
                    <h1 className="aa-tabs-title">Manage User Services</h1>
                    <p className="aa-tabs-subtitle">Create applications, upload documents and manage saved files.</p>
                </div>
                <div className="aa-tabs-count">
                    <strong>{user?.applications?.length || 0}</strong>
                    <span>Applications</span>
                </div>
            </div>

            <div
                className="aa-tabs-nav"
                role="tablist"
                aria-label="Service management tabs"
                style={{
                    display: "flex",
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    overflowY: "hidden",
                    width: "100%",
                    maxWidth: "100%",
                    gap: "10px",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "thin",
                    paddingBottom: "8px",
                    boxSizing: "border-box"
                }}
            >
                <button type="button" className={`aa-tab ${activeTab === "create" ? "active" : ""}`} style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} onClick={() => setActiveTab("create")} role="tab" aria-selected={activeTab === "create"}>
                    <span className="aa-tab-icon">✦</span>
                    <span className="aa-tab-copy"><strong>Create Application</strong><small>New service entry</small></span>
                </button>
                <button type="button" className={`aa-tab ${activeTab === "upload" ? "active" : ""}`} style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} onClick={() => setActiveTab("upload")} role="tab" aria-selected={activeTab === "upload"}>
                    <span className="aa-tab-icon">↑</span>
                    <span className="aa-tab-copy"><strong>Upload Documents</strong><small>Add files</small></span>
                </button>
                <button type="button" className={`aa-tab ${activeTab === "saved" ? "active" : ""}`} style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} onClick={() => setActiveTab("saved")} role="tab" aria-selected={activeTab === "saved"}>
                    <span className="aa-tab-icon">▣</span>
                    <span className="aa-tab-copy"><strong>Saved Documents</strong><small>{user?.documents?.length || 0} saved</small></span>
                </button>
                <button type="button" className={`aa-tab ${activeTab === "library" ? "active" : ""}`} style={{ flex: "0 0 auto", whiteSpace: "nowrap" }} onClick={() => setActiveTab("library")} role="tab" aria-selected={activeTab === "library"}>
                    <span className="aa-tab-icon">PDF</span>
                    <span className="aa-tab-copy"><strong>PDF Library</strong><small>Manage category PDFs</small></span>
                </button>
            </div>

            {activeTab === "create" && (
                <div className="aa-tab-panel">
                    <div className="aa-layout">
                <div className="aa-col-left">
                    {/* Add App Card */}
                    <div className="aa-card">
                        <h2 className="aa-heading">Create Application</h2>

                        <div className="aa-form-group">
                            <label className="aa-label">Service Name</label>
                            <input
                                className="aa-input"
                                list="onlinewalaa-service-name-options"
                                placeholder="Select a service or type a custom service name"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                            <datalist id="onlinewalaa-service-name-options">
                                <option value="PAN Card Apply / Correction" />
                                <option value="Aadhaar Card Update" />
                                <option value="Passport Apply / Renewal" />
                                <option value="Voter ID Apply / Correction" />
                                <option value="Ration Card Apply / Update" />
                                <option value="Income Certificate" />
                                <option value="Caste Certificate" />
                                <option value="Domicile Certificate" />
                                <option value="Non-Creamy Layer Certificate" />
                                <option value="Birth Certificate" />
                                <option value="Police Bharti Form" />
                                <option value="Government Job Application Form" />
                                <option value="Railway Recruitment Form" />
                                <option value="Scholarship Form" />
                                <option value="College / Admission Form" />
                                <option value="Exam Application Form" />
                                <option value="Driving Licence Apply / Renewal" />
                                <option value="Learning Licence" />
                                <option value="e-Shram Card" />
                                <option value="Ayushman Bharat Card" />
                            </datalist>
                            <small style={{ display: "block", marginTop: 5, color: "#64748b" }}>
                                Dropdown se service select karein ya apna custom service name type karein.
                            </small>
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

                        {/* Discount Settings */}
                        <div className="aa-extras-box">
                            <div className="aa-extras-header">
                                <span className="aa-subheading">Discount</span>
                            </div>
                            <div className="aa-row-split">
                                <div className="aa-form-group">
                                    <label className="aa-label">Discount Type</label>
                                    <select
                                        className="aa-select"
                                        value={form.discountType}
                                        onChange={e => setForm({ ...form, discountType: e.target.value, discountValue: "" })}
                                    >
                                        <option value="amount">Fixed Amount (₹)</option>
                                        <option value="percentage">Percentage (%)</option>
                                    </select>
                                </div>
                                <div className="aa-form-group">
                                    <label className="aa-label">
                                        Discount {form.discountType === "percentage" ? "(%)" : "(₹)"}
                                    </label>
                                    <input
                                        className="aa-input"
                                        type="number"
                                        min="0"
                                        max={form.discountType === "percentage" ? "100" : subtotal}
                                        step="0.01"
                                        placeholder={form.discountType === "percentage" ? "e.g. 10" : "e.g. 100"}
                                        value={form.discountValue}
                                        onChange={e => setForm({ ...form, discountValue: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p style={{ margin: "4px 0 0", color: "#16803c", fontSize: "0.9rem" }}>
                                Discount: ₹{discountAmount.toFixed(2)}
                            </p>
                        </div>

                        {/* Category PDF selection and individual application PDFs */}
                        <div className="aa-extras-box">
                            <div className="aa-extras-header"><span className="aa-subheading">WhatsApp PDF Documents</span></div>
                            <div className="aa-form-group">
                                <label className="aa-label">Select Document Category</label>
                                <select className="aa-select" value={selectedCategoryId} onChange={e => { setSelectedCategoryId(e.target.value); setSelectedLibraryDocumentIds([]); }}>
                                    <option value="">No category documents</option>
                                    {pdfCategories.filter(item => item.active !== false).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                                {availableCategoryDocuments.length > 0 && (
                                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                            <strong style={{ fontSize: 13 }}>Choose PDFs to attach</strong>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button type="button" className="aa-btn-text" onClick={() => setSelectedLibraryDocumentIds(availableCategoryDocuments.map(item => item.id))}>Select all</button>
                                                <button type="button" className="aa-btn-text" onClick={() => setSelectedLibraryDocumentIds([])}>Clear</button>
                                            </div>
                                        </div>
                                        {availableCategoryDocuments.map(item => (
                                            <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>
                                                <input type="checkbox" checked={selectedLibraryDocumentIds.includes(item.id)} onChange={() => toggleLibraryDocumentSelection(item.id)} style={{ marginTop: 3 }} />
                                                <span style={{ minWidth: 0 }}>
                                                    <span style={{ display: "block", fontWeight: 600 }}>{item.title || "Untitled PDF"}</span>
                                                    <small style={{ color: "#64748b" }}>{String(item.type || "other").replace(/-/g, " ")}</small>
                                                </span>
                                            </label>
                                        ))}
                                        <small style={{ color: "#16803c" }}>{selectedCategoryDocuments.length} PDF(s) selected for this application.</small>
                                    </div>
                                )}
                                {selectedCategoryId && availableCategoryDocuments.length === 0 && <small>No active PDFs available in this category.</small>}
                            </div>
                            <div className="aa-form-group">
                                <label className="aa-label">Extra PDFs for this application (Optional)</label>
                                <input className="aa-file-input" type="file" accept="application/pdf,.pdf" multiple onChange={e => setIndividualPdfFiles(Array.from(e.target.files || []))} />
                                {individualPdfFiles.length > 0 && <small>{individualPdfFiles.map(file => file.name).join(", ")}</small>}
                            </div>
                            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "12px" }}>Files are saved with the application. WhatsApp PDF sending will be enabled after the Meta document template is approved.</p>
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
                            <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
                            <p style={{ margin: "6px 0", color: "#16803c" }}>
                                Discount: -₹{discountAmount.toFixed(2)}
                            </p>
                            <span>Final Amount</span>
                            <h3>₹{total.toFixed(2)}</h3>
                        </div>

                        <button className="aa-btn-primary" onClick={handleAdd} disabled={isSubmittingApp}>
                            {isSubmittingApp ? "Saving..." : "Submit Application"}
                        </button>
                    </div>
                </div>
                        <div className="aa-col-right">
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
                                            <button className="aa-btn-icon-blue" onClick={() => handleDownloadInvoice(app)} title="Download Invoice PDF">⬇️</button>
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


                        </div>
                    </div>
                </div>
            )}

            {activeTab === "upload" && (
                <div className="aa-tab-panel aa-single-panel">
                    <div className="aa-card aa-single-card">
                        <div className="aa-panel-heading">
                            <div>
                                <span className="aa-tabs-eyebrow">DOCUMENT CENTER</span>
                                <h2>Upload Documents</h2>
                                <p>Select files, add details and upload them securely.</p>
                            </div>
                            <span className="aa-panel-icon">↑</span>
                        </div>
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


                    </div>
                </div>
            )}

            {activeTab === "library" && (
                <div className="aa-tab-panel">
                    <div className="aa-card">
                        <h2 className="aa-heading">Category-wise PDF Library</h2>
                        <p style={{ color: "#64748b", fontSize: "13px" }}>Ek baar category PDFs upload karein. Application banate waqt category select karne par ye documents automatically application ke saath link ho jayenge.</p>
                        <div className="aa-form-group">
                            <label className="aa-label">Create New Category</label>
                            <div className="aa-row-split">
                                <input className="aa-input" placeholder="e.g. Police Bharti" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                                <button type="button" className="aa-btn-primary" onClick={createPdfCategory} disabled={isSavingLibrary}>Create Category</button>
                            </div>
                        </div>
                        <div className="aa-form-group">
                            <label className="aa-label">Select Category for PDF Upload</label>
                            <select className="aa-select" value={libraryCategoryId} onChange={e => setLibraryCategoryId(e.target.value)}>
                                <option value="">Select category</option>
                                {pdfCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </div>
                        <div className="aa-form-group">
                            <label className="aa-label">Document Type</label>
                            <select className="aa-select" value={libraryDocType} onChange={e => setLibraryDocType(e.target.value)}>
                                <option value="omr">OMR Sheet</option>
                                <option value="question-paper">Previous Year Question Paper</option>
                                <option value="answer-key">Answer Key</option>
                                <option value="study-material">Study Material</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="aa-form-group">
                            <label className="aa-label">Upload PDF Files</label>
                            <input className="aa-file-input" type="file" accept="application/pdf,.pdf" multiple onChange={e => setLibraryPdfFiles(Array.from(e.target.files || []))} />
                            {libraryPdfFiles.length > 0 && <small>{libraryPdfFiles.length} PDF(s) selected</small>}
                        </div>
                        <button type="button" className="aa-btn-primary" onClick={uploadCategoryPdfs} disabled={isSavingLibrary}>{isSavingLibrary ? "Uploading..." : "Upload PDFs to Category"}</button>
                        <div className="aa-list" style={{ marginTop: 20 }}>
                            {pdfCategories.map(category => (
                                <div className="aa-list-item" key={category.id}>
                                    <strong>{category.name}</strong>
                                    <div style={{ marginTop: 8 }}>
                                        {(category.documents || []).map((item, index) => {
                                            const isEditing = editingLibraryDoc?.categoryId === category.id && editingLibraryDoc?.documentId === item.id;
                                            return (
                                                <div key={item.id || index} style={{ padding: "10px 0", borderTop: "1px solid #e2e8f0", fontSize: 13 }}>
                                                    {isEditing ? (
                                                        <div style={{ display: "grid", gap: 8 }}>
                                                            <input className="aa-input" value={libraryDocDraft.title} onChange={e => setLibraryDocDraft(prev => ({ ...prev, title: e.target.value }))} placeholder="Document name" />
                                                            <select className="aa-select" value={libraryDocDraft.type} onChange={e => setLibraryDocDraft(prev => ({ ...prev, type: e.target.value }))}>
                                                                <option value="omr">OMR Sheet</option>
                                                                <option value="question-paper">Previous Year Question Paper</option>
                                                                <option value="answer-key">Answer Key</option>
                                                                <option value="study-material">Study Material</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                                <button type="button" className="aa-btn-primary" onClick={saveLibraryDocument} disabled={isSavingLibrary}>{isSavingLibrary ? "Saving..." : "Save Changes"}</button>
                                                                <button type="button" className="aa-btn-secondary" onClick={() => setEditingLibraryDoc(null)} disabled={isSavingLibrary}>Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600 }}>{item.title}</div>
                                                                <small style={{ color: "#64748b" }}>{String(item.type || "other").replace(/-/g, " ")}</small>
                                                                {item.url && <div><a href={item.url} target="_blank" rel="noreferrer">View / Download PDF</a></div>}
                                                            </div>
                                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                                <button type="button" className="aa-btn-secondary" onClick={() => startEditLibraryDocument(category, item)} disabled={isSavingLibrary}>Edit</button>
                                                                <button type="button" className="aa-btn-secondary" onClick={() => deleteLibraryDocument(category, item)} disabled={isSavingLibrary}>Delete</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {!(category.documents || []).length && <small style={{ color: "#64748b" }}>No PDFs in this category yet.</small>}
                                    </div>
                                </div>
                            ))}
                            {!pdfCategories.length && <div className="aa-empty">No categories created yet.</div>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "saved" && (
                <div className="aa-tab-panel aa-single-panel">
                    <div className="aa-card aa-single-card">
                        <div className="aa-panel-heading">
                            <div>
                                <span className="aa-tabs-eyebrow">DOCUMENT VAULT</span>
                                <h2>Saved Documents</h2>
                                <p>View, download or delete uploaded documents.</p>
                            </div>
                            <span className="aa-panel-icon saved">▣</span>
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
            )}

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

            {/* Exact OnlineWalaa invoice template used for both preview and PDF export */}
            <div className="aa-print-only">
                {invoiceData && (
                    <div className="exact-invoice-container" style={{ marginTop: "-90px" }}>
                        <div className="top-wave-container">
                            <svg viewBox="0 0 500 250" className="top-svg" preserveAspectRatio="none">
                                <path d="M 500 0 L 150 0 C 150 150, 300 220, 500 120 Z" fill="#f59e0b" />
                                <path d="M 500 0 L 220 0 C 220 120, 350 160, 500 80 Z" fill="#1a73e8" />
                            </svg>
                            <div className="title-inside-wave"><h1>INVOICE</h1></div>
                        </div>

                        <div className="invoice-header-exact">
                            <div className="left-head">
                                <div className="exact-logo-design">
                                    <h2>ऑनलाइन<span>वाला</span></h2>
                                    <p className="tag-gray">सर्व ऑनलाइन कामे, एकाच ठिकाणी</p>
                                    <p className="tag-orange">फास्ट, अचूक, विश्वासार्ह</p>
                                    <p className="site-url">onlinewalaa.<span>com</span></p>
                                </div>
                                <div className="bill-to-box">
                                    <p className="sub-label">ग्राहकाचे नाव:</p>
                                    <h3 className="client-name">{user?.name || "Customer"}</h3>
                                </div>
                            </div>
                            <div className="right-head">
                                <table className="meta-table" style={{ marginTop: "9px" }}>
                                    <tbody>
                                        <tr>
                                            <td className="meta-label">INVOICE क्र. :</td>
                                            <td className="meta-value">#{invoiceData.invoiceNumber || `INV-${String(new Date(invoiceData.date || Date.now()).getTime()).slice(-6)}`}</td>
                                        </tr>
                                        <tr>
                                            <td className="meta-label">दिनांक :</td>
                                            <td className="meta-value">{formatInvoiceDate(invoiceData.date).split(",")[0]}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="exact-table-wrapper">
                            <table className="exact-table">
                                <thead>
                                    <tr>
                                        <th className="th-left">क्र.</th>
                                        <th className="text-left">तपशील</th>
                                        <th className="text-center">सरकारी फी</th>
                                        <th className="text-center">सेवा शुल्क</th>
                                        <th className="th-right text-center">एकूण</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="text-center">१</td>
                                        <td className="text-left"><strong>{invoiceData.name}</strong></td>
                                        <td className="text-center">₹{invoiceData.govtFee || 0}</td>
                                        <td className="text-center">₹{invoiceData.serviceCharge || 0}</td>
                                        <td className="text-center">₹{Number(invoiceData.govtFee || 0) + Number(invoiceData.serviceCharge || 0)}</td>
                                    </tr>
                                    {invoiceData.extraServices?.map((service, index) => (
                                        <tr key={index}>
                                            <td className="text-center">{index + 2}</td>
                                            <td className="text-left">{service.name}</td>
                                            <td className="text-center">₹{service.govtFee || 0}</td>
                                            <td className="text-center">₹{service.serviceCharge || 0}</td>
                                            <td className="text-center">₹{Number(service.govtFee || 0) + Number(service.serviceCharge || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="exact-bottom-grid">
                            <div className="notes-col">
                                <p className="col-title">विशेष नोंद :</p>
                                <p className="col-desc">{invoiceData.note || "कोणतीही विशेष नोंद नाही."}</p>
                                <div className="status-indicator">
                                    स्थिती: <strong style={{ color: invoiceData.paid ? "#15803d" : "#f59e0b" }}>
                                        {invoiceData.paid ? "जमा" : "प्रलंबित"}
                                    </strong>
                                </div>
                            </div>
                            <div className="totals-col">
                                <div className="tot-row">
                                    <span>एकूण</span>
                                    <span>₹{Number(invoiceData.subtotal ?? invoiceData.total ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="tot-row">
                                    <span>सूट</span>
                                    <span>{Number(invoiceData.discountAmount || 0) > 0 ? `- ₹${Number(invoiceData.discountAmount).toFixed(2)}` : "₹0"}</span>
                                </div>
                                <div className="grand-tot-pill">
                                    <span className="pill-badge">एकूण रक्कम</span>
                                    <span className="pill-amount">₹{Number(invoiceData.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="thank-you-section">
                            <h3 className="thank-you-title">धन्यवाद! (Thank You)</h3>
                            <p className="visit-again-text">
                                आमच्या सेवांचा लाभ घेतल्याबद्दल आभारी आहोत.<br />
                                कृपया पुन्हा भेट द्या!
                            </p>
                        </div>

                        <div className="exact-footer-sig">
                            <div className="query-box">
                                <p className="col-title">कोणत्याही प्रश्नासाठी :</p>
                                <p className="col-desc">वेबसाइट: www.onlinewalaa.com<br /></p>
                                <p className="col-desc">ई-मेल: support@onlinewalaa.com<br />मोबाईल: +91 9185 262428</p>
                                <p className="no-sig-text">हे संगणकीकृत INVOICE आहे, यावर स्वाक्षरीची गरज नाही.</p>
                            </div>
                            <div className="spin-win-banner-horizontal">
                                <div className="banner-text-content">
                                    <span className="banner-title">🎉 स्पिन करा आणि जिंका!</span>
                                    <p className="banner-desc">कोणत्याही फॉर्मवर <strong>10% सूट</strong> किंवा इतर आकर्षक बक्षिसे जिंका.</p>
                                    <span className="banner-link">onlinewalaa.com/spin</span>
                                </div>
                                <svg viewBox="0 0 100 110" className="banner-illustration-wheel" preserveAspectRatio="xMidYMid meet">
                                    <path d="M 30 95 L 70 95 L 80 110 L 20 110 Z" fill="#0f172a" />
                                    <path d="M 45 70 L 55 70 L 60 95 L 40 95 Z" fill="#1e293b" />
                                    <circle cx="50" cy="45" r="42" fill="#0f172a" />
                                    <g transform="translate(50, 45)">
                                        <path d="M 0 0 L 0 -38 A 38 38 0 0 1 32.9 -19 Z" fill="#ef4444" />
                                        <path d="M 0 0 L 32.9 -19 A 38 38 0 0 1 32.9 19 Z" fill="#f59e0b" />
                                        <path d="M 0 0 L 32.9 19 A 38 38 0 0 1 0 38 Z" fill="#10b981" />
                                        <path d="M 0 0 L 0 38 A 38 38 0 0 1 -32.9 19 Z" fill="#3b82f6" />
                                        <path d="M 0 0 L -32.9 19 A 38 38 0 0 1 -32.9 -19 Z" fill="#8b5cf6" />
                                        <path d="M 0 0 L -32.9 -19 A 38 38 0 0 1 0 -38 Z" fill="#eab308" />
                                    </g>
                                    <circle cx="50" cy="45" r="10" fill="#ffffff" />
                                    <circle cx="50" cy="45" r="4" fill="#0f172a" />
                                    <path d="M 43 5 L 57 5 L 50 16 Z" fill="#fcd34d" stroke="#b45309" strokeWidth="1" />
                                    <circle cx="50" cy="4" r="3" fill="#fcd34d" />
                                    <circle cx="50" cy="6" r="1.5" fill="#fde047" />
                                    <circle cx="89" cy="45" r="1.5" fill="#fde047" />
                                    <circle cx="50" cy="84" r="1.5" fill="#fde047" />
                                    <circle cx="11" cy="45" r="1.5" fill="#fde047" />
                                    <circle cx="77" cy="18" r="1.5" fill="#fde047" />
                                    <circle cx="77" cy="72" r="1.5" fill="#fde047" />
                                    <circle cx="23" cy="18" r="1.5" fill="#fde047" />
                                    <circle cx="23" cy="72" r="1.5" fill="#fde047" />
                                </svg>
                            </div>
                        </div>

                        <div className="bottom-wave-container">
                            <svg viewBox="0 0 800 150" className="bottom-svg" preserveAspectRatio="none">
                                <path d="M 0 100 C 150 150, 350 20, 550 120 C 650 150, 800 80, 800 80 L 800 150 L 0 150 Z" fill="#f59e0b" />
                                <path d="M 0 130 C 250 180, 450 60, 800 140 L 800 150 L 0 150 Z" fill="#1a73e8" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}