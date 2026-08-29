import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Jobs.css";

const API_URL = "/api/majhinaukri";
const POSTS_PER_PAGE = 10;

const NAV_ITEMS = [
  {
    key: "current",
    label: "वर्तमान भरती:2026",
    icon: "💼",
  },
  {
    key: "mega",
    label: "मेगाभरती",
    icon: "🔥",
  },
  {
    key: "exam",
    label: "परीक्षा",
    icon: "📝",
  },
  {
    key: "hall",
    label: "प्रवेशपत्र",
    icon: "🎟️",
  },
  {
    key: "result",
    label: "निकाल",
    icon: "🏆",
  },
];

const SOURCE_LABELS = {
  current: "वर्तमान भरती:2026",
  mega: "मेगाभरती",
  exam: "परीक्षा",
  hall: "प्रवेशपत्र",
  result: "निकाल",
};

const SOURCE_ICONS = {
  current: "💼",
  mega: "🔥",
  exam: "📝",
  hall: "🎟️",
  result: "🏆",
};

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return cleanText(div.textContent || div.innerText || "");
}

function isCurrentAffairs(job) {
  const names = Array.isArray(job?.categoryNames)
    ? job.categoryNames.join(" ")
    : "";

  const slugs = Array.isArray(job?.categorySlugs)
    ? job.categorySlugs.join(" ")
    : "";

  const value = `${names} ${slugs}`.toLowerCase();

  return (
    value.includes("current-affairs") ||
    value.includes("current affairs") ||
    value.includes("current_affairs") ||
    value.includes("चालू घडामोडी")
  );
}

function safeUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url, window.location.origin);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
}

function formatDate(value) {
  if (!value) return "माहिती उपलब्ध नाही";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("mr-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 1) return [];

  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1
    );
  }

  const pages = [1];

  if (currentPage > 3) {
    pages.push("...");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Jobs() {
  const [activeSource, setActiveSource] = useState("current");

  const [jobs, setJobs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [retryKey, setRetryKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedJob, setSelectedJob] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [activeTab, setActiveTab] = useState("info");

  const requestRef = useRef(0);
  const widgetRef = useRef(null);

  /* =========================================================
     FETCH FEED
  ========================================================= */

  const fetchFeed = useCallback(
    async (source, signal) => {
      const response = await fetch(
        `${API_URL}?source=${encodeURIComponent(source)}`,
        {
          method: "GET",
          signal,
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result?.success || !Array.isArray(result.jobs)) {
        throw new Error(
          result?.error || "Invalid API response"
        );
      }

      return result.jobs;
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    const requestId = ++requestRef.current;

    setLoading(true);
    setError("");
    setJobs([]);

    fetchFeed(activeSource, controller.signal)
      .then((data) => {
        if (requestId !== requestRef.current) return;

        const filtered = data
          .filter(Boolean)
          .filter((job) => !isCurrentAffairs(job));

        setJobs(filtered);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;

        if (requestId !== requestRef.current) return;

        console.error("Jobs API error:", err);

        setError(
          "अपडेट्स लोड करता आले नाहीत. कृपया पुन्हा प्रयत्न करा."
        );

        setJobs([]);
      })
      .finally(() => {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeSource, fetchFeed, retryKey]);

  /* =========================================================
     RESET ON CATEGORY CHANGE
  ========================================================= */

  useEffect(() => {
    setCurrentPage(1);
    setSelectedJob(null);
    setActiveTab("info");
    setDetailsError("");
  }, [activeSource]);

  /* =========================================================
     BODY SCROLL LOCK
  ========================================================= */

  useEffect(() => {
    if (!selectedJob) return undefined;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedJob]);

  /* =========================================================
     PAGINATION
  ========================================================= */

  const totalJobs = jobs.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalJobs / POSTS_PER_PAGE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageJobs = useMemo(() => {
    const start =
      (currentPage - 1) * POSTS_PER_PAGE;

    return jobs.slice(
      start,
      start + POSTS_PER_PAGE
    );
  }, [jobs, currentPage]);

  const pageNumbers = useMemo(
    () =>
      buildPageNumbers(
        currentPage,
        totalPages
      ),
    [currentPage, totalPages]
  );

  /* =========================================================
     CHANGE CATEGORY
  ========================================================= */

  const changeCategory = (source) => {
    if (source === activeSource) return;

    setSelectedJob(null);
    setDetailsError("");
    setCurrentPage(1);
    setActiveSource(source);

    window.setTimeout(() => {
      widgetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 30);
  };

  /* =========================================================
     OPEN DETAILS
  ========================================================= */

  const openModal = async (job) => {
    setSelectedJob(job);
    setActiveTab("info");
    setDetailsError("");

    if (!job?.slug || job?.content) {
      setDetailsLoading(false);
      return;
    }

    setDetailsLoading(true);

    try {
      const response = await fetch(
        `${API_URL}?action=post&slug=${encodeURIComponent(
          job.slug
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Details failed: ${response.status}`
        );
      }

      const result = await response.json();

      if (!result?.success || !result?.job) {
        throw new Error(
          result?.error || "Details unavailable"
        );
      }

      setSelectedJob((previous) => {
        if (
          !previous ||
          previous.slug !== job.slug
        ) {
          return previous;
        }

        return {
          ...previous,
          ...result.job,
        };
      });
    } catch (err) {
      console.error(
        "Job details error:",
        err
      );

      setDetailsError(
        "या अपडेटची अतिरिक्त माहिती सध्या उपलब्ध नाही."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    setSelectedJob(null);
    setDetailsLoading(false);
    setDetailsError("");
    setActiveTab("info");
  };

  /* =========================================================
     KEYBOARD ESC
  ========================================================= */

  useEffect(() => {
    if (!selectedJob) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedJob]);

  /* =========================================================
     PRIMARY ACTION
  ========================================================= */

  const getPrimaryAction = (job) => {
    if (!job) return null;

    if (activeSource === "hall") {
      return {
        label: "🎟️ प्रवेशपत्र",
        href:
          job.applyLink ||
          job.pdfLink ||
          job.officialLink ||
          job.url,
        className: "admit-btn",
      };
    }

    if (activeSource === "result") {
      return {
        label: "🏆 निकाल पाहा",
        href:
          job.applyLink ||
          job.officialLink ||
          job.url,
        className: "result-btn",
      };
    }

    return null;
  };

  const primaryAction =
    getPrimaryAction(selectedJob);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="jobs-widget"
      ref={widgetRef}
    >
      {/* HEADER */}

      <div className="jobs-header">
        <div className="jobs-heading-wrap">
          <h2 className="jobs-title">
            नवीनतम अपडेट्स
          </h2>

          <p className="jobs-subtitle">
            फक्त नवीन आणि संबंधित सरकारी
            नोकरी अपडेट्स
          </p>
        </div>

        <span className="jobs-count-pill">
          {loading
            ? "लोड होत आहे..."
            : `${totalJobs} अपडेट्स`}
        </span>
      </div>

      {/* CATEGORY NAV */}

      <div
        className="jobs-category-wrapper"
        role="tablist"
        aria-label="Job categories"
      >
        <div className="jobs-category-tabs">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={
                activeSource === item.key
              }
              className={`job-cat-btn ${
                activeSource === item.key
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeCategory(item.key)
              }
            >
              <span
                className="job-cat-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE CATEGORY */}

      <div className="active-category-info">
        <div className="active-category-title">
          <span aria-hidden="true">
            {SOURCE_ICONS[activeSource]}
          </span>

          <strong>
            {SOURCE_LABELS[activeSource]}
          </strong>
        </div>

        <span className="active-category-count">
          {loading
            ? "..."
            : `${totalJobs} अपडेट्स`}
        </span>
      </div>

      {/* JOB LIST */}

      <div className="jobs-list">
        {loading ? (
          <div className="jobs-loading">
            <div className="jobs-spinner" />

            <p>
              नवीन अपडेट्स तपासत आहे...
            </p>
          </div>
        ) : error ? (
          <div className="jobs-empty-container">
            <div className="jobs-error-icon">
              !
            </div>

            <p className="jobs-empty">
              {error}
            </p>

            <button
              type="button"
              className="job-retry-btn"
              onClick={() =>
                setRetryKey(
                  (value) => value + 1
                )
              }
            >
              पुन्हा प्रयत्न करा
            </button>
          </div>
        ) : pageJobs.length === 0 ? (
          <div className="jobs-empty-container">
            <div className="jobs-error-icon">
              ✓
            </div>

            <p className="jobs-empty">
              या विभागात सध्या कोणतेही नवीन
              अपडेट्स उपलब्ध नाहीत.
            </p>
          </div>
        ) : (
          pageJobs.map((job, index) => {
            const primary =
              getPrimaryAction(job);

            const safePrimaryUrl =
              safeUrl(primary?.href);

            return (
              <article
                key={
                  job.id ||
                  `${job.slug}-${index}`
                }
                className="saas-job-card fade-in"
                onClick={() =>
                  openModal(job)
                }
              >
                {/* NEW */}

                {job.isNew && (
                  <span className="job-badge-new">
                    नवीन
                  </span>
                )}

                {/* LEFT */}

                <div className="job-left-content">
                  <div className="job-icon-box">
                    {SOURCE_ICONS[
                      activeSource
                    ] || "💼"}
                  </div>

                  <div className="job-info">
                    <h3 className="job-name">
                      {stripHtml(
                        job.title ||
                          "शीर्षक उपलब्ध नाही"
                      )}
                    </h3>

                    {job.categoryNames
                      ?.length > 0 && (
                      <div className="job-card-categories">
                        {job.categoryNames
                          .filter(
                            (name) =>
                              !isCurrentAffairs({
                                categoryNames: [
                                  name,
                                ],
                              })
                          )
                          .slice(0, 2)
                          .map(
                            (
                              categoryName,
                              categoryIndex
                            ) => (
                              <span
                                key={`${job.id}-${categoryIndex}`}
                                className="job-mini-category"
                              >
                                {categoryName}
                              </span>
                            )
                          )}
                      </div>
                    )}

                    <div className="job-last-date">
                      {activeSource ===
                      "hall" ? (
                        <>
                          📅 परीक्षा तारीख:
                          <strong className="highlight-date-small">
                            {job.examDate ||
                              "माहिती उपलब्ध नाही"}
                          </strong>
                        </>
                      ) : activeSource ===
                        "result" ? (
                        <>
                          🏆 निकाल अपडेट:
                          <strong className="highlight-date-small">
                            {formatDate(
                              job.modified ||
                                job.date
                            )}
                          </strong>
                        </>
                      ) : (
                        <>
                          ⏳ शेवटची तारीख:
                          <strong className="highlight-date-small">
                            {job.lastDate ||
                              "माहिती उपलब्ध नाही"}
                          </strong>
                        </>
                      )}
                    </div>

                    {activeSource ===
                      "current" &&
                      job.totalPosts && (
                        <span className="job-card-meta">
                          👥 {job.totalPosts}
                        </span>
                      )}
                  </div>
                </div>

                {/* ACTION */}

                <div className="job-card-actions">
                  {safePrimaryUrl && (
                    <a
                      href={safePrimaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`job-card-primary ${primary.className}`}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      {primary.label}
                    </a>
                  )}

                  <button
                    type="button"
                    className="job-detail-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal(job);
                    }}
                  >
                    पाहा
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* PAGINATION */}

      {!loading &&
        !error &&
        totalPages > 1 && (
          <>
            <div className="jobs-pagination">
              <button
                type="button"
                className="pagination-arrow"
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(1, page - 1)
                  )
                }
                aria-label="Previous page"
              >
                ‹
              </button>

              <div className="pagination-pages">
                {pageNumbers.map(
                  (page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`dots-${index}`}
                          className="pagination-dots"
                        >
                          …
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        type="button"
                        className={`pagination-number ${
                          currentPage === page
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setCurrentPage(
                            page
                          )
                        }
                        aria-label={`Page ${page}`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="pagination-arrow"
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        totalPages,
                        page + 1
                      )
                  )
                }
                aria-label="Next page"
              >
                ›
              </button>
            </div>

            <div className="pagination-info">
              <strong>
                {(currentPage - 1) *
                  POSTS_PER_PAGE +
                  1}
              </strong>

              {" - "}

              <strong>
                {Math.min(
                  currentPage *
                    POSTS_PER_PAGE,
                  totalJobs
                )}
              </strong>

              {" / "}

              <strong>{totalJobs}</strong>

              {" अपडेट्स"}
            </div>
          </>
        )}

      {/* MODAL */}

      {selectedJob && (
        <div
          className="job-modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="job-modal-content">
            {/* MODAL HEADER */}

            <div className="job-modal-header">
              <div className="job-modal-title-box">
                <div className="modal-category-label">
                  {SOURCE_LABELS[
                    activeSource
                  ]}
                </div>

                <h3 className="job-modal-title">
                  {stripHtml(
                    selectedJob.title ||
                      "माहिती उपलब्ध नाही"
                  )}
                </h3>

                <div className="job-modal-tags">
                  {(selectedJob.categoryNames ||
                    [])
                    .filter(
                      (name) =>
                        !isCurrentAffairs({
                          categoryNames: [
                            name,
                          ],
                        })
                    )
                    .slice(0, 3)
                    .map((name, index) => (
                      <span
                        key={`${name}-${index}`}
                        className="modal-tag-pill"
                      >
                        {name}
                      </span>
                    ))}
                </div>
              </div>

              <button
                type="button"
                className="job-modal-close"
                onClick={closeModal}
                aria-label="बंद करा"
              >
                ✕
              </button>
            </div>

            {/* MODAL TABS */}

            <div className="job-modal-tabs">
              <button
                type="button"
                className={`job-tab-btn ${
                  activeTab === "info"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("info")
                }
              >
                📋 माहिती
              </button>

              <button
                type="button"
                className={`job-tab-btn ${
                  activeTab === "links"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("links")
                }
              >
                🔗 महत्त्वाच्या लिंक्स
              </button>
            </div>

            {/* MODAL CONTENT */}

            {detailsLoading ? (
              <div className="jobs-modal-loading">
                <div className="jobs-spinner" />

                <p>
                  माहिती लोड होत आहे...
                </p>
              </div>
            ) : (
              <>
                {detailsError && (
                  <div className="modal-inline-warning">
                    {detailsError}
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="job-modal-body fade-in">
                    <table className="premium-info-table">
                      <tbody>
                        <tr>
                          <td>
                            जाहिरात क्र.
                          </td>
                          <td>
                            <strong>
                              {selectedJob.advtNo ||
                                "माहिती उपलब्ध नाही"}
                            </strong>
                          </td>
                        </tr>

                        <tr>
                          <td>
                            पदाचे नाव
                          </td>
                          <td>
                            {selectedJob.title ||
                              "माहिती उपलब्ध नाही"}
                          </td>
                        </tr>

                        <tr>
                          <td>
                            एकूण पदे
                          </td>
                          <td>
                            <strong>
                              {selectedJob.totalPosts ||
                                "माहिती उपलब्ध नाही"}
                            </strong>
                          </td>
                        </tr>

                        <tr>
                          <td>
                            शैक्षणिक पात्रता
                          </td>
                          <td>
                            {selectedJob.education ||
                              "माहिती उपलब्ध नाही"}
                          </td>
                        </tr>

                        <tr>
                          <td>
                            वयाची अट
                          </td>
                          <td>
                            {selectedJob.ageLimit ||
                              "माहिती उपलब्ध नाही"}
                          </td>
                        </tr>

                        <tr>
                          <td>
                            नोकरी ठिकाण
                          </td>
                          <td>
                            {selectedJob.location ||
                              "माहिती उपलब्ध नाही"}
                          </td>
                        </tr>

                        <tr>
                          <td>
                            {activeSource ===
                            "hall"
                              ? "परीक्षा तारीख"
                              : activeSource ===
                                "result"
                              ? "अपडेट तारीख"
                              : "शेवटची तारीख"}
                          </td>

                          <td>
                            <strong className="highlight-red">
                              {selectedJob.examDate ||
                                selectedJob.lastDate ||
                                formatDate(
                                  selectedJob.modified ||
                                    selectedJob.date
                                )}
                            </strong>
                          </td>
                        </tr>

                        {selectedJob.applyMethod && (
                          <tr>
                            <td>
                              अर्ज पद्धत
                            </td>
                            <td>
                              {
                                selectedJob.applyMethod
                              }
                            </td>
                          </tr>
                        )}

                        {selectedJob.date && (
                          <tr>
                            <td>
                              पोस्ट तारीख
                            </td>
                            <td>
                              {formatDate(
                                selectedJob.date
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {selectedJob.content && (
                      <details className="original-job-details">
                        <summary>
                          मूळ माहिती पाहा
                        </summary>

                        <div
                          className="original-job-content"
                          dangerouslySetInnerHTML={{
                            __html:
                              selectedJob.content,
                          }}
                        />
                      </details>
                    )}

                    {safeUrl(
                      selectedJob.url
                    ) && (
                      <div className="job-source-box">
                        <span>
                          अधिकृत स्रोत
                        </span>

                        <a
                          href={safeUrl(
                            selectedJob.url
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Majhi Naukri ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "links" && (
                  <div className="job-modal-body link-tab-body fade-in">
                    {primaryAction &&
                      safeUrl(
                        primaryAction.href
                      ) && (
                        <div className="action-box highlight-action">
                          <div className="action-text">
                            <h4>
                              {activeSource ===
                              "hall"
                                ? "प्रवेशपत्र"
                                : "निकाल"}
                            </h4>

                            <p>
                              संबंधित अपडेट
                              उघडा
                            </p>
                          </div>

                          <a
                            href={safeUrl(
                              primaryAction.href
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`action-btn ${primaryAction.className}`}
                          >
                            {primaryAction.label}
                          </a>
                        </div>
                      )}

                    {safeUrl(
                      selectedJob.pdfLink
                    ) && (
                      <div className="action-box pdf-box">
                        <div className="action-text">
                          <h4>
                            अधिकृत जाहिरात
                          </h4>

                          <p>
                            PDF जाहिरात
                            पाहा
                          </p>
                        </div>

                        <a
                          href={safeUrl(
                            selectedJob.pdfLink
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn pdf-btn"
                        >
                          📄 PDF
                        </a>
                      </div>
                    )}

                    {safeUrl(
                      selectedJob.applyLink
                    ) && (
                      <div className="action-box apply-box">
                        <div className="action-text">
                          <h4>
                            ऑनलाइन अर्ज
                          </h4>

                          <p>
                            अधिकृत अर्ज
                            लिंक
                          </p>
                        </div>

                        <a
                          href={safeUrl(
                            selectedJob.applyLink
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn apply-btn"
                        >
                          🌐 अर्ज करा
                        </a>
                      </div>
                    )}

                    {safeUrl(
                      selectedJob.officialLink
                    ) && (
                      <div className="action-box official-box">
                        <div className="action-text">
                          <h4>
                            अधिकृत वेबसाइट
                          </h4>

                          <p>
                            संबंधित संस्थेची
                            वेबसाइट
                          </p>
                        </div>

                        <a
                          href={safeUrl(
                            selectedJob.officialLink
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn official-btn"
                        >
                          🌐 वेबसाइट
                        </a>
                      </div>
                    )}

                    {safeUrl(
                      selectedJob.url
                    ) && (
                      <div className="action-box source-box">
                        <div className="action-text">
                          <h4>
                            पूर्ण माहिती
                          </h4>

                          <p>
                            मूळ पोस्ट
                            उघडा
                          </p>
                        </div>

                        <a
                          href={safeUrl(
                            selectedJob.url
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn source-btn"
                        >
                          🔗 पोस्ट
                        </a>
                      </div>
                    )}

                    {!safeUrl(
                      selectedJob.pdfLink
                    ) &&
                      !safeUrl(
                        selectedJob.applyLink
                      ) &&
                      !safeUrl(
                        selectedJob.officialLink
                      ) &&
                      !safeUrl(
                        selectedJob.url
                      ) && (
                        <div className="link-not-found">
                          या अपडेटसाठी सध्या
                          कोणतीही अतिरिक्त लिंक
                          उपलब्ध नाही.
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}