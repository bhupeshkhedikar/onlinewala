import React, { useEffect, useMemo, useState } from "react";
import "./AgeCalculator.css";

/* =========================================================
   DATE HELPERS
========================================================= */

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString) => {
  if (!dateString) return null;

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
};

const startOfDay = (date) => {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  return d;
};

const DAY_MS = 1000 * 60 * 60 * 24;

/* =========================================================
   MARATHI DAY NAMES
========================================================= */

const dayNames = [
  "रविवार",
  "सोमवार",
  "मंगळवार",
  "बुधवार",
  "गुरुवार",
  "शुक्रवार",
  "शनिवार"
];

/* =========================================================
   COMPONENT
========================================================= */

export default function AgeCalculator() {
  const todayString = useMemo(
    () => getLocalDateString(),
    []
  );

  const [dob, setDob] = useState("");
  const [targetDate, setTargetDate] =
    useState(todayString);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /* =======================================================
     CALCULATE AGE
  ======================================================= */

  const calculateAge = () => {
    setError("");

    if (!dob) {
      setError("कृपया जन्मतारीख निवडा.");
      setResult(null);
      return;
    }

    if (!targetDate) {
      setError("कृपया गणनेसाठी तारीख निवडा.");
      setResult(null);
      return;
    }

    const birthDate = parseLocalDate(dob);
    const target = parseLocalDate(targetDate);

    if (!birthDate || !target) {
      setError("कृपया योग्य तारीख निवडा.");
      setResult(null);
      return;
    }

    if (birthDate > target) {
      setError(
        "जन्मतारीख 'या तारखेपर्यंत' तारखेपेक्षा पुढची असू शकत नाही."
      );

      setResult(null);
      return;
    }

    /* =====================================================
       EXACT AGE
    ===================================================== */

    let years =
      target.getFullYear() -
      birthDate.getFullYear();

    let months =
      target.getMonth() -
      birthDate.getMonth();

    let days =
      target.getDate() -
      birthDate.getDate();

    if (days < 0) {
      months--;

      const previousMonth = new Date(
        target.getFullYear(),
        target.getMonth(),
        0
      );

      days += previousMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    /* =====================================================
       TOTAL DIFFERENCE
    ===================================================== */

    const birthStart = startOfDay(birthDate);
    const targetStart = startOfDay(target);

    const diffTime =
      targetStart.getTime() -
      birthStart.getTime();

    const totalDays =
      Math.floor(diffTime / DAY_MS);

    const totalWeeks =
      Math.floor(totalDays / 7);

    const totalMonths =
      years * 12 + months;

    const totalHours =
      totalDays * 24;

    const totalMinutes =
      totalHours * 60;

    const totalSeconds =
      totalMinutes * 60;

    /* =====================================================
       BIRTH DATE INFORMATION
    ===================================================== */

    const birthDayOfWeek =
      dayNames[birthDate.getDay()];

    const targetDayOfWeek =
      dayNames[target.getDay()];

    /* =====================================================
       NEXT BIRTHDAY
    ===================================================== */

    let nextBirthdayYear =
      target.getFullYear();

    let nextBirthday = new Date(
      nextBirthdayYear,
      birthDate.getMonth(),
      birthDate.getDate()
    );

    /*
      Special handling for Feb 29.
      If current/target year isn't leap year,
      use Feb 28.
    */

    if (
      birthDate.getMonth() === 1 &&
      birthDate.getDate() === 29 &&
      nextBirthday.getMonth() !== 1
    ) {
      nextBirthday = new Date(
        nextBirthdayYear,
        1,
        28
      );
    }

    if (nextBirthday < targetStart) {
      nextBirthdayYear++;

      nextBirthday = new Date(
        nextBirthdayYear,
        birthDate.getMonth(),
        birthDate.getDate()
      );

      if (
        birthDate.getMonth() === 1 &&
        birthDate.getDate() === 29 &&
        nextBirthday.getMonth() !== 1
      ) {
        nextBirthday = new Date(
          nextBirthdayYear,
          1,
          28
        );
      }
    }

    const daysToNextBday = Math.max(
      0,
      Math.ceil(
        (startOfDay(nextBirthday).getTime() -
          targetStart.getTime()) /
          DAY_MS
      )
    );

    const isBirthdayToday =
      nextBirthday.getMonth() ===
        target.getMonth() &&
      nextBirthday.getDate() ===
        target.getDate();

    const nextBdayDayOfWeek =
      dayNames[nextBirthday.getDay()];

    /* =====================================================
       NEXT BIRTHDAY AGE
    ===================================================== */

    const nextBirthdayAge =
      nextBirthday.getFullYear() -
      birthDate.getFullYear();

    /* =====================================================
       YEAR PROGRESS
    ===================================================== */

    const yearStart = new Date(
      target.getFullYear(),
      0,
      1
    );

    const nextYearStart = new Date(
      target.getFullYear() + 1,
      0,
      1
    );

    const daysPassedThisYear =
      Math.floor(
        (targetStart.getTime() -
          startOfDay(yearStart).getTime()) /
          DAY_MS
      );

    const totalDaysThisYear =
      Math.floor(
        (startOfDay(nextYearStart).getTime() -
          startOfDay(yearStart).getTime()) /
          DAY_MS
      );

    const yearProgress = Math.min(
      100,
      Math.max(
        0,
        (daysPassedThisYear /
          totalDaysThisYear) *
          100
      )
    );

    /* =====================================================
       SET RESULT
    ===================================================== */

    setResult({
      years,
      months,
      days,

      totalMonths,
      totalWeeks,
      totalDays,
      totalHours,
      totalMinutes,
      totalSeconds,

      birthDayOfWeek,
      targetDayOfWeek,

      daysToNextBday,
      nextBdayDayOfWeek,

      nextBirthdayAge,

      isBirthdayToday,

      yearProgress
    });
  };

  /* =======================================================
     AUTO CALCULATE
  ======================================================= */

  useEffect(() => {
    if (dob && targetDate) {
      calculateAge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, targetDate]);

  /* =======================================================
     RESET
  ======================================================= */

  const resetCalculator = () => {
    setDob("");
    setTargetDate(todayString);
    setResult(null);
    setError("");
  };

  /* =======================================================
     SET TODAY
  ======================================================= */

  const setToday = () => {
    setTargetDate(
      getLocalDateString()
    );

    setError("");
  };

  /* =======================================================
     FORMAT NUMBER
  ======================================================= */

  const formatNumber = (number) => {
    return Number(number).toLocaleString(
      "en-IN"
    );
  };

  /* =======================================================
     FORMAT DOB
  ======================================================= */

  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date =
      parseLocalDate(dateString);

    if (!date) return "";

    return date.toLocaleDateString(
      "mr-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="ac-wrapper">

      <div className="ac-card">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="ac-header">

          <div className="ac-icon-wrap">

            <div className="ac-icon">
              🧮
            </div>

            <span className="ac-icon-glow" />

          </div>

          <div className="ac-header-text">

            <div className="ac-title-row">

              <h2 className="ac-title">
                वय कॅल्क्युलेटर
              </h2>

              <span className="ac-badge">
                FREE
              </span>

            </div>

            <p className="ac-subtitle">
              तुमचे अचूक वय काही सेकंदात मोजा
            </p>

          </div>

        </div>


        {/* =================================================
            INPUT SECTION
        ================================================= */}

        <div className="ac-input-section">

          {/* DOB */}

          <div className="ac-input-group">

            <label>
              <span className="ac-label-icon">
                🎂
              </span>

              जन्मतारीख
            </label>

            <div className="ac-input-wrap">

              <input
                type="date"
                value={dob}
                max={targetDate}
                onChange={(e) => {
                  setDob(e.target.value);
                  setError("");
                }}
                aria-label="जन्मतारीख"
              />

              {dob && (
                <button
                  type="button"
                  className="ac-clear-input"
                  onClick={() => {
                    setDob("");
                    setResult(null);
                  }}
                  aria-label="Clear birth date"
                >
                  ×
                </button>
              )}

            </div>

            {dob && (
              <span className="ac-date-preview">
                {formatDate(dob)}
              </span>
            )}

          </div>


          {/* TARGET DATE */}

          <div className="ac-input-group">

            <label>
              <span className="ac-label-icon">
                📅
              </span>

              या तारखेपर्यंत
            </label>

            <div className="ac-input-wrap">

              <input
                type="date"
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(
                    e.target.value
                  );
                  setError("");
                }}
                aria-label="या तारखेपर्यंत"
              />

            </div>

            <button
              type="button"
              className="ac-today-btn"
              onClick={setToday}
            >
              आजची तारीख
            </button>

          </div>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="ac-error"
            role="alert"
          >
            <span className="ac-error-icon">
              !
            </span>

            <span>
              {error}
            </span>
          </div>
        )}


        {/* =================================================
            ACTION BUTTONS
        ================================================= */}

        <div className="ac-actions">

          <button
            className="ac-btn-calc"
            onClick={calculateAge}
          >
            <span className="ac-btn-icon">
              ✨
            </span>

            वय काढा

            <span className="ac-btn-arrow">
              →
            </span>
          </button>

          <button
            type="button"
            className="ac-reset-btn"
            onClick={resetCalculator}
          >
            ↻
            <span>
              Reset
            </span>
          </button>

        </div>


        {/* =================================================
            RESULTS
        ================================================= */}

        {result && (
          <div className="ac-results-container fade-in">

            {/* =============================================
                BIRTHDAY ALERT
            ============================================= */}

            {result.isBirthdayToday && (
              <div className="ac-birthday-alert">

                <div className="ac-birthday-confetti">
                  🎉
                </div>

                <div>
                  <strong>
                    वाढदिवसाच्या हार्दिक शुभेच्छा! 🎂
                  </strong>

                  <span>
                    आज तुमचा {result.years} वा वाढदिवस आहे.
                  </span>
                </div>

              </div>
            )}


            {/* =============================================
                RESULT HEADER
            ============================================= */}

            <div className="ac-result-heading">

              <div>

                <span className="ac-result-kicker">
                  तुमचे अचूक वय
                </span>

                <h3>
                  Age Result
                </h3>

              </div>

              <div className="ac-result-check">
                ✓
              </div>

            </div>


            {/* =============================================
                EXACT AGE
            ============================================= */}

            <div className="ac-age-display">

              <div className="ac-age-box">

                <span className="ac-age-num">
                  {result.years}
                </span>

                <span className="ac-age-lbl">
                  वर्षे
                </span>

              </div>

              <span className="ac-age-separator">
                •
              </span>

              <div className="ac-age-box">

                <span className="ac-age-num">
                  {result.months}
                </span>

                <span className="ac-age-lbl">
                  महिने
                </span>

              </div>

              <span className="ac-age-separator">
                •
              </span>

              <div className="ac-age-box">

                <span className="ac-age-num">
                  {result.days}
                </span>

                <span className="ac-age-lbl">
                  दिवस
                </span>

              </div>

            </div>


            {/* =============================================
                DATE SUMMARY
            ============================================= */}

            <div className="ac-date-summary">

              <div className="ac-summary-item">

                <span>
                  🎂 जन्म
                </span>

                <strong>
                  {formatDate(dob)}
                </strong>

              </div>

              <div className="ac-summary-arrow">
                →
              </div>

              <div className="ac-summary-item">

                <span>
                  📅 गणना
                </span>

                <strong>
                  {formatDate(targetDate)}
                </strong>

              </div>

            </div>


            {/* =============================================
                EXTRA STATS
            ============================================= */}

            <div className="ac-stats-title">
              <span>
                📊
              </span>

              जीवनाचा एकूण कालावधी
            </div>

            <div className="ac-stats-grid">

              <div className="ac-stat-box ac-stat-blue">
                <span className="ac-stat-icon">
                  🗓️
                </span>

                <span className="ac-stat-lbl">
                  एकूण महिने
                </span>

                <span className="ac-stat-val">
                  {formatNumber(
                    result.totalMonths
                  )}
                </span>
              </div>


              <div className="ac-stat-box ac-stat-purple">
                <span className="ac-stat-icon">
                  📆
                </span>

                <span className="ac-stat-lbl">
                  एकूण आठवडे
                </span>

                <span className="ac-stat-val">
                  {formatNumber(
                    result.totalWeeks
                  )}
                </span>
              </div>


              <div className="ac-stat-box ac-stat-green">
                <span className="ac-stat-icon">
                  ☀️
                </span>

                <span className="ac-stat-lbl">
                  एकूण दिवस
                </span>

                <span className="ac-stat-val">
                  {formatNumber(
                    result.totalDays
                  )}
                </span>
              </div>


              <div className="ac-stat-box ac-stat-orange">
                <span className="ac-stat-icon">
                  ⏰
                </span>

                <span className="ac-stat-lbl">
                  एकूण तास
                </span>

                <span className="ac-stat-val">
                  {formatNumber(
                    result.totalHours
                  )}
                </span>
              </div>


              <div className="ac-stat-box ac-stat-pink">
                <span className="ac-stat-icon">
                  ⏱️
                </span>

                <span className="ac-stat-lbl">
                  एकूण मिनिटे
                </span>

                <span className="ac-stat-val">
                  {formatNumber(
                    result.totalMinutes
                  )}
                </span>
              </div>


              <div className="ac-stat-box ac-stat-cyan">
                <span className="ac-stat-icon">
                  ⚡
                </span>

                <span className="ac-stat-lbl">
                  एकूण सेकंद
                </span>

                <span className="ac-stat-val">
                  {formatNumber(
                    result.totalSeconds
                  )}
                </span>
              </div>

            </div>


            {/* =============================================
                DAY INFORMATION
            ============================================= */}

            <div className="ac-day-info">

              <div className="ac-day-card">

                <span className="ac-day-icon">
                  🎂
                </span>

                <div>

                  <span>
                    जन्माचा वार
                  </span>

                  <strong>
                    {result.birthDayOfWeek}
                  </strong>

                </div>

              </div>


              <div className="ac-day-card">

                <span className="ac-day-icon">
                  📅
                </span>

                <div>

                  <span>
                    गणना तारखेचा वार
                  </span>

                  <strong>
                    {result.targetDayOfWeek}
                  </strong>

                </div>

              </div>

            </div>


            {/* =============================================
                NEXT BIRTHDAY
            ============================================= */}

            <div className="ac-next-bday-card">

              <div className="ac-nb-icon">
                🎂
              </div>

              <div className="ac-nb-details">

                <span className="ac-nb-small">
                  पुढचा वाढदिवस
                </span>

                <h4>

                  {result.daysToNextBday ===
                  0 ? (
                    "आजच! 🎉"
                  ) : (
                    <>
                      <strong>
                        {formatNumber(
                          result.daysToNextBday
                        )}
                      </strong>

                      {" "}दिवसांत
                    </>
                  )}

                </h4>

                <p>
                  {result.nextBdayDayOfWeek}
                  {" • "}
                  {result.nextBirthdayAge} वा वाढदिवस
                </p>

              </div>

              <div className="ac-nb-arrow">
                →
              </div>

            </div>


            {/* =============================================
                YEAR PROGRESS
            ============================================= */}

            <div className="ac-year-progress">

              <div className="ac-progress-header">

                <span>
                  📈 चालू वर्षाची प्रगती
                </span>

                <strong>
                  {result.yearProgress.toFixed(1)}%
                </strong>

              </div>

              <div className="ac-progress-track">

                <div
                  className="ac-progress-bar"
                  style={{
                    width: `${result.yearProgress}%`
                  }}
                />

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}