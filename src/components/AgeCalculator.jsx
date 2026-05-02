import React, { useState, useEffect } from "react";
import "./AgeCalculator.css";

export default function AgeCalculator() {
  const [dob, setDob] = useState("");
  const [targetDate, setTargetDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; 
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const calculateAge = () => {
    if (!dob) {
      setError("कृपया जन्मतारीख निवडा.");
      setResult(null);
      return;
    }

    const birthDate = new Date(dob);
    const target = new Date(targetDate);

    if (birthDate > target) {
      setError("जन्मतारीख भविष्यातील असू शकत नाही!");
      setResult(null);
      return;
    }

    setError("");

    let years = target.getFullYear() - birthDate.getFullYear();
    let months = target.getMonth() - birthDate.getMonth();
    let days = target.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const diffTime = Math.abs(target - birthDate);
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = years * 12 + months;
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;

    let nextBday = new Date(target.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    if (nextBday < today) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffNextBday = nextBday - today;
    const daysToNextBday = Math.ceil(diffNextBday / (1000 * 60 * 60 * 24));

    // 🔥 दिवसांची नावे मराठीत
    const dayNames = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
    const nextBdayDayOfWeek = dayNames[nextBday.getDay()];

    setResult({
      years, months, days,
      totalMonths, totalWeeks, totalDays, totalHours, totalMinutes,
      daysToNextBday, nextBdayDayOfWeek
    });
  };

  useEffect(() => {
    if (result && dob && targetDate) {
      calculateAge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, targetDate]);

  return (
    <div className="ac-wrapper">
      <div className="ac-card">
        
        {/* Header */}
        <div className="ac-header">
          <div className="ac-icon">🧮</div>
          <div className="ac-header-text">
            <h2 className="ac-title">वय कॅल्क्युलेटर</h2>
            <p className="ac-subtitle">अचूक वय, दिवस आणि पुढचा वाढदिवस</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="ac-input-grid">
          <div className="ac-input-group">
            <label>जन्मतारीख</label>
            <input 
              type="date" 
              value={dob} 
              onChange={(e) => setDob(e.target.value)} 
              max={targetDate}
            />
          </div>
          <div className="ac-input-group">
            <label>या तारखेपर्यंत</label>
            <input 
              type="date" 
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)} 
            />
          </div>
        </div>

        {error && <div className="ac-error">{error}</div>}

        <button className="ac-btn-calc" onClick={calculateAge}>
          वय काढा
        </button>

        {/* Results */}
        {result && (
          <div className="ac-results-container fade-in">
            
            {/* Exact Age */}
            <div className="ac-age-display">
              <div className="ac-age-box">
                <span className="ac-age-num">{result.years}</span>
                <span className="ac-age-lbl">वर्षे</span>
              </div>
              <div className="ac-age-box">
                <span className="ac-age-num">{result.months}</span>
                <span className="ac-age-lbl">महिने</span>
              </div>
              <div className="ac-age-box">
                <span className="ac-age-num">{result.days}</span>
                <span className="ac-age-lbl">दिवस</span>
              </div>
            </div>

            {/* Extra Details Grid */}
            <div className="ac-stats-grid">
              <div className="ac-stat-box">
                <span className="ac-stat-lbl">महिने</span>
                <span className="ac-stat-val">{result.totalMonths.toLocaleString()}</span>
              </div>
              <div className="ac-stat-box">
                <span className="ac-stat-lbl">आठवडे</span>
                <span className="ac-stat-val">{result.totalWeeks.toLocaleString()}</span>
              </div>
              <div className="ac-stat-box">
                <span className="ac-stat-lbl">दिवस</span>
                <span className="ac-stat-val">{result.totalDays.toLocaleString()}</span>
              </div>
              <div className="ac-stat-box">
                <span className="ac-stat-lbl">तास</span>
                <span className="ac-stat-val">{result.totalHours.toLocaleString()}</span>
              </div>
            </div>

            {/* Next Birthday Card */}
            <div className="ac-next-bday-card">
              <div className="ac-nb-icon">🎂</div>
              <div className="ac-nb-details">
                <h4>पुढचा वाढदिवस <strong>{result.daysToNextBday} दिवसांत</strong></h4>
                <p>वार: {result.nextBdayDayOfWeek}</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}