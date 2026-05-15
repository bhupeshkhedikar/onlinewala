import React, { useEffect } from "react";
import "./AllInvoicesPrint.css";

export default function AllInvoicesPrint({ user, onClose }) {
    // Automatically trigger print dialog when component mounts
    useEffect(() => {
        if (user?.applications?.length > 0) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [user]);

    const formatInvoiceDate = (dateVal) => {
        if (!dateVal) return new Date().toLocaleString("en-IN");
        if (dateVal.seconds) {
            return new Date(dateVal.seconds * 1000).toLocaleString("en-IN");
        }
        const d = new Date(dateVal);
        return isNaN(d.getTime())
            ? new Date().toLocaleString("en-IN")
            : d.toLocaleString("en-IN");
    };

    if (!user?.applications || user.applications.length === 0) {
        return (
            <div className="no-print-data">
                <p>कोणतेही अर्ज आढळले नाहीत (No applications found).</p>
                <button onClick={onClose}>मागे जा (Go Back)</button>
            </div>
        );
    }

    return (
        <div className="bulk-invoice-wrapper">
            {/* Control bar hidden during print */}
            <div className="print-controls">
                <button className="btn-close" onClick={onClose}>
                    ✕ बंद करा (Close)
                </button>
                <button className="btn-print" onClick={() => window.print()}>
                    🖨️ मुद्रित करा (Print)
                </button>
            </div>

            <div className="printable-area">
                {user.applications.map((app, index) => (
                    <div className="pro-invoice-page" key={index}>
                        
                        {/* HEADER */}
                        <div className="pro-header">
                            <div className="brand-section">
                                <h1 className="brand-title">Onlinewala</h1>
                                <p className="brand-subtitle">Digital Services Portal</p>
                            </div>
                            <div className="invoice-title-section">
                                <h2>(INVOICE)</h2>
                                <p className="invoice-id">#APP-{Date.now().toString().slice(-6)}-{index + 1}</p>
                            </div>
                        </div>

                        {/* META DATA */}
                        <div className="pro-meta">
                            <div className="meta-box">
                                <span className="meta-label">ग्राहकाचे नाव (Customer):</span>
                                <span className="meta-value">{user.name || "Customer"}</span>
                            </div>
                            <div className="meta-box">
                                <span className="meta-label">दिनांक (Date):</span>
                                <span className="meta-value">{formatInvoiceDate(app.date)}</span>
                            </div>
                            <div className="meta-box">
                                <span className="meta-label">स्थिती (Status):</span>
                                <span className={`status-badge ${app.paid ? "paid" : "pending"}`}>
                                    {app.paid ? "जमा (PAID)" : "प्रलंबित (PENDING)"}
                                </span>
                            </div>
                        </div>

                        {/* TABLE */}
                        <table className="pro-table">
                            <thead>
                                <tr>
                                    <th>तपशील (Description)</th>
                                    <th className="text-right">सरकारी फी (Govt Fee)</th>
                                    <th className="text-right">सेवा शुल्क (Service Charge)</th>
                                    <th className="text-right">एकूण (Total)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Base Service */}
                                <tr>
                                    <td>
                                        <strong>{app.name}</strong>
                                    </td>
                                    <td className="text-right">₹{app.govtFee || 0}</td>
                                    <td className="text-right">₹{app.serviceCharge || 0}</td>
                                    <td className="text-right">
                                        ₹{(Number(app.govtFee || 0) + Number(app.serviceCharge || 0)).toFixed(2)}
                                    </td>
                                </tr>

                                {/* Extra Services */}
                                {app.extraServices?.map((s, i) => (
                                    <tr key={`extra-${i}`} className="extra-row">
                                        <td>↳ {s.name}</td>
                                        <td className="text-right">₹{s.govtFee || 0}</td>
                                        <td className="text-right">₹{s.serviceCharge || 0}</td>
                                        <td className="text-right">
                                            ₹{(Number(s.govtFee || 0) + Number(s.serviceCharge || 0)).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* SUMMARY SECTION */}
                        <div className="pro-summary-wrapper">
                            {app.note && (
                                <div className="pro-notes">
                                    <strong>नोंद (Note):</strong>
                                    <p>{app.note}</p>
                                </div>
                            )}

                            <div className="pro-totals">
                                {app.discountValue > 0 && (
                                    <>
                                        <div className="total-row subtotal">
                                            <span>उप-एकूण (Subtotal):</span>
                                            <span>₹{app.subTotal?.toFixed(2)}</span>
                                        </div>
                                        <div className="total-row discount">
                                            <span>सूट (Discount) {app.discountType === "percent" ? `(${app.discountValue}%)` : ""}:</span>
                                            <span>-₹{app.discountAmount?.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                                <div className="total-row grand-total">
                                    <span>एकूण रक्कम (Grand Total):</span>
                                    <span>₹{app.total?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="pro-footer">
                            <p>Onlinewala सेवा वापरल्याबद्दल धन्यवाद! (Thank you for using Onlinewala!)</p>
                            <p>This is a computer-generated invoice and requires no signature.</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}