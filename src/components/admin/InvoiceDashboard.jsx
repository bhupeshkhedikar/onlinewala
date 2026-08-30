import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./InvoiceDashboard.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function AdminInvoiceDashboard() {
    const [allApplications, setAllApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        const fetchAllApps = async () => {
            try {
                const usersSnapshot = await getDocs(
                    collection(db, "users")
                );

                let appsMasterList = [];

                usersSnapshot.forEach((doc) => {
                    const userData = doc.data();

                    if (userData.applications) {
                        userData.applications.forEach((app) => {
                            appsMasterList.push({
                                ...app,
                                userName:
                                    userData.name || "ग्राहक",
                            });
                        });
                    }
                });

                appsMasterList.sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                );

                setAllApplications(appsMasterList);
            } catch (error) {
                console.error(
                    "Applications fetch error:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        fetchAllApps();
    }, []);

    /* =========================================================
       CREATE INVOICE NUMBER
       ========================================================= */

    const createInvoiceNumber = (app) => {
        if (app?.invoiceNumber) {
            return String(app.invoiceNumber);
        }

        const timestamp =
            app?.date
                ? new Date(app.date).getTime()
                : Date.now();

        return `INV-${String(timestamp)
            .slice(-6)}`;
    };

    /* =========================================================
       SAFE CUSTOMER NAME
       ========================================================= */

    const getSafeCustomerName = (app) => {
        return String(
            app?.userName || "Customer"
        )
            .trim()
            .replace(
                /[^a-zA-Z0-9\u0900-\u097F_-]/g,
                "_"
            )
            .replace(/_+/g, "_")
            .slice(0, 80) || "Customer";
    };

    /* =========================================================
       OPEN INVOICE
       ========================================================= */

    const openInvoice = (app) => {
        setSelectedApp(app);
    };

    /* =========================================================
       PRINT INVOICE
       ========================================================= */

    const printInvoice = async (app) => {
        setActionLoading(
            `print-${app?.date}-${app?.name}`
        );

        setSelectedApp(app);

        // Give React enough time to render invoice
        await new Promise((resolve) =>
            setTimeout(resolve, 500)
        );

        try {
            window.print();
        } catch (error) {
            console.error(
                "Invoice print failed:",
                error
            );
        } finally {
            setTimeout(() => {
                setSelectedApp(null);
                setActionLoading(null);
            }, 500);
        }
    };

    /* =========================================================
       DOWNLOAD INVOICE
       ========================================================= */

    const downloadInvoice = async (app) => {
        const actionId =
            `download-${app?.date}-${app?.name}`;

        setActionLoading(actionId);
        setSelectedApp(app);

        /*
         * IMPORTANT:
         * Existing invoice is inside .print-view which is hidden
         * on screen. Therefore we temporarily create a visible
         * export layer and copy the invoice HTML into it.
         */

        await new Promise((resolve) =>
            setTimeout(resolve, 500)
        );

        let exportWrapper = null;

        try {
            const originalInvoice =
                document.querySelector(
                    ".exact-invoice-container"
                );

            if (!originalInvoice) {
                throw new Error(
                    "Invoice element not found."
                );
            }

            /* =================================================
               CREATE TEMPORARY EXPORT WRAPPER
               ================================================= */

            exportWrapper =
                document.createElement("div");

            exportWrapper.setAttribute(
                "data-invoice-export",
                "true"
            );

            exportWrapper.style.position =
                "fixed";

            exportWrapper.style.left =
                "-10000px";

            exportWrapper.style.top = "0";

            exportWrapper.style.width =
                "794px";

            exportWrapper.style.height =
                "1123px";

            exportWrapper.style.minWidth =
                "794px";

            exportWrapper.style.minHeight =
                "1123px";

            exportWrapper.style.background =
                "#ffffff";

            exportWrapper.style.zIndex =
                "-9999";

            exportWrapper.style.overflow =
                "hidden";

            document.body.appendChild(
                exportWrapper
            );

            /* =================================================
               CLONE INVOICE
               ================================================= */

            const invoiceClone =
                originalInvoice.cloneNode(true);

            invoiceClone.style.display =
                "block";

            invoiceClone.style.visibility =
                "visible";

            invoiceClone.style.position =
                "relative";

            invoiceClone.style.left = "0";

            invoiceClone.style.top = "0";

            invoiceClone.style.margin = "0";

            invoiceClone.style.width =
                "794px";

            invoiceClone.style.height =
                "1123px";

            invoiceClone.style.minHeight =
                "1123px";

            invoiceClone.style.background =
                "#ffffff";

            invoiceClone.style.overflow =
                "hidden";

            invoiceClone.style.boxSizing =
                "border-box";

            exportWrapper.appendChild(
                invoiceClone
            );

            /* =================================================
               APPLY EXPORT STYLES
               ================================================= */

            const exportStyle =
                document.createElement("style");

            exportStyle.setAttribute(
                "data-invoice-export-style",
                "true"
            );

            exportStyle.innerHTML = `
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

            document.head.appendChild(
                exportStyle
            );

            /* =================================================
               WAIT FOR BROWSER LAYOUT
               ================================================= */

            await new Promise((resolve) =>
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                })
            );

            /* =================================================
               CHECK DIMENSIONS
               ================================================= */

            const rect =
                invoiceClone.getBoundingClientRect();

            const width =
                Math.round(
                    rect.width
                );

            const height =
                Math.round(
                    rect.height
                );

            console.log(
                "Invoice export dimensions:",
                width,
                height
            );

            if (
                width <= 0 ||
                height <= 0
            ) {
                throw new Error(
                    "Unable to generate invoice image."
                );
            }

            /* =================================================
               CREATE CANVAS
               ================================================= */

            const canvas =
                await html2canvas(
                    invoiceClone,
                    {
                        scale: 2,

                        width: 794,
                        height: 1123,

                        windowWidth: 794,
                        windowHeight: 1123,

                        backgroundColor:
                            "#ffffff",

                        useCORS: true,

                        allowTaint: true,

                        logging: false,

                        imageTimeout: 15000,

                        scrollX: 0,

                        scrollY: 0,
                    }
                );

            /* =================================================
               VALIDATE CANVAS
               ================================================= */

            if (
                !canvas ||
                canvas.width <= 0 ||
                canvas.height <= 0
            ) {
                throw new Error(
                    "Unable to generate invoice image."
                );
            }

            console.log(
                "Invoice canvas:",
                canvas.width,
                canvas.height
            );

            /* =================================================
               IMAGE
               ================================================= */

            const imgData =
                canvas.toDataURL(
                    "image/jpeg",
                    0.96
                );

            if (
                !imgData ||
                imgData === "data:,"
            ) {
                throw new Error(
                    "Unable to generate invoice image."
                );
            }

            /* =================================================
               CREATE PDF
               ================================================= */

            const pdf =
                new jsPDF({
                    orientation:
                        "portrait",

                    unit: "mm",

                    format: "a4",

                    compress: true,
                });

            const pageWidth =
                Number(
                    pdf.internal.pageSize.getWidth()
                );

            const pageHeight =
                Number(
                    pdf.internal.pageSize.getHeight()
                );

            const canvasWidth =
                Number(canvas.width);

            const canvasHeight =
                Number(canvas.height);

            if (
                !Number.isFinite(
                    canvasWidth
                ) ||
                !Number.isFinite(
                    canvasHeight
                ) ||
                canvasWidth <= 0 ||
                canvasHeight <= 0
            ) {
                throw new Error(
                    "Invalid invoice canvas dimensions."
                );
            }

            /*
             * Keep the entire invoice on exactly
             * one A4 page.
             */

            const scaleX =
                pageWidth /
                canvasWidth;

            const scaleY =
                pageHeight /
                canvasHeight;

            const pdfScale =
                Math.min(
                    scaleX,
                    scaleY
                );

            const imgWidth =
                Number(
                    canvasWidth *
                    pdfScale
                );

            const imgHeight =
                Number(
                    canvasHeight *
                    pdfScale
                );

            const x =
                Number(
                    (pageWidth -
                        imgWidth) /
                        2
                );

            const y =
                Number(
                    (pageHeight -
                        imgHeight) /
                        2
                );

            if (
                ![
                    pageWidth,
                    pageHeight,
                    imgWidth,
                    imgHeight,
                    x,
                    y,
                ].every(
                    Number.isFinite
                )
            ) {
                throw new Error(
                    "Invalid PDF dimensions."
                );
            }

            /* =================================================
               IMPORTANT:
               Do NOT pass undefined / FAST here.
               ================================================= */

            pdf.addImage(
                imgData,
                "JPEG",
                x,
                y,
                imgWidth,
                imgHeight
            );

            /* =================================================
               FILE NAME
               ================================================= */

            const invoiceNumber =
                createInvoiceNumber(app);

            const safeName =
                getSafeCustomerName(app);

            const datePart =
                app?.date
                    ? new Date(app.date)
                          .toLocaleDateString(
                              "en-IN"
                          )
                          .replace(
                              /\//g,
                              "-"
                          )
                    : new Date()
                          .toLocaleDateString(
                              "en-IN"
                          )
                          .replace(
                              /\//g,
                              "-"
                          );

            const timePart =
                new Date()
                    .toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                        }
                    )
                    .replace(
                        /:/g,
                        "-"
                    );

            pdf.save(
                `Invoice-${safeName}-${datePart}-${timePart}-${invoiceNumber}.pdf`
            );

        } catch (error) {
            console.error(
                "Invoice download failed:",
                error
            );

            alert(
                "Invoice PDF तयार करताना समस्या आली. कृपया पुन्हा प्रयत्न करा."
            );

        } finally {
            /* =============================================
               REMOVE TEMPORARY EXPORT ELEMENTS
               ============================================= */

            if (exportWrapper) {
                exportWrapper.remove();
            }

            const temporaryStyle =
                document.querySelector(
                    '[data-invoice-export-style="true"]'
                );

            if (temporaryStyle) {
                temporaryStyle.remove();
            }

            setSelectedApp(null);
            setActionLoading(null);
        }
    };

    /* =========================================================
       CLOSE
       ========================================================= */

    const closeInvoice = () => {
        setSelectedApp(null);
        setActionLoading(null);
    };

    if (loading) {
        return (
            <div className="loader-container">
                लोड होत आहे...
            </div>
        );
    }

    return (
        <div className="invoice-dashboard-wrapper">

            {/* =================================================
                SCREEN VIEW
               ================================================= */}

            <div className="screen-view no-print">

                <div className="dashboard-header">
                    <h2>
                        सर्व ग्राहकांचे अर्ज
                    </h2>
                </div>

                <table className="apps-table">

                    <thead>
                        <tr>
                            <th>क्र.</th>
                            <th>ग्राहकाचे नाव</th>
                            <th>अर्जाचे नाव</th>
                            <th>तारीख</th>
                            <th>स्थिती</th>
                            <th>एकूण</th>
                            <th>कृती</th>
                        </tr>
                    </thead>

                    <tbody>

                        {allApplications.map(
                            (app, index) => {

                                const printId =
                                    `print-${app?.date}-${app?.name}`;

                                const downloadId =
                                    `download-${app?.date}-${app?.name}`;

                                return (
                                    <tr
                                        key={
                                            `${app?.date}-${app?.name}-${index}`
                                        }
                                    >

                                        <td>
                                            {index + 1}
                                        </td>

                                        <td>
                                            {
                                                app.userName
                                            }
                                        </td>

                                        <td>
                                            {app.name}
                                        </td>

                                        <td>
                                            {new Date(
                                                app.date
                                            ).toLocaleDateString(
                                                "en-IN"
                                            )}
                                        </td>

                                        <td>

                                            <span
                                                className={`pill ${
                                                    app.paid
                                                        ? "paid"
                                                        : "pending"
                                                }`}
                                            >
                                                {
                                                    app.paid
                                                        ? "जमा"
                                                        : "प्रलंबित"
                                                }
                                            </span>

                                        </td>

                                        <td>
                                            ₹
                                            {
                                                app.total
                                            }
                                        </td>

                                        <td>

                                            <div
                                                className="invoice-action-buttons"
                                                style={{
                                                    display:
                                                        "flex",
                                                    gap:
                                                        "8px",
                                                    flexWrap:
                                                        "wrap",
                                                }}
                                            >

                                                {/* PRINT */}

                                                <button
                                                    type="button"
                                                    className="print-btn"
                                                    onClick={() =>
                                                        printInvoice(
                                                            app
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading ===
                                                        printId
                                                    }
                                                >
                                                    {actionLoading ===
                                                    printId
                                                        ? "प्रिंट होत आहे..."
                                                        : "🖨️ प्रिंट"}
                                                </button>

                                                {/* DOWNLOAD */}

                                                <button
                                                    type="button"
                                                    className="print-btn"
                                                    onClick={() =>
                                                        downloadInvoice(
                                                            app
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading ===
                                                        downloadId
                                                    }
                                                >
                                                    {actionLoading ===
                                                    downloadId
                                                        ? "डाउनलोड होत आहे..."
                                                        : "⬇️ डाउनलोड"}
                                                </button>

                                            </div>

                                        </td>

                                    </tr>
                                );
                            }
                        )}

                    </tbody>

                </table>

            </div>

            {/* =================================================
                INVOICE PRINT VIEW
               ================================================= */}

            {selectedApp && (
                <div
                    className="print-view"
                    style={{
                        margin: 0,
                    }}
                >

                    <div
                        className="exact-invoice-container"
                        style={{
                            marginTop:
                                "-90px",
                        }}
                    >

                        {/* TOP WAVES */}

                        <div className="top-wave-container">

                            <svg
                                viewBox="0 0 500 250"
                                className="top-svg"
                                preserveAspectRatio="none"
                            >

                                <path
                                    d="M 500 0 L 150 0 C 150 150, 300 220, 500 120 Z"
                                    fill="var(--accent-orange)"
                                />

                                <path
                                    d="M 500 0 L 220 0 C 220 120, 350 160, 500 80 Z"
                                    fill="var(--primary-blue)"
                                />

                            </svg>

                            <div className="title-inside-wave">

                                <h1>
                                    INVOICE
                                </h1>

                            </div>

                        </div>

                        {/* HEADER */}

                        <div className="invoice-header-exact">

                            <div className="left-head">

                                <div className="exact-logo-design">

                                    <h2>
                                        ऑनलाइन
                                        <span>
                                            वाला
                                        </span>
                                    </h2>

                                    <p className="tag-gray">
                                        सर्व ऑनलाइन कामे, एकाच ठिकाणी
                                    </p>

                                    <p className="tag-orange">
                                        फास्ट, अचूक, विश्वासार्ह
                                    </p>

                                    <p className="site-url">
                                        onlinewalaa.
                                        <span>
                                            com
                                        </span>
                                    </p>

                                </div>

                                <div className="bill-to-box">

                                    <p className="sub-label">
                                        ग्राहकाचे नाव:
                                    </p>

                                    <h3 className="client-name">
                                        {
                                            selectedApp.userName
                                        }
                                    </h3>

                                </div>

                            </div>

                            <div className="right-head">

                                <table
                                    className="meta-table"
                                    style={{
                                        marginTop:
                                            "9px",
                                    }}
                                >

                                    <tbody>

                                        <tr>

                                            <td className="meta-label">
                                                INVOICE क्र. :
                                            </td>

                                            <td className="meta-value">
                                                #
                                                {
                                                    createInvoiceNumber(
                                                        selectedApp
                                                    )
                                                }
                                            </td>

                                        </tr>

                                        <tr>

                                            <td className="meta-label">
                                                दिनांक :
                                            </td>

                                            <td className="meta-value">
                                                {new Date(
                                                    selectedApp.date
                                                ).toLocaleDateString(
                                                    "en-IN"
                                                )}
                                            </td>

                                        </tr>

                                    </tbody>

                                </table>

                            </div>

                        </div>

                        {/* TABLE */}

                        <div className="exact-table-wrapper">

                            <table className="exact-table">

                                <thead>

                                    <tr>

                                        <th className="th-left">
                                            क्र.
                                        </th>

                                        <th className="text-left">
                                            तपशील
                                        </th>

                                        <th className="text-center">
                                            सरकारी फी
                                        </th>

                                        <th className="text-center">
                                            सेवा शुल्क
                                        </th>

                                        <th className="th-right text-center">
                                            एकूण
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    <tr>

                                        <td className="text-center">
                                            १
                                        </td>

                                        <td className="text-left">
                                            <strong>
                                                {
                                                    selectedApp.name
                                                }
                                            </strong>
                                        </td>

                                        <td className="text-center">
                                            ₹
                                            {
                                                selectedApp.govtFee ||
                                                0
                                            }
                                        </td>

                                        <td className="text-center">
                                            ₹
                                            {
                                                selectedApp.serviceCharge ||
                                                0
                                            }
                                        </td>

                                        <td className="text-center">
                                            ₹
                                            {
                                                Number(
                                                    selectedApp.govtFee ||
                                                    0
                                                ) +
                                                Number(
                                                    selectedApp.serviceCharge ||
                                                    0
                                                )
                                            }
                                        </td>

                                    </tr>

                                    {selectedApp.extraServices?.map(
                                        (s, i) => (

                                            <tr key={i}>

                                                <td className="text-center">
                                                    {i + 2}
                                                </td>

                                                <td className="text-left">
                                                    {
                                                        s.name
                                                    }
                                                </td>

                                                <td className="text-center">
                                                    ₹
                                                    {
                                                        s.govtFee ||
                                                        0
                                                    }
                                                </td>

                                                <td className="text-center">
                                                    ₹
                                                    {
                                                        s.serviceCharge ||
                                                        0
                                                    }
                                                </td>

                                                <td className="text-center">
                                                    ₹
                                                    {
                                                        Number(
                                                            s.govtFee ||
                                                            0
                                                        ) +
                                                        Number(
                                                            s.serviceCharge ||
                                                            0
                                                        )
                                                    }
                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                        {/* BOTTOM GRID */}

                        <div className="exact-bottom-grid">

                            <div className="notes-col">

                                <p className="col-title">
                                    विशेष नोंद :
                                </p>

                                <p className="col-desc">
                                    {
                                        selectedApp.note ||
                                        "कोणतीही विशेष नोंद नाही."
                                    }
                                </p>

                                <div className="status-indicator">

                                    स्थिती:

                                    <strong
                                        style={{
                                            color:
                                                selectedApp.paid
                                                    ? "#15803d"
                                                    : "var(--accent-orange)",
                                        }}
                                    >
                                        {" "}
                                        {
                                            selectedApp.paid
                                                ? "जमा"
                                                : "प्रलंबित"
                                        }
                                    </strong>

                                </div>

                            </div>

                            <div className="totals-col">

                                <div className="tot-row">

                                    <span>
                                        एकूण
                                    </span>

                                    <span>
                                        ₹
                                        {
                                            selectedApp.subTotal
                                        }
                                    </span>

                                </div>

                                <div className="tot-row">

                                    <span>
                                        सूट
                                    </span>

                                    <span>
                                        {
                                            selectedApp.discountValue >
                                            0
                                                ? `- ₹${selectedApp.discountAmount}`
                                                : "₹0"
                                        }
                                    </span>

                                </div>

                                <div className="grand-tot-pill">

                                    <span className="pill-badge">
                                        एकूण रक्कम
                                    </span>

                                    <span className="pill-amount">
                                        ₹
                                        {
                                            selectedApp.total
                                        }
                                    </span>

                                </div>

                            </div>

                        </div>

                        {/* THANK YOU */}

                        <div className="thank-you-section">

                            <h3 className="thank-you-title">
                                धन्यवाद! (Thank You)
                            </h3>

                            <p className="visit-again-text">
                                आमच्या सेवांचा लाभ घेतल्याबद्दल आभारी आहोत.
                                <br />
                                कृपया पुन्हा भेट द्या!
                            </p>

                        </div>

                        {/* FOOTER */}

                        <div className="exact-footer-sig">

                            <div className="query-box">

                                <p className="col-title">
                                    कोणत्याही प्रश्नासाठी :
                                </p>

                                <p className="col-desc">
                                    वेबसाइट: www.onlinewalaa.com
                                    <br />
                                </p>

                                <p className="col-desc">
                                    ई-मेल: info@onlinewalaa.com
                                    <br />
                                    मोबाईल: +91 98765 43210
                                </p>

                                <p className="no-sig-text">
                                    हे संगणकीकृत INVOICE आहे, यावर स्वाक्षरीची गरज नाही.
                                </p>

                            </div>

                            {/* SPIN & WIN */}

                            <div className="spin-win-banner-horizontal">

                                <div className="banner-text-content">

                                    <span className="banner-title">
                                        🎉 स्पिन करा आणि जिंका!
                                    </span>

                                    <p className="banner-desc">
                                        कोणत्याही फॉर्मवर
                                        <strong>
                                            {" "}
                                            10% सूट
                                        </strong>
                                        {" "}
                                        किंवा इतर आकर्षक बक्षिसे जिंका.
                                    </p>

                                    <span className="banner-link">
                                        onlinewalaa.com/spin
                                    </span>

                                </div>

                                <svg
                                    viewBox="0 0 100 110"
                                    className="banner-illustration-wheel"
                                    preserveAspectRatio="xMidYMid meet"
                                >

                                    <path
                                        d="M 30 95 L 70 95 L 80 110 L 20 110 Z"
                                        fill="#0f172a"
                                    />

                                    <path
                                        d="M 45 70 L 55 70 L 60 95 L 40 95 Z"
                                        fill="#1e293b"
                                    />

                                    <circle
                                        cx="50"
                                        cy="45"
                                        r="42"
                                        fill="#0f172a"
                                    />

                                    <g transform="translate(50, 45)">

                                        <path
                                            d="M 0 0 L 0 -38 A 38 38 0 0 1 32.9 -19 Z"
                                            fill="#ef4444"
                                        />

                                        <path
                                            d="M 0 0 L 32.9 -19 A 38 38 0 0 1 32.9 19 Z"
                                            fill="#f59e0b"
                                        />

                                        <path
                                            d="M 0 0 L 32.9 19 A 38 38 0 0 1 0 38 Z"
                                            fill="#10b981"
                                        />

                                        <path
                                            d="M 0 0 L 0 38 A 38 38 0 0 1 -32.9 19 Z"
                                            fill="#3b82f6"
                                        />

                                        <path
                                            d="M 0 0 L -32.9 19 A 38 38 0 0 1 -32.9 -19 Z"
                                            fill="#8b5cf6"
                                        />

                                        <path
                                            d="M 0 0 L -32.9 -19 A 38 38 0 0 1 0 -38 Z"
                                            fill="#eab308"
                                        />

                                    </g>

                                    <circle
                                        cx="50"
                                        cy="45"
                                        r="10"
                                        fill="#ffffff"
                                    />

                                    <circle
                                        cx="50"
                                        cy="45"
                                        r="4"
                                        fill="#0f172a"
                                    />

                                    <path
                                        d="M 43 5 L 57 5 L 50 16 Z"
                                        fill="#fcd34d"
                                        stroke="#b45309"
                                        strokeWidth="1"
                                    />

                                    <circle
                                        cx="50"
                                        cy="4"
                                        r="3"
                                        fill="#fcd34d"
                                    />

                                    <circle
                                        cx="50"
                                        cy="6"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="89"
                                        cy="45"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="50"
                                        cy="84"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="11"
                                        cy="45"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="77"
                                        cy="18"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="77"
                                        cy="72"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="23"
                                        cy="18"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                    <circle
                                        cx="23"
                                        cy="72"
                                        r="1.5"
                                        fill="#fde047"
                                    />

                                </svg>

                            </div>

                        </div>

                        {/* BOTTOM WAVES */}

                        <div className="bottom-wave-container">

                            <svg
                                viewBox="0 0 800 150"
                                className="bottom-svg"
                                preserveAspectRatio="none"
                            >

                                <path
                                    d="M 0 100 C 150 150, 350 20, 550 120 C 650 150, 800 80, 800 80 L 800 150 L 0 150 Z"
                                    fill="var(--accent-orange)"
                                />

                                <path
                                    d="M 0 130 C 250 180, 450 60, 800 140 L 800 150 L 0 150 Z"
                                    fill="var(--primary-blue)"
                                />

                            </svg>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}