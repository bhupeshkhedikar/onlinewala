import React, { useState, useEffect } from "react";
import { db } from "./firebase"; 
import { collection, getDocs } from "firebase/firestore";
import "./InvoiceDashboard.css"; 

export default function AdminInvoiceDashboard() {
    const [allApplications, setAllApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);

    useEffect(() => {
        const fetchAllApps = async () => {
            try {
                const usersSnapshot = await getDocs(collection(db, "users"));
                let appsMasterList = [];
                usersSnapshot.forEach((doc) => {
                    const userData = doc.data();
                    if (userData.applications) {
                        userData.applications.forEach((app) => {
                            appsMasterList.push({
                                ...app,
                                userName: userData.name || "ग्राहक",
                            });
                        });
                    }
                });
                appsMasterList.sort((a, b) => new Date(b.date) - new Date(a.date));
                setAllApplications(appsMasterList);
            } catch (error) { console.error(error); } 
            finally { setLoading(false); }
        };
        fetchAllApps();
    }, []);

    useEffect(() => {
        if (selectedApp) {
            setTimeout(() => { window.print(); setSelectedApp(null); }, 500);
        }
    }, [selectedApp]);

    if (loading) return <div className="loader-container">लोड होत आहे...</div>;

    return (
        <div className="invoice-dashboard-wrapper">
            
            {/* --- SCREEN VIEW --- */}
            <div className="screen-view no-print">
                <div className="dashboard-header">
                    <h2>सर्व ग्राहकांचे अर्ज</h2>
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
                        {allApplications.map((app, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{app.userName}</td>
                                <td>{app.name}</td>
                                <td>{new Date(app.date).toLocaleDateString("en-IN")}</td>
                                <td><span className={`pill ${app.paid ? 'paid' : 'pending'}`}>{app.paid ? 'जमा' : 'प्रलंबित'}</span></td>
                                <td>₹{app.total}</td>
                                <td><button className="print-btn" onClick={() => setSelectedApp(app)}>प्रिंट करा</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- EXACT REPLICA PRINT VIEW --- */}
            {selectedApp && (
                <div className="print-view">
                    <div className="exact-invoice-container">
                        
                        {/* TOP WAVES */}
                        <div className="top-wave-container">
                            <svg viewBox="0 0 500 250" className="top-svg" preserveAspectRatio="none">
                                <path d="M 500 0 L 150 0 C 150 150, 300 220, 500 120 Z" fill="var(--accent-orange)" />
                                <path d="M 500 0 L 220 0 C 220 120, 350 160, 500 80 Z" fill="var(--primary-blue)" />
                            </svg>
                            {/* Invoice Text inside the wave */}
                            <div className="title-inside-wave">
                                <h1 style={{marginTop:'-20px'}}>INVOICE</h1>
                            </div>
                        </div>

                        {/* HEADER SECTION */}
                        <div className="invoice-header-exact">
                            <div className="left-head">
                                <div className="exact-logo-design">
                                    <h2>ऑनलाइन<span>वाला</span></h2>
                                    <p className="tag-gray">सर्व ऑनलाइन कामे, एकाच ठिकाणी</p>
                                    <p className="tag-orange">फास्ट, अचूक, विश्वासार्ह</p>
                                    <p style={{color:'#2563eb',fontWeight:"bold"}}>onlinewalaa.<span style={{color:'#f59e0b',fontWeight:"bold"}}>com</span></p>
                                </div>
                                
                                <div className="bill-to-box">
                                    <p className="sub-label">ग्राहकाचे नाव:</p>
                                    <h3 className="client-name">{selectedApp.userName}</h3>
                                </div>
                            </div>
                            
                            <div className="right-head">
                                <table className="meta-table">
                                    <tbody>
                                        <tr>
                                            <td className="meta-label">INVOICE क्र. :</td>
                                            <td className="meta-value">#INV-{Date.now().toString().slice(-4)}</td>
                                        </tr>
                                        <tr>
                                            <td className="meta-label">दिनांक :</td>
                                            <td className="meta-value">{new Date(selectedApp.date).toLocaleDateString("en-IN")}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* TABLE SECTION */}
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
                                        <td className="text-left"><strong>{selectedApp.name}</strong></td>
                                        <td className="text-center">₹{selectedApp.govtFee || 0}</td>
                                        <td className="text-center">₹{selectedApp.serviceCharge || 0}</td>
                                        <td className="text-center">₹{Number(selectedApp.govtFee || 0) + Number(selectedApp.serviceCharge || 0)}</td>
                                    </tr>
                                    {selectedApp.extraServices?.map((s, i) => (
                                        <tr key={i}>
                                            <td className="text-center">{i + 2}</td>
                                            <td className="text-left">{s.name}</td>
                                            <td className="text-center">₹{s.govtFee || 0}</td>
                                            <td className="text-center">₹{s.serviceCharge || 0}</td>
                                            <td className="text-center">₹{Number(s.govtFee || 0) + Number(s.serviceCharge || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* CALCULATION & NOTES SECTION */}
                        <div className="exact-bottom-grid">
                            <div className="notes-col">
                                <p className="col-title">विशेष नोंद :</p>
                                <p className="col-desc">{selectedApp.note || "कोणतीही विशेष नोंद नाही."}</p>
                                
                                <div className="status-indicator">
                                    स्थिती: <strong style={{color: selectedApp.paid ? '#15803d' : 'var(--accent-orange)'}}>{selectedApp.paid ? 'जमा' : 'प्रलंबित'}</strong>
                                </div>
                            </div>
                            
                            <div className="totals-col">
                                <div className="tot-row">
                                    <span>एकूण</span>
                                    <span>₹{selectedApp.subTotal}</span>
                                </div>
                                <div className="tot-row">
                                    <span>सूट</span>
                                    <span>{selectedApp.discountValue > 0 ? `- ₹${selectedApp.discountAmount}` : "₹0"}</span>
                                </div>
                                
                                <div className="grand-tot-pill">
                                    <span className="pill-badge">एकूण रक्कम</span>
                                    <span className="pill-amount">₹{selectedApp.total}</span>
                                </div>
                            </div>
                        </div>

                        {/* --- NEW THANK YOU MESSAGE --- */}
                        <div className="thank-you-section">
                            <h3 className="thank-you-title">धन्यवाद! (Thank You)</h3>
                            <p className="visit-again-text">आमच्या सेवांचा लाभ घेतल्याबद्दल आभारी आहोत.<br/>कृपया पुन्हा भेट द्या!</p>
                        </div>

                        {/* FOOTER - QUERIES & HORIZONTAL SPIN BANNER */}
                        <div className="exact-footer-sig">
                            <div className="query-box">
                                <p className="col-title">कोणत्याही प्रश्नासाठी :</p>
                                <p className="col-desc">वेबसाइट: www.onlinewalaa.com<br/></p>
                                <p className="col-desc">ई-मेल: info@onlinewalaa.com<br/>मोबाईल: +91 98765 43210</p>
                                <p className="no-sig-text">हे संगणकीकृत INVOICE आहे, यावर स्वाक्षरीची गरज नाही.</p>
                            </div>
                            
                            {/* HORIZONTAL SPIN & WIN BANNER */}
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

                        {/* BOTTOM WAVES */}
                        <div className="bottom-wave-container">
                            <svg viewBox="0 0 800 150" className="bottom-svg" preserveAspectRatio="none">
                                <path d="M 0 100 C 150 150, 350 20, 550 120 C 650 150, 800 80, 800 80 L 800 150 L 0 150 Z" fill="var(--accent-orange)" />
                                <path d="M 0 130 C 250 180, 450 60, 800 140 L 800 150 L 0 150 Z" fill="var(--primary-blue)" />
                            </svg>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}