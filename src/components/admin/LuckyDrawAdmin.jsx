import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "./firebase";
import "./LuckyDrawAdmin.css";

const DEFAULT_PRIZES = [
  { id: "shoes", name: "पोलीस भरती शूज – ₹४९९ फ्री", type: "high", image: "/shoes.png", sliceColor: "#2563eb", textCol: "#ffffff", weight: 1, enabled: true },
  { id: "scan", name: "५ पाने मोफत स्कॅन", type: "high", image: "", sliceColor: "#ff9a9e", textCol: "#881337", weight: 1, enabled: true },
  { id: "bw-prints", name: "५ मोफत B&W प्रिंट्स", type: "mid", image: "", sliceColor: "#a18cd1", textCol: "#4c1d95", weight: 1, enabled: true },
  { id: "book", name: "पोलीस भरती बुक – ₹४९९ फ्री", type: "high", image: "/policebhartibook.jpg", sliceColor: "#7c3aed", textCol: "#ffffff", weight: 1, enabled: true },
  { id: "color-prints", name: "५ मोफत कलर प्रिंट्स", type: "low", image: "", sliceColor: "#84fab0", textCol: "#065f46", weight: 1, enabled: true },
  { id: "wifi", name: "३० मिनिट फ्री WiFi", type: "mid", image: "", sliceColor: "#f6d365", textCol: "#78350f", weight: 1, enabled: true },
  { id: "try-again", name: "पुन्हा प्रयत्न करा", type: "none", image: "", sliceColor: "#cfd9df", textCol: "#475569", weight: 2, enabled: true },
  { id: "discount", name: "कोणत्याही फॉर्मवर १०% सूट", type: "low", image: "", sliceColor: "#a8edea", textCol: "#1e3a8a", weight: 1, enabled: true }
];

const makeId = () => `prize-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const asDate = (value) => value?.toDate ? value.toDate().toLocaleString("en-IN") : "—";

export default function LuckyDrawAdmin() {
  const [prizes, setPrizes] = useState(DEFAULT_PRIZES);
  const [customWinners, setCustomWinners] = useState([]);
  const [customRulesEnabled, setCustomRulesEnabled] = useState(true);
  const [spinCount, setSpinCount] = useState(0);
  const [liveStatus, setLiveStatus] = useState("idle");
  const [activeSpinNumber, setActiveSpinNumber] = useState(null);
  const [activeSpinUser, setActiveSpinUser] = useState("");
  const [activeSpinPrize, setActiveSpinPrize] = useState("");
  const [lastPrizeName, setLastPrizeName] = useState("");
  const [lastSpinAt, setLastSpinAt] = useState(null);
  const [recentSpins, setRecentSpins] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const authEmail = getAuth().currentUser?.email || "";

  useEffect(() => {
    const settingsRef = doc(db, "settings", "luckyDraw");
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.prizes) && data.prizes.length) setPrizes(data.prizes);
        setCustomWinners(Array.isArray(data.customWinners) ? data.customWinners : []);
        setCustomRulesEnabled(data.customRulesEnabled !== false);
        setSpinCount(Number(data.spinCount || 0));
        setLiveStatus(data.activeSpinStatus || "idle");
        setActiveSpinNumber(data.activeSpinNumber ?? null);
        setActiveSpinUser(data.activeSpinUser || "");
        setActiveSpinPrize(data.activeSpinPrize || "");
        setLastPrizeName(data.lastPrizeName || "");
        setLastSpinAt(data.lastSpinAt || null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Lucky draw settings listener:", err);
      setError("Live settings load झाले नाहीत. Firestore read rules तपासा.");
      setLoading(false);
    });

    const spinsQuery = query(
      collection(db, "luckyDrawSpins"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsubscribeSpins = onSnapshot(spinsQuery, (snapshot) => {
      setRecentSpins(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    }, (err) => {
      console.error("Lucky draw spins listener:", err);
      setError("Live spin history साठी Firestore rules मध्ये admin read access द्या.");
    });

    return () => {
      unsubscribeSettings();
      unsubscribeSpins();
    };
  }, []);

  const enabledPrizeCount = useMemo(() => prizes.filter((item) => item.enabled !== false).length, [prizes]);
  const customRuleCount = useMemo(() => customWinners.filter((item) => item.enabled !== false).length, [customWinners]);

  const updatePrize = (id, key, value) => {
    setPrizes((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  };

  const addPrize = () => {
    if (prizes.length >= 12) return;
    setPrizes((current) => [...current, {
      id: makeId(), name: "नवीन ऑफर", type: "low", image: "",
      sliceColor: "#0ea5e9", textCol: "#ffffff", weight: 1, enabled: true
    }]);
  };

  const removePrize = (id) => {
    if (prizes.length <= 2) {
      setError("कमीत कमी 2 prize slices आवश्यक आहेत.");
      return;
    }
    setPrizes((current) => current.filter((item) => item.id !== id));
    setCustomWinners((current) => current.filter((item) => item.prizeId !== id));
  };

  const addCustomWinner = () => {
    setCustomWinners((current) => [...current, {
      spinNumber: Math.max(1, spinCount + 1),
      prizeId: prizes.find((item) => item.enabled !== false)?.id || prizes[0]?.id,
      enabled: true
    }]);
  };

  const updateRule = (index, key, value) => {
    setCustomWinners((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const functions = getFunctions(undefined, "asia-south1");
      const saveConfig = httpsCallable(functions, "adminSaveLuckyDrawConfig");
      const response = await saveConfig({ prizes, customWinners, customRulesEnabled });
      setMessage(`Saved successfully. ${response.data?.prizeCount || prizes.length} prizes and ${response.data?.customWinnerCount || 0} custom winner rules saved.`);
    } catch (err) {
      console.error("Lucky draw config save failed:", err);
      setError(err?.message || "Configuration save झाली नाही.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="lda-page">
      <header className="lda-header">
        <div>
          <span className="lda-eyebrow">ONLINEWALA • CONTROL CENTER</span>
          <h1>Lucky Draw Manager</h1>
          <p>Prizes, custom winners आणि live spins एका ठिकाणी manage करा.</p>
        </div>
        <div className="lda-admin-pill">Admin: {authEmail || "Login required"}</div>
      </header>

      <section className="lda-stats">
        <article className="lda-stat-card">
          <span>Total spins completed/started</span>
          <strong>{loading ? "…" : spinCount}</strong>
          <small>एकूण spin counter</small>
        </article>
        <article className="lda-stat-card lda-live-card">
          <span>Live spin status</span>
          <strong>{liveStatus === "spinning" ? "SPINNING" : liveStatus === "completed" ? "COMPLETED" : "IDLE"}</strong>
          <small>{activeSpinNumber ? `Spin #${activeSpinNumber}` : "सध्या spin चालू नाही"}</small>
        </article>
        <article className="lda-stat-card">
          <span>Active prizes</span>
          <strong>{enabledPrizeCount}</strong>
          <small>{prizes.length} total slices</small>
        </article>
        <article className="lda-stat-card">
          <span>Custom winner rules</span>
          <strong>{customRuleCount}</strong>
          <small>{customRulesEnabled ? "Enabled" : "Disabled"}</small>
        </article>
      </section>

      <section className="lda-live-panel">
        <div className="lda-section-heading">
          <div>
            <span className="lda-eyebrow">REAL-TIME MONITOR</span>
            <h2>Live Spin Monitor</h2>
          </div>
          <span className={`lda-status ${liveStatus === "spinning" ? "is-running" : ""}`}>
            {liveStatus === "spinning" ? "● LIVE NOW" : "● LIVE UPDATES"}
          </span>
        </div>
        <div className="lda-live-grid">
          <div><small>Current spin number</small><b>{activeSpinNumber || "—"}</b></div>
          <div><small>Customer</small><b>{activeSpinUser || "—"}</b></div>
          <div><small>Selected prize</small><b>{activeSpinPrize || "—"}</b></div>
          <div><small>Last completed prize</small><b>{lastPrizeName || "—"}</b><small>{asDate(lastSpinAt)}</small></div>
        </div>
      </section>

      <section className="lda-section">
        <div className="lda-section-heading">
          <div>
            <span className="lda-eyebrow">WHEEL CONFIGURATION</span>
            <h2>Spinner Prizes & Offers</h2>
            <p>प्रत्येक prize हा spinner चा एक slice असेल. जास्त weight म्हणजे random selection मध्ये जास्त chance.</p>
          </div>
          <button className="lda-secondary-btn" onClick={addPrize} disabled={prizes.length >= 12}>＋ Add Prize</button>
        </div>

        <div className="lda-prize-list">
          {prizes.map((prize, index) => (
            <article className={`lda-prize-card ${prize.enabled === false ? "is-disabled" : ""}`} key={prize.id}>
              <div className="lda-prize-top">
                <span className="lda-prize-index">SLICE {index + 1}</span>
                <label className="lda-toggle">
                  <input type="checkbox" checked={prize.enabled !== false} onChange={(e) => updatePrize(prize.id, "enabled", e.target.checked)} />
                  <span>{prize.enabled === false ? "Disabled" : "Enabled"}</span>
                </label>
              </div>
              <div className="lda-prize-fields">
                <label className="lda-field lda-field-wide">Prize / Offer name
                  <input value={prize.name || ""} onChange={(e) => updatePrize(prize.id, "name", e.target.value)} placeholder="उदा. ₹100 Recharge Coupon" />
                </label>
                <label className="lda-field">Prize type
                  <select value={prize.type || "low"} onChange={(e) => updatePrize(prize.id, "type", e.target.value)}>
                    <option value="high">Big prize</option>
                    <option value="mid">Medium prize</option>
                    <option value="low">Small offer</option>
                    <option value="none">No win / Try again</option>
                  </select>
                </label>
                <label className="lda-field">Random weight
                  <input type="number" min="1" max="1000" value={prize.weight ?? 1} onChange={(e) => updatePrize(prize.id, "weight", Number(e.target.value))} />
                </label>
                <label className="lda-field lda-field-wide">Image URL (optional)
                  <input value={prize.image || ""} onChange={(e) => updatePrize(prize.id, "image", e.target.value)} placeholder="/offer-image.png or https://..." />
                </label>
                <label className="lda-field">Slice color
                  <span className="lda-color-input"><input type="color" value={prize.sliceColor || "#64748b"} onChange={(e) => updatePrize(prize.id, "sliceColor", e.target.value)} /><input value={prize.sliceColor || "#64748b"} onChange={(e) => updatePrize(prize.id, "sliceColor", e.target.value)} /></span>
                </label>
                <label className="lda-field">Text color
                  <span className="lda-color-input"><input type="color" value={prize.textCol || "#ffffff"} onChange={(e) => updatePrize(prize.id, "textCol", e.target.value)} /><input value={prize.textCol || "#ffffff"} onChange={(e) => updatePrize(prize.id, "textCol", e.target.value)} /></span>
                </label>
              </div>
              <div className="lda-prize-bottom">
                <span className="lda-prize-preview" style={{ background: prize.sliceColor || "#64748b", color: prize.textCol || "#fff" }}>{prize.name || "Prize preview"}</span>
                <button className="lda-remove-btn" onClick={() => removePrize(prize.id)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lda-section">
        <div className="lda-section-heading">
          <div>
            <span className="lda-eyebrow">WINNER SCHEDULER</span>
            <h2>Custom Winner Numbers</h2>
            <p>उदा. Spin #25 ला Book, #50 ला Shoes. बाकी सर्व numbers random prize निवडतील.</p>
          </div>
          <button className="lda-secondary-btn" onClick={addCustomWinner}>＋ Add Custom Winner</button>
        </div>
        <label className="lda-custom-enable">
          <input type="checkbox" checked={customRulesEnabled} onChange={(e) => setCustomRulesEnabled(e.target.checked)} />
          <span><b>Enable custom winner schedule</b><small>Enabled असल्यास दिलेल्या exact spin number वरच custom prize मिळेल. इतर spins random राहतील.</small></span>
        </label>
        {customWinners.length === 0 ? (
          <div className="lda-empty">अजून custom winner rule add केलेला नाही.</div>
        ) : (
          <div className="lda-rules-list">
            {customWinners.map((rule, index) => (
              <div className="lda-rule-row" key={`${index}-${rule.spinNumber}`}>
                <label className="lda-field">Winning spin number
                  <input type="number" min="1" value={rule.spinNumber} onChange={(e) => updateRule(index, "spinNumber", Number(e.target.value))} />
                </label>
                <label className="lda-field">Give this prize
                  <select value={rule.prizeId} onChange={(e) => updateRule(index, "prizeId", e.target.value)}>
                    {prizes.map((prize) => <option key={prize.id} value={prize.id}>{prize.name}</option>)}
                  </select>
                </label>
                <label className="lda-rule-enable"><input type="checkbox" checked={rule.enabled !== false} onChange={(e) => updateRule(index, "enabled", e.target.checked)} /> Active</label>
                <button className="lda-remove-btn" onClick={() => setCustomWinners((current) => current.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="lda-save-bar">
        <div><b>Changes are not live until saved.</b><small>Save केल्यावर customer spinner ला updated prizes लागू होतील.</small></div>
        <button className="lda-save-btn" onClick={saveConfiguration} disabled={saving}>{saving ? "Saving…" : "Save Lucky Draw Settings"}</button>
      </div>
      {message && <div className="lda-message success">{message}</div>}
      {error && <div className="lda-message error">{error}</div>}

      <section className="lda-section">
        <div className="lda-section-heading">
          <div><span className="lda-eyebrow">SPIN LOG</span><h2>Recent Spins</h2><p>Latest 30 spins live update hot rahenge.</p></div>
        </div>
        <div className="lda-table-wrap">
          <table className="lda-table">
            <thead><tr><th>Spin #</th><th>Customer</th><th>Mobile</th><th>Prize</th><th>Type</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              {recentSpins.map((spin) => (
                <tr key={spin.id}>
                  <td>#{spin.spinNumber}</td>
                  <td>{spin.userName || "Customer"}</td>
                  <td>{spin.userMobile || "—"}</td>
                  <td>{spin.prizeName || spin.prize?.name || "—"}</td>
                  <td><span className={`lda-tag ${spin.selectionType === "custom" ? "custom" : "random"}`}>{spin.selectionType || "random"}</span></td>
                  <td>{spin.status || "—"}</td>
                  <td>{asDate(spin.createdAt)}</td>
                </tr>
              ))}
              {!recentSpins.length && <tr><td colSpan="7" className="lda-no-data">No spins recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
