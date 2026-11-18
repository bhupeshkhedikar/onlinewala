import React, { useEffect, useMemo, useRef, useState } from "react";

import { getFunctions, httpsCallable } from "firebase/functions";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../firebase";

import {

  collection, onSnapshot, query, where, limit

} from "firebase/firestore";

import "./MobileRecharge.css";

const functions = getFunctions(undefined, "asia-south1");

const money = (value) =>

  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const getOperatorMark = (operator = "") => {

  const name = operator.toLowerCase();

  if (name.includes("airtel")) return "A";

  if (name.includes("jio")) return "J";

  if (name === "vi" || name.includes("vodafone")) return "Vi";

  if (name.includes("bsnl")) return "B";

  if (name.includes("mtnl")) return "M";

  return "SIM";

};

const getPlanCategory = (plan) => {

  const text = `${plan.type || ""} ${plan.description || ""}`.toLowerCase();

  if (/top.?up|talk.?time|full.?talk|validity extension/.test(text)) return "topup";

  if (/data.?only|data pack|internet pack|gb data/.test(text)) return "data";

  if (/validity|extension|service validity/.test(text)) return "validity";

  if (/unlimited|daily|\/day|calls/.test(text)) return "unlimited";

  return "popular";

};

const categoryLabels = [

  { id: "all", label: "All plans" },

  { id: "popular", label: "Popular" },

  { id: "unlimited", label: "Unlimited" },

  { id: "data", label: "Data" },

  { id: "topup", label: "Talktime" },

  { id: "validity", label: "Validity" },

];

const statusLabel = (status) => ({

  success: "Successful",

  pending: "Pending",

  failed: "Failed",

  processing: "Processing",

  unknown: "Checking",

}[String(status || "").toLowerCase()] || status || "Pending");

const getTimestamp = (value) => {

  if (!value) return 0;

  if (typeof value.toMillis === "function") return value.toMillis();

  if (typeof value.toDate === "function") return value.toDate().getTime();

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;

};

export default function MobileRecharge() {

  const [mobile, setMobile] = useState("");

  const [plansData, setPlansData] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);

  const [plansLoading, setPlansLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const [tab, setTab] = useState("recharge");

  const [orders, setOrders] = useState([]);

  const [historyLoading, setHistoryLoading] = useState(true);

  const [historyError, setHistoryError] = useState("");

  const [checkingId, setCheckingId] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [walletLow, setWalletLow] = useState(false);

  const [planSearch, setPlanSearch] = useState("");

  const [activeCategory, setActiveCategory] = useState("all");

  const [activePriceRange, setActivePriceRange] = useState("all");

  const [sortBy, setSortBy] = useState("recommended");

  const [showAllPlans, setShowAllPlans] = useState(false);

  const plansSectionRef = useRef(null);

  // Wait for Firebase auth to initialise before loading the user's recharge history.

  // Only mobileRechargeOrders is queried here; wallet top-ups/withdrawals are excluded.

  useEffect(() => {

    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {

      if (unsubscribeSnapshot) {

        unsubscribeSnapshot();

        unsubscribeSnapshot = null;

      }

      if (!user) {

        setOrders([]);

        setHistoryLoading(false);

        setHistoryError("रिचार्जची History पाहण्यासाठी कृपया Login करा.");

        return;

      }

      setHistoryLoading(true);

      setHistoryError("");

      // The recharge backend saves authUid on every mobileRechargeOrders record.

      // Sorting is done client-side to avoid requiring a composite Firestore index.

      const rechargeQuery = query(

        collection(db, "mobileRechargeOrders"),

        where("authUid", "==", user.uid),

        limit(100)

      );

      unsubscribeSnapshot = onSnapshot(

        rechargeQuery,

        (snapshot) => {

          const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

          rows.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));

          setOrders(rows);

          setHistoryLoading(false);

          setHistoryError("");

        },

        (err) => {

          console.error("Mobile recharge history listener:", err);

          setHistoryLoading(false);

          setHistoryError(err?.message || "Recharge history could not be loaded.");

        }

      );

    });

    return () => {

      unsubscribeAuth();

      if (unsubscribeSnapshot) unsubscribeSnapshot();

    };

  }, []);

  const getPlans = async (event) => {

    event?.preventDefault();

    setError("");

    setMessage("");

    setPlansData(null);

    setSelectedPlan(null);

    setPlanSearch("");

    setActiveCategory("all");

    setActivePriceRange("all");

    setShowAllPlans(false);

    const clean = mobile.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(clean)) {

      setError("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");

      return;

    }

    try {

      setPlansLoading(true);

      const call = httpsCallable(functions, "getMobileRechargePlans");

      const response = await call({ mobile: clean });

      if (!response.data?.success || !Array.isArray(response.data?.plans)) {

        throw new Error(response.data?.message || "Plans नहीं मिल पाए।");

      }

      setPlansData(response.data);

      setMessage("Operator और circle verify हो गए। अब अपना recharge plan चुनें।");

    } catch (err) {

      setError(err?.message || "Plans load नहीं हो पाए।");

    } finally {

      setPlansLoading(false);

    }

  };

  // Once plans have loaded successfully, bring the plans section into view.

  useEffect(() => {

    if (!plansData?.plans?.length) return undefined;

    const frameId = window.requestAnimationFrame(() => {

      plansSectionRef.current?.scrollIntoView({

        behavior: "smooth",

        block: "start",

      });

    });

    return () => window.cancelAnimationFrame(frameId);

  }, [plansData]);

  const customerPayable = (plan) =>

    Math.max(0, Number(plan.amount) - 3);

  // Build ₹100 price bands dynamically from the plans returned by the operator.
  const priceRanges = useMemo(() => {
    if (!plansData?.plans?.length) return [];

    const amounts = plansData.plans
      .map((plan) => Number(plan.amount))
      .filter((amount) => Number.isFinite(amount) && amount >= 0);

    const highestAmount = Math.max(100, ...amounts);
    const ranges = [];

    let min = 10;
    while (min <= highestAmount) {
      const max = min === 10 ? 100 : min + 99;
      ranges.push({
        id: `${min}-${max}`,
        min,
        max,
        label: `₹${min}–₹${max}`,
      });
      min = max + 1;
    }

    return ranges;
  }, [plansData]);

  const filteredPlans = useMemo(() => {

    if (!plansData?.plans) return [];

    let result = plansData.plans.map((plan, index) => ({

      ...plan,

      _key: `${plan.amount}-${plan.type}-${index}`,

      _category: getPlanCategory(plan),

    }));

    if (activeCategory !== "all") {

      result = result.filter((plan) => plan._category === activeCategory);

    }

    if (activePriceRange !== "all") {
      const [rangeMin, rangeMax] = activePriceRange.split("-").map(Number);
      result = result.filter((plan) => {
        const amount = Number(plan.amount);
        return Number.isFinite(amount) && amount >= rangeMin && amount <= rangeMax;
      });
    }

    const term = planSearch.trim().toLowerCase();

    if (term) {

      const numericTerm = Number(term.replace(/[₹,\s]/g, ""));

      result = result.filter((plan) => {

        const searchable = [

          plan.amount,

          plan.type,

          plan.validity,

          plan.talk_time,

          plan.description,

          plan._category,

        ].join(" ").toLowerCase();

        const textMatch = searchable.includes(term);

        const amountMatch =

          term.replace(/[₹,\s]/g, "") !== "" &&

          Number.isFinite(numericTerm) &&

          Math.abs(Number(plan.amount) - numericTerm) < 0.001;

        return textMatch || amountMatch;

      });

    }

    if (sortBy === "price-low") result.sort((a, b) => Number(a.amount) - Number(b.amount));

    if (sortBy === "price-high") result.sort((a, b) => Number(b.amount) - Number(a.amount));

    if (sortBy === "validity") result.sort((a, b) => Number(b.validity) - Number(a.validity));

    return result;

  }, [plansData, activeCategory, activePriceRange, planSearch, sortBy]);

  const visiblePlans = showAllPlans ? filteredPlans : filteredPlans.slice(0, 8);

  const submitRecharge = async () => {
    if (!selectedPlan || !plansData) return;

    // Plans are public, but recharge must always be tied to an authenticated wallet.
    if (!auth.currentUser) {
      setShowLoginPrompt(true);
      setMessage("रिचार्ज करण्यासाठी कृपया Login करा किंवा नवीन खाते तयार करा. रिचार्जची रक्कम तुमच्या Onlinewala Wallet मधून वजा केली जाईल.");
      return;
    }

    const payable = customerPayable(selectedPlan);
    const confirmed = window.confirm(
      `Mobile: ${mobile}\nOperator: ${plansData.operator}\nPlan: ${money(selectedPlan.amount)}\nOnlineWalaa discount: ₹3.00\nWallet debit: ${money(payable)}\n\nरिचार्ज निश्चित करायचा आहे का?`
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      setError("");
      setMessage("तुमच्या रिचार्जची विनंती पाठवली जात आहे...");
      setShowLoginPrompt(false);
      setWalletLow(false);

      const call = httpsCallable(functions, "submitMobileRecharge");
      const response = await call({
        mobile: mobile.replace(/\D/g, ""),
        amount: String(Number(selectedPlan.amount).toFixed(2)),
        operatorCode: Number(plansData.operator_code),
        customerPayable: payable,
      });

      const result = response.data || {};
      setMessage(
        result.status === "success"
          ? "🎉 अभिनंदन! तुमचा मोबाईल रिचार्ज यशस्वी झाला आहे. कृपया तुमच्या मोबाईलवर रिचार्जची पुष्टी तपासा. Onlinewala वापरल्याबद्दल धन्यवाद!"
          : result.status === "failed"
          ? "❌ तुमचा रिचार्ज पूर्ण होऊ शकला नाही. तुमच्या Wallet मधील परताव्याची स्थिती तपासा."
          : "📱 तुमच्या रिचार्जची विनंती प्राप्त झाली आहे. कृपया काही मिनिटे प्रतीक्षा करा आणि तुमच्या मोबाईलवर रिचार्ज झाला आहे की नाही ते तपासत राहा. स्थिती Pending असताना पुन्हा रिचार्ज करू नका."
      );
      setTab("history");
      setSelectedPlan(null);
      setPlansData(null);
    } catch (err) {
      const rawMessage = err?.message || "";
      if (/Insufficient wallet balance/i.test(rawMessage)) {
        setWalletLow(true);
        setError("तुमच्या Wallet मध्ये पुरेशी रक्कम उपलब्ध नाही. कृपया आधी Wallet मध्ये पैसे Add करा आणि पुन्हा रिचार्ज करा.");
      } else if (err?.code === "unauthenticated" || /login first/i.test(rawMessage)) {
        setShowLoginPrompt(true);
        setError("रिचार्ज करण्यासाठी कृपया Login करा किंवा नवीन खाते तयार करा.");
      } else {
        setError(rawMessage || "रिचार्जची विनंती पाठवता आली नाही. कृपया पुन्हा प्रयत्न करा.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async (order) => {
    try {
      setCheckingId(order.id);
      setError("");
      const call = httpsCallable(functions, "checkMobileRechargeStatus");
      const response = await call({ orderId: order.id });
      const status = response.data?.status;

      setMessage(
        status === "success"
          ? "🎉 अभिनंदन! तुमचा मोबाईल रिचार्ज यशस्वी झाला आहे. कृपया तुमच्या मोबाईलवर रिचार्जची पुष्टी तपासा."
          : status === "failed"
          ? "❌ रिचार्ज अयशस्वी झाला. तुमच्या Wallet मधील परताव्याची स्थिती तपासा."
          : "📱 तुमचा रिचार्ज अजून प्रक्रियेत आहे. कृपया काही मिनिटांनी पुन्हा Status तपासा आणि तुमच्या मोबाईलवर रिचार्ज झाला आहे का ते पाहत राहा. तोपर्यंत पुन्हा रिचार्ज करू नका."
      );
    } catch (err) {
      setError(err?.message || "रिचार्जची स्थिती तपासता आली नाही. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setCheckingId("");
    }
  };

  useEffect(() => {

    const pending = orders.filter((order) =>

      ["pending", "processing", "unknown"].includes(String(order.status || "").toLowerCase())

    );

    if (!pending.length) return undefined;

    const timer = setInterval(async () => {

      const call = httpsCallable(functions, "checkMobileRechargeStatus");

      for (const order of pending) {

        try {

          await call({ orderId: order.id });

        } catch (err) {

          console.warn("Automatic recharge status check:", err?.message || err);

        }

      }

    }, 45000);

    return () => clearInterval(timer);

  }, [orders]);

  const formatDate = (value) => {

    if (!value) return "Date unavailable";

    const date = value?.toDate ? value.toDate() : new Date(value);

    return Number.isNaN(date.getTime())

      ? "Date unavailable"

      : date.toLocaleString("en-IN", {

          day: "2-digit", month: "short", year: "numeric",

          hour: "2-digit", minute: "2-digit",

        });

  };

  return (

    <main className="ow-recharge-page">

      <div className="ow-recharge-shell">

        <header className="ow-recharge-heading">

          <div className="ow-recharge-heading-copy">

            <span className="ow-eyebrow">ONLINEWALAA • QUICK SERVICES</span>

            <h1>Mobile Recharge</h1>

            <p>Fast, simple and secure prepaid recharge.</p>

            <div className="ow-trust-points">

              <span><i>✓</i> Secure payment</span>

              <span><i>✓</i> Instant status updates</span>

            </div>

          </div>

          <div className="ow-recharge-hero-art" aria-hidden="true">

            <span className="ow-hero-orbit orbit-one" />

            <span className="ow-hero-orbit orbit-two" />

            <div className="ow-hero-phone">

              <span className="ow-phone-speaker" />

              <span className="ow-phone-signal">▮▮▮</span>

              <span className="ow-phone-check">✓</span>

              <small>Recharge<br />made easy</small>

            </div>

            <span className="ow-hero-spark">✦</span>

          </div>

        </header>

        <nav className="ow-recharge-tabs" aria-label="Recharge navigation">

          <button className={tab === "recharge" ? "active" : ""} onClick={() => setTab("recharge")}>

            <span>＋</span> Recharge

          </button>

          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>

            <span>◷</span> My recharges

            {orders.length > 0 && <em>{orders.length}</em>}

          </button>

        </nav>

        {message && <div className="ow-recharge-alert success"><span>✓</span>{message}<button onClick={() => setMessage("")}>×</button></div>}

        {error && <div className="ow-recharge-alert error"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

        {showLoginPrompt && (
          <div className="ow-recharge-alert error">
            <span>🔐</span>
            <div>
              रिचार्ज करण्यासाठी Login आवश्यक आहे. तुमच्या Wallet मध्ये पुरेशी रक्कम असणे गरजेचे आहे.
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <a href={`/login?redirect=${encodeURIComponent("/mobile-recharge")}`}>Login करा</a>
                <a href={`/signup?redirect=${encodeURIComponent("/mobile-recharge")}`}>नवीन खाते तयार करा</a>
              </div>
            </div>
            <button onClick={() => setShowLoginPrompt(false)}>×</button>
          </div>
        )}

        {walletLow && (
          <div className="ow-recharge-alert error">
            <span>₹</span>
            <div>
              Wallet मध्ये पुरेशी रक्कम नाही.
              <div style={{ marginTop: 8 }}>
                <a href="/wallet/add-money">Wallet मध्ये पैसे Add करा</a>
              </div>
            </div>
          </div>
        )}

        {tab === "recharge" ? (

          <>

            <section className="ow-recharge-card ow-number-card">

              <div className="ow-section-heading">

                <div className="ow-step-number">01</div>

                <div>

                  <h2>Enter mobile number</h2>

                  <p>We’ll automatically detect your operator and circle.</p>

                </div>

              </div>

              <form className="ow-mobile-form" onSubmit={getPlans}>

                <div className="ow-input-prefix">🇮🇳 <span>+91</span></div>

                <input

                  value={mobile}

                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}

                  placeholder="Enter 10-digit mobile number"

                  inputMode="numeric"

                  autoComplete="tel-national"

                  maxLength={10}

                  aria-label="Mobile number"

                />

                {mobile.length > 0 && (

                  <button className="ow-clear-number" type="button" onClick={() => { setMobile(""); setPlansData(null); setSelectedPlan(null); }} aria-label="Clear number">×</button>

                )}

                <button className="ow-view-plans-btn" type="submit" disabled={plansLoading || mobile.length !== 10}>

                  {plansLoading ? <><span className="ow-btn-spinner" /> Finding</> : "View plans"}

                  {!plansLoading && <span>→</span>}

                </button>

              </form>

              <div className="ow-number-hint"><span>🔒</span> Your number is used only to fetch available recharge plans.</div>

            </section>

            {plansData && (

              <section className="ow-operator-card">

                <div className={`ow-operator-logo ${String(plansData.operator || "").toLowerCase().replace(/[^a-z]/g, "")}`}>

                  {getOperatorMark(plansData.operator)}

                </div>

                <div className="ow-operator-details">

                  <strong>{plansData.operator || "Operator detected"}</strong>

                  <span>{plansData.circle || "Circle unavailable"} <b>•</b> +91 {mobile}</span>

                </div>

                <span className="ow-detected-pill"><i>✓</i> Verified</span>

              </section>

            )}

            {plansData?.plans?.length > 0 && (

              <section className="ow-plans-section" ref={plansSectionRef}>

                <div className="ow-plans-title">

                  <div>

                    <div className="ow-section-kicker">02 • CHOOSE YOUR PLAN</div>

                    <h2>Browse recharge plans</h2>

                    <p>{filteredPlans.length} matching plans <span>•</span> Prices shown before wallet payment</p>

                  </div>

                  <span className="ow-plan-count">{plansData.plans.length} plans</span>

                </div>

                <div className="ow-plan-tools">

                  <label className="ow-plan-search">

                    <span>⌕</span>

                    <input

                      value={planSearch}

                      onChange={(event) => setPlanSearch(event.target.value)}

                      placeholder="Search amount, data, validity..."

                      aria-label="Search plans by amount or details"

                    />

                    {planSearch && <button type="button" onClick={() => setPlanSearch("")} aria-label="Clear search">×</button>}

                  </label>

                  <label className="ow-sort-control">

                    <span>Sort:</span>

                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>

                      <option value="recommended">Recommended</option>

                      <option value="price-low">Price: Low to high</option>

                      <option value="price-high">Price: High to low</option>

                      <option value="validity">Longest validity</option>

                    </select>

                  </label>

                </div>

                <div className="ow-category-filters" role="group" aria-label="Filter plans">

                  {categoryLabels.map((category) => (

                    <button

                      type="button"

                      key={category.id}

                      className={activeCategory === category.id ? "active" : ""}

                      onClick={() => { setActiveCategory(category.id); setShowAllPlans(false); }}

                    >

                      {category.label}

                    </button>

                  ))}

                </div>

                <div className="ow-price-range-wrap">
                  <div className="ow-price-range-heading">Filter by price</div>
                  <div className="ow-price-range-filters" role="group" aria-label="Filter plans by price range">
                    <button
                      type="button"
                      className={activePriceRange === "all" ? "active" : ""}
                      onClick={() => { setActivePriceRange("all"); setShowAllPlans(false); }}
                    >
                      All prices
                    </button>
                    {priceRanges.map((range) => (
                      <button
                        type="button"
                        key={range.id}
                        className={activePriceRange === range.id ? "active" : ""}
                        onClick={() => { setActivePriceRange(range.id); setShowAllPlans(false); }}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPlans.length > 0 ? (

                  <>

                    <div className="ow-plan-grid">

                      {visiblePlans.map((plan) => {

                        const isSelected = selectedPlan?._key === plan._key;

                        return (

                          <button

                            type="button"

                            key={plan._key}

                            className={`ow-plan-card ${isSelected ? "selected" : ""}`}

                            onClick={() => setSelectedPlan(plan)}

                            aria-pressed={isSelected}

                          >

                            <div className="ow-plan-card-top">

                              <div>

                                <span className="ow-plan-type">{plan.type || "Prepaid plan"}</span>

                                <strong>{money(plan.amount)}</strong>

                              </div>

                              {isSelected ? <span className="ow-plan-selected-mark">✓</span> : <span className="ow-plan-select-mark">Select</span>}

                            </div>

                            <p className="ow-plan-description">{plan.description || "Prepaid recharge benefits as per operator."}</p>

                            <div className="ow-plan-facts">

                              <span><small>VALIDITY</small><b>{plan.validity ? `${plan.validity} days` : "As per plan"}</b></span>

                              <span><small>TALKTIME</small><b>{plan.talk_time || "Unlimited / N.A."}</b></span>

                            </div>

                            <div className="ow-plan-card-bottom">

                              <span>Pay <b>{money(customerPayable(plan))}</b></span>

                              <small>₹3 OFF</small>

                            </div>

                          </button>

                        );

                      })}

                    </div>

                    {filteredPlans.length > 8 && (

                      <button className="ow-show-more" type="button" onClick={() => setShowAllPlans((value) => !value)}>

                        {showAllPlans ? "Show fewer plans" : `View all ${filteredPlans.length} plans`}

                        <span>{showAllPlans ? "↑" : "↓"}</span>

                      </button>

                    )}

                  </>

                ) : (

                  <div className="ow-no-plans">

                    <span>⌕</span>

                    <strong>No matching plans found</strong>

                    <p>Try another amount, keyword or category.</p>

                    <button onClick={() => { setPlanSearch(""); setActiveCategory("all"); setActivePriceRange("all"); setShowAllPlans(false); }}>Clear filters</button>

                  </div>

                )}

              </section>

            )}

            {selectedPlan && (

              <section className="ow-recharge-summary">

                <div className="ow-summary-heading">

                  <div className="ow-summary-step">03</div>

                  <div><h2>Recharge summary</h2><p>Review your plan before confirming.</p></div>

                  <button type="button" onClick={() => setSelectedPlan(null)} aria-label="Close summary">×</button>

                </div>

                <div className="ow-summary-mobile">

                  <span className="ow-summary-sim">{getOperatorMark(plansData?.operator)}</span>

                  <div><strong>+91 {mobile}</strong><small>{plansData?.operator} • {plansData?.circle}</small></div>

                  <span className="ow-summary-plan">{selectedPlan.type || "Prepaid"}</span>

                </div>

                <div className="ow-summary-lines">

                  <div><span>Plan amount</span><b>{money(selectedPlan.amount)}</b></div>

                  <div><span>OnlineWalaa discount</span><b className="ow-saving">− {money(3)}</b></div>

                  <div className="ow-summary-total"><span>You pay from wallet</span><strong>{money(customerPayable(selectedPlan))}</strong></div>

                </div>

                <button className="ow-confirm-recharge" disabled={submitting} onClick={submitRecharge}>

                  {submitting ? <><span className="ow-btn-spinner" /> Processing recharge...</> : <>Confirm & recharge <span>→</span></>}

                </button>

                <div className="ow-secure-note"><span>🔐</span> Amount will be deducted from your OnlineWalaa wallet. Recharge status will appear in My recharges.</div>

              </section>

            )}

          </>

        ) : (

          <section className="ow-history-card">

            <div className="ow-history-heading">

              <div><div className="ow-section-kicker">YOUR ACTIVITY</div><h2>My recharges</h2><p>Track your recent mobile recharge requests.</p></div>

              <span className="ow-history-total">{orders.length} records</span>

            </div>

            {historyLoading ? (

              <div className="ow-empty">

                <div className="ow-empty-icon">◌</div>

                <strong>Loading recharge history...</strong>

                <p>Please wait while we fetch your mobile recharges.</p>

              </div>

            ) : historyError ? (

              <div className="ow-empty">

                <div className="ow-empty-icon">!</div>

                <strong>Unable to load history</strong>

                <p>{historyError}</p>

              </div>

            ) : orders.length === 0 ? (

              <div className="ow-empty">

                <div className="ow-empty-icon">📱</div>

                <strong>No recharges yet</strong>

                <p>तुमच्या पूर्ण झालेल्या आणि प्रक्रियेत असलेल्या रिचार्जची माहिती येथे दिसेल.</p>

                <button onClick={() => setTab("recharge")}>Start a recharge <span>→</span></button>

              </div>

            ) : (

              <div className="ow-history-list">

                {orders.map((order) => {

                  const state = String(order.status || "pending").toLowerCase();

                  return (

                    <article className="ow-history-row" key={order.id}>

                      <div className="ow-history-sim">{getOperatorMark(order.operator)}</div>

                      <div className="ow-history-main">

                        <strong>{order.operator || "Mobile Recharge"} <span>•</span> +91 {order.mobile}</strong>

                        <div className="ow-history-amounts">

                          <span>Original recharge: <strong>{money(order.amount)}</strong></span>

                          <span>Wallet debited: <strong>{money(order.customerPayable)}</strong></span>

                        </div>

                        <small>{formatDate(order.createdAt)} <i>·</i> Ref: {order.clientRef || order.id}</small>

                        {order.transactionId && <small>Transaction ID: {order.transactionId}</small>}

                        {order.refundStatus === "refunded" && <small className="ow-refund-note">Wallet refund completed</small>}

                      </div>

                      <div className="ow-history-side">

                        <span className={`ow-status ${state}`}>{statusLabel(state)}</span>
                        {["pending", "processing", "unknown"].includes(state) && (
                          <small className="ow-pending-note">
                            तुमचा रिचार्ज प्रक्रियेत आहे. कृपया मोबाईलवर रिचार्ज झाला आहे का ते तपासत राहा. Pending असताना पुन्हा रिचार्ज करू नका.
                          </small>
                        )}

                        {!["success", "failed"].includes(state) && (

                          <button disabled={checkingId === order.id} onClick={() => checkStatus(order)}>

                            {checkingId === order.id ? "Checking..." : "Check status"}

                          </button>

                        )}

                      </div>

                    </article>

                  );

                })}

              </div>

            )}

          </section>

        )}

        <footer className="ow-recharge-footnote">

          <span>🔒</span> Secure recharge powered by OnlineWalaa. Please verify your mobile number before confirming.

        </footer>

      </div>

    </main>

  );

}
