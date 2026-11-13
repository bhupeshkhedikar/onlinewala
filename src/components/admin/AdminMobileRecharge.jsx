import React, { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./AdminMobileRecharge.css";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export default function AdminMobileRecharge() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setLoading(true); setError("");
      const fn = httpsCallable(getFunctions(undefined, "asia-south1"), "getMobileRechargeAdminReport");
      const res = await fn();
      setData(res.data);
    } catch (e) { setError(e.message || "Could not load recharge report."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <div className="admin-rc-wrap">Recharge report loading...</div>;
  if (error) return <div className="admin-rc-wrap"><p className="admin-rc-error">{error}</p><button onClick={load}>Retry</button></div>;
  const t = data?.totals || {};
  return <div className="admin-rc-wrap">
    <div className="admin-rc-head"><div><span>FINANCE MANAGEMENT</span><h2>Mobile Recharge</h2><p>Provider cost, customer collection and actual estimated margin.</p></div><button onClick={load}>↻ Refresh</button></div>
    <div className="admin-rc-stats">
      <div><small>Successful</small><strong>{t.successCount || 0}</strong></div>
      <div><small>Customer revenue</small><strong>{money(t.customerRevenue)}</strong></div>
      <div><small>Provider cost</small><strong>{money(t.providerCost)}</strong></div>
      <div className={(t.profitLoss || 0) < 0 ? "loss" : "profit"}><small>Profit / Loss</small><strong>{money(t.profitLoss)}</strong></div>
      <div><small>Pending</small><strong>{t.pendingCount || 0}</strong></div>
      <div><small>Failed</small><strong>{t.failedCount || 0}</strong></div>
    </div>
    <div className="admin-rc-table-wrap"><table className="admin-rc-table"><thead><tr><th>Mobile / Operator</th><th>Plan</th><th>Customer paid</th><th>Provider cost</th><th>Profit / Loss</th><th>Status</th><th>Client Ref</th></tr></thead><tbody>
      {(data?.orders || []).map(o => <tr key={o.id}><td>{o.mobile}<small>{o.operator} · {o.circle}</small></td><td>{money(o.amount)}</td><td>{money(o.customerPayable)}</td><td>{money(o.providerCost)}</td><td className={Number(o.estimatedProfitLoss) < 0 ? "loss-text" : "profit-text"}>{money(o.estimatedProfitLoss)}</td><td><span className={`admin-rc-status ${o.status}`}>{o.status}</span></td><td>{o.clientRef}</td></tr>)}
    </tbody></table>{!data?.orders?.length && <p className="admin-rc-empty">No recharge transactions yet.</p>}</div>
    <p className="admin-rc-note">Report includes latest 500 orders. Profit/Loss is counted only for successful recharges. Example: ₹299 plan − ₹3 customer discount = ₹296 collected; if provider debit is ₹297.81, estimated loss is ₹1.81.</p>
  </div>;
}
