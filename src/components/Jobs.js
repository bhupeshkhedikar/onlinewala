import { useState, useEffect, useMemo } from "react";
import "./Jobs.css";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  "https://majhinaukri.in/wp-json/wp/v2/posts";

/* ONLY FOR प्रवेशपत्र */
const PAGES_API =
  "https://majhinaukri.in/wp-json/wp/v2/pages";

const FETCH_LIMIT = 100;
const POSTS_PER_PAGE = 10;

/* =========================================================
   WEBSITE CATEGORIES
========================================================= */

const CATEGORY_CONFIG = [
  {
    key: "all",
    label: "सर्व अपडेट्स",
    icon: "💼",
  },
  {
    key: "current-recruitment",
    label: "वर्तमान भरती",
    icon: "💼",
  },
  {
    key: "mega-bharti",
    label: "मेगाभरती",
    icon: "🔥",
  },
  {
    key: "examination",
    label: "परीक्षा",
    icon: "📝",
  },
  {
    key: "hall-ticket",
    label: "प्रवेशपत्र",
    icon: "🎟️",
  },
  {
    key: "result",
    label: "निकाल",
    icon: "🏆",
  },
];

/* =========================================================
   HINGLISH SEARCH ALIASES
========================================================= */

const SEARCH_ALIASES = {
  bharti: [
    "भरती",
    "भरती",
    "recruitment",
    "job",
    "jobs",
    "नोकरी",
  ],

  bharati: [
    "भरती",
    "recruitment",
    "job",
    "jobs",
    "नोकरी",
  ],

  naukri: [
    "नोकरी",
    "भरती",
    "recruitment",
    "job",
    "jobs",
  ],

  job: [
    "नोकरी",
    "भरती",
    "recruitment",
  ],

  jobs: [
    "नोकरी",
    "भरती",
    "recruitment",
  ],

  recruitment: [
    "वर्तमान भरती",
    "चालू भरती",
    "भरती",
    "recruitment",
  ],

  current: [
    "वर्तमान भरती",
    "चालू भरती",
    "current recruitment",
  ],

  currentrecruitment: [
    "वर्तमान भरती",
    "चालू भरती",
    "current recruitment",
  ],

  pariksha: [
    "परीक्षा",
    "exam",
    "examination",
  ],

  परीक्षा: [
    "परीक्षा",
    "exam",
    "examination",
  ],

  exam: [
    "परीक्षा",
    "examination",
    "exam",
    "pariksha",
  ],

  examination: [
    "परीक्षा",
    "examination",
    "exam",
  ],

  praveshpatra: [
    "प्रवेशपत्र",
    "hall ticket",
    "admit card",
    "हॉल तिकीट",
    "हॉल टिकट",
  ],

  praveshpatr: [
    "प्रवेशपत्र",
    "hall ticket",
    "admit card",
  ],

  admit: [
    "प्रवेशपत्र",
    "admit card",
    "hall ticket",
  ],

  admitcard: [
    "प्रवेशपत्र",
    "admit card",
    "hall ticket",
  ],

  "admit card": [
    "प्रवेशपत्र",
    "admit card",
    "hall ticket",
  ],

  hall: [
    "प्रवेशपत्र",
    "hall ticket",
    "admit card",
  ],

  hallticket: [
    "प्रवेशपत्र",
    "hall ticket",
    "admit card",
  ],

  "hall ticket": [
    "प्रवेशपत्र",
    "hall ticket",
    "admit card",
  ],

  result: [
    "निकाल",
    "रिझल्ट",
    "result",
  ],

  results: [
    "निकाल",
    "रिझल्ट",
    "result",
  ],

  nikal: [
    "निकाल",
    "रिझल्ट",
    "result",
  ],

  निकाल: [
    "निकाल",
    "result",
    "रिझल्ट",
  ],

  answer: [
    "answer key",
    "उत्तर",
    "निकाल",
  ],

  answerkey: [
    "answer key",
    "उत्तर",
    "निकाल",
  ],

  "answer key": [
    "answer key",
    "उत्तर",
    "निकाल",
  ],

  mega: [
    "मेगाभरती",
    "मेगा भरती",
    "mega bharti",
  ],

  megabharti: [
    "मेगाभरती",
    "मेगा भरती",
    "mega bharti",
  ],

  "mega bharti": [
    "मेगाभरती",
    "मेगा भरती",
    "mega bharti",
  ],
};

/* =========================================================
   TEXT NORMALIZATION
========================================================= */

const normalizeText = (value = "") => {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[_\s]+/g, "-")
    .trim();
};

const normalizeSearchText = (value = "") => {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[|,.:;!?()[\]{}_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/* =========================================================
   CURRENT AFFAIRS BLOCK
========================================================= */

const isCurrentAffairs = (
  name = "",
  slug = ""
) => {
  const n = normalizeText(name);
  const s = normalizeText(slug);

  return (
    n.includes("current-affairs") ||
    s.includes("current-affairs") ||
    n.includes("currentaffairs") ||
    s.includes("currentaffairs") ||
    name.includes("चालू घडामोडी") ||
    name.includes("चालू-घडामोडी") ||
    name.includes("चालूघडामोडी")
  );
};

/* =========================================================
   CATEGORY DETECTION
========================================================= */

const detectCategoryFromTerm = (
  name = "",
  slug = ""
) => {
  const n = normalizeText(name);
  const s = normalizeText(slug);

  /* NEVER SHOW CURRENT AFFAIRS */
  if (isCurrentAffairs(name, slug)) {
    return null;
  }

  /* -------------------------------------------------------
     HALL TICKET / ADMIT CARD
  ------------------------------------------------------- */

  if (
    n.includes("hall-ticket") ||
    s.includes("hall-ticket") ||
    n.includes("hallticket") ||
    s.includes("hallticket") ||
    n.includes("admit-card") ||
    s.includes("admit-card") ||
    n.includes("admitcard") ||
    s.includes("admitcard") ||
    name.includes("प्रवेशपत्र") ||
    name.includes("हॉल तिकीट") ||
    name.includes("हॉल टिकट")
  ) {
    return "hall-ticket";
  }

  /* -------------------------------------------------------
     RESULT / ANSWER KEY
  ------------------------------------------------------- */

  if (
    n === "result" ||
    s === "result" ||
    n.includes("result") ||
    s.includes("result") ||
    n.includes("exam-result") ||
    s.includes("exam-result") ||
    n.includes("examresult") ||
    s.includes("examresult") ||
    n.includes("answer-key") ||
    s.includes("answer-key") ||
    n.includes("answerkey") ||
    s.includes("answerkey") ||
    name.includes("निकाल") ||
    name.includes("रिझल्ट") ||
    name.toLowerCase().includes("result") ||
    name.toLowerCase().includes("answer key")
  ) {
    return "result";
  }

  /* -------------------------------------------------------
     EXAMINATION
  ------------------------------------------------------- */

  if (
    n === "examination" ||
    s === "examination" ||
    n === "exam" ||
    s === "exam" ||
    n.includes("examination") ||
    s.includes("examination") ||
    name.includes("परीक्षा")
  ) {
    return "examination";
  }

  /* -------------------------------------------------------
     MEGA BHARTI
  ------------------------------------------------------- */

  if (
    n.includes("mega-bharti") ||
    s.includes("mega-bharti") ||
    n.includes("mega-recruitment") ||
    s.includes("mega-recruitment") ||
    n.includes("megabharti") ||
    s.includes("megabharti") ||
    name.includes("मेगाभरती") ||
    name.includes("मेगा भरती")
  ) {
    return "mega-bharti";
  }

  /* -------------------------------------------------------
     CURRENT RECRUITMENT
  ------------------------------------------------------- */

  if (
    n.includes("current-recruitment") ||
    s.includes("current-recruitment") ||
    n.includes("currentrecruitment") ||
    s.includes("currentrecruitment") ||
    n === "recruitment" ||
    s === "recruitment" ||
    n.includes("recruitment") ||
    s.includes("recruitment") ||
    name.includes("वर्तमान भरती") ||
    name.includes("चालू भरती") ||
    name.includes("भरती")
  ) {
    return "current-recruitment";
  }

  return null;
};

/* =========================================================
   DATE PARSER
========================================================= */

const parseDateFromText = (value = "") => {
  if (!value) return null;

  const numericMatch = String(value).match(
    /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/
  );

  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const monthMatch = String(value).match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)[,\s]+(20\d{2})/i
  );

  if (monthMatch) {
    const date = new Date(
      `${monthMatch[2]} ${monthMatch[1]}, ${monthMatch[3]}`
    );

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

/* =========================================================
   EXPIRED CHECK
========================================================= */

const isExpired = (dateText = "") => {
  const date = parseDateFromText(dateText);

  if (!date) return false;

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date < today;
};

/* =========================================================
   SEARCH VARIANTS
========================================================= */

const getSearchVariants = (
  value = ""
) => {
  const normalized =
    normalizeSearchText(value);

  if (!normalized) return [];

  const variants = new Set();

  variants.add(normalized);

  const compact = normalized.replace(
    /\s+/g,
    ""
  );

  variants.add(compact);

  Object.entries(
    SEARCH_ALIASES
  ).forEach(
    ([key, aliases]) => {
      const normalizedKey =
        normalizeSearchText(key);

      if (
        normalized === normalizedKey ||
        compact ===
        normalizedKey.replace(
          /\s+/g,
          ""
        ) ||
        normalized.includes(
          normalizedKey
        )
      ) {
        aliases.forEach(
          (alias) => {
            const normalizedAlias =
              normalizeSearchText(
                alias
              );

            if (normalizedAlias) {
              variants.add(
                normalizedAlias
              );
            }
          }
        );
      }
    }
  );

  return Array.from(
    variants
  ).filter(Boolean);
};

/* =========================================================
   SEARCH JOB
========================================================= */

const jobMatchesSearch = (
  job,
  query = ""
) => {
  const normalizedQuery =
    normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const searchableText =
    normalizeSearchText(
      [
        job?.title,
        job?.excerpt,
        job?.fullText,
        job?.categoryLabel,
        ...(job?.categoryNames || []),
        ...(job?.tagNames || []),
      ]
        .filter(Boolean)
        .join(" ")
    );

  /* Whole query */
  const variants =
    getSearchVariants(
      normalizedQuery
    );

  if (
    variants.some((variant) =>
      searchableText.includes(
        variant
      )
    )
  ) {
    return true;
  }

  /* Individual words */
  const words =
    normalizedQuery
      .split(" ")
      .filter(Boolean);

  if (!words.length) {
    return true;
  }

  return words.every(
    (word) => {
      const wordVariants =
        getSearchVariants(word);

      return wordVariants.some(
        (variant) =>
          searchableText.includes(
            variant
          )
      );
    }
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Jobs() {
  const [
    jobsList,
    setJobsList,
  ] = useState([]);

  /* =======================================================
     HALL TICKET DATA
     ONLY USED WHEN प्रवेशपत्र IS SELECTED
  ======================================================= */

  const [
    hallTicketList,
    setHallTicketList,
  ] = useState([]);

  const [
    hallTicketLoading,
    setHallTicketLoading,
  ] = useState(false);

  const [
    hallTicketError,
    setHallTicketError,
  ] = useState("");

  /* =======================================================
     RESULT DATA
     ONLY USED WHEN निकाल IS SELECTED
  ======================================================= */

  const [
    resultList,
    setResultList,
  ] = useState([]);

  const [
    resultLoading,
    setResultLoading,
  ] = useState(false);

  const [
    resultError,
    setResultError,
  ] = useState("");

  const [
    selectedJob,
    setSelectedJob,
  ] = useState(null);

  const [
    activeTab,
    setActiveTab,
  ] = useState("info");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    jobCategory,
    setJobCategory,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     FETCH LATEST POSTS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const url =
          `${API_BASE}?` +
          `_embed=1&` +
          `per_page=${FETCH_LIMIT}&` +
          `page=1&` +
          `orderby=modified&` +
          `order=desc`;

        const response =
          await fetch(url);

        if (!response.ok) {
          throw new Error(
            `API Error ${response.status}`
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setJobsList(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (err) {
        console.error(
          "Jobs API error:",
          err
        );

        if (!cancelled) {
          setError(
            "नवीनतम अपडेट्स मिळवताना समस्या आली."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     FETCH HALL TICKET PAGES

     IMPORTANT:
     - Existing posts API remains untouched.
     - This runs only as a separate data source for
       the प्रवेशपत्र category.
     - First find the Hall Ticket parent page.
     - Then fetch its child pages.
     - From each child page extract the actual
       प्रवेशपत्र / Admit Card link.
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchHallTicketPages = async () => {
      setHallTicketLoading(true);
      setHallTicketError("");

      try {
        /* ---------------------------------------------------
           STEP 1: FIND HALL TICKET PARENT PAGE
        --------------------------------------------------- */

        const parentResponse = await fetch(
          `${PAGES_API}?slug=hall-ticket&per_page=100`
        );

        if (!parentResponse.ok) {
          throw new Error(
            `Hall Ticket parent API Error ${parentResponse.status}`
          );
        }

        const parentPages =
          await parentResponse.json();

        const hallTicketParent =
          Array.isArray(parentPages)
            ? parentPages.find((page) => {
                const slug = String(
                  page?.slug || ""
                )
                  .toLowerCase()
                  .trim();

                const title = stripHtml(
                  page?.title?.rendered || ""
                )
                  .toLowerCase()
                  .trim();

                return (
                  slug === "hall-ticket" ||
                  title.includes("hall ticket") ||
                  title.includes("admit card") ||
                  title.includes("प्रवेशपत्र")
                );
              })
            : null;

        if (!hallTicketParent?.id) {
          throw new Error(
            "Hall Ticket parent page सापडले नाही."
          );
        }

        /* ---------------------------------------------------
           STEP 2: FETCH ONLY CHILD PAGES

           Example:
           /hall-ticket/pnb-hall-ticket/
           /hall-ticket/avnl-hall-ticket/
           etc.
        --------------------------------------------------- */

        const childResponse = await fetch(
          `${PAGES_API}?parent=${hallTicketParent.id}&per_page=${FETCH_LIMIT}&orderby=modified&order=desc`
        );

        if (!childResponse.ok) {
          throw new Error(
            `Hall Ticket child API Error ${childResponse.status}`
          );
        }

        const childPages =
          await childResponse.json();

        if (!Array.isArray(childPages)) {
          throw new Error(
            "Hall Ticket data invalid आहे."
          );
        }

        /* ---------------------------------------------------
           STEP 3: NORMALIZE EACH HALL TICKET PAGE
        --------------------------------------------------- */

        const extracted = childPages
          .map((page) => {
            const html =
              page?.content?.rendered || "";

            if (!html) {
              return null;
            }

            let admitCardLink = "";
            let pageMainLink = "";
            let examDate = "";

            try {
              const parser =
                new DOMParser();

              const doc =
                parser.parseFromString(
                  html,
                  "text/html"
                );

              /* ---------------------------------------------
                 FIND EXAM DATE
              --------------------------------------------- */

              const rows = [
                ...doc.querySelectorAll("tr"),
              ];

              rows.forEach((row) => {
                const rowText = (
                  row.textContent || ""
                )
                  .replace(/\s+/g, " ")
                  .trim();

                if (!examDate) {
                  const dateMatch = rowText.match(
                    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|जानेवारी|फेब्रुवारी|मार्च|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर)\s+20\d{2}\b/i
                  );

                  if (dateMatch) {
                    examDate =
                      dateMatch[0];
                  }
                }

                if (!examDate) {
                  const numericDateMatch = rowText.match(
                    /\b\d{1,2}[\\/.\\-]\d{1,2}[\\/.\\-]20\d{2}\b/
                  );

                  if (numericDateMatch) {
                    examDate =
                      numericDateMatch[0];
                  }
                }
              });

              /* ---------------------------------------------
                 FIND ACTUAL प्रवेशपत्र LINK

                 We specifically prefer links whose text is:
                 प्रवेशपत्र / admit card / hall ticket
              --------------------------------------------- */

              const links = [
                ...doc.querySelectorAll("a[href]"),
              ];

              const admitLink =
                links.find((link) => {
                  const text = (
                    link.textContent || ""
                  )
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();

                  return (
                    text.includes("प्रवेशपत्र") ||
                    text.includes("hall ticket") ||
                    text.includes("admit card") ||
                    text.includes("admitcard")
                  );
                });

              if (admitLink?.href) {
                admitCardLink =
                  admitLink.href;
              }

              /* ---------------------------------------------
                 FALLBACK:
                 Sometimes the actual link text is Click Here.
                 Find a row containing प्रवेशपत्र and use the
                 second link in that row.
              --------------------------------------------- */

              if (!admitCardLink) {
                const admitRow = rows.find((row) => {
                  const text = (
                    row.textContent || ""
                  )
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();

                  return (
                    text.includes("प्रवेशपत्र") ||
                    text.includes("admit card") ||
                    text.includes("hall ticket")
                  );
                });

                if (admitRow) {
                  const rowLinks = [
                    ...admitRow.querySelectorAll(
                      "a[href]"
                    ),
                  ];

                  const externalLink =
                    rowLinks.find((link) => {
                      const href =
                        link.href || "";

                      const text = (
                        link.textContent || ""
                      )
                        .replace(/\s+/g, " ")
                        .trim()
                        .toLowerCase();

                      return (
                        href &&
                        !text.includes("प्रवेशपत्र") ||
                        text.includes("click here")
                      );
                    });

                  if (externalLink?.href) {
                    admitCardLink =
                      externalLink.href;
                  }
                }
              }

              /* ---------------------------------------------
                 MAIN PAGE LINK
              --------------------------------------------- */

              const firstContentLink =
                links.find((link) => {
                  const href =
                    link.href || "";

                  const text = (
                    link.textContent || ""
                  )
                    .replace(/\s+/g, " ")
                    .trim();

                  return (
                    href &&
                    text &&
                    !text
                      .toLowerCase()
                      .includes("click here")
                  );
                });

              if (firstContentLink?.href) {
                pageMainLink =
                  firstContentLink.href;
              }
            } catch (parseError) {
              console.warn(
                "Hall Ticket page parsing failed:",
                parseError
              );
            }

            /* -------------------------------------------------
               TITLE
            ------------------------------------------------- */

            const title = stripHtml(
              page?.title?.rendered ||
                "प्रवेशपत्र"
            );

            /* -------------------------------------------------
               If actual admit-card link wasn't found,
               do not show this page as a fake card.
            ------------------------------------------------- */

            if (!admitCardLink) {
              return null;
            }

            return {
              id: `hall-ticket-${page.id}`,
              title,
              slug: page?.slug || "",
              url:
                page?.link ||
                pageMainLink ||
                "",
              date: examDate,
              modified:
                page?.modified ||
                page?.date ||
                "",
              excerpt: stripHtml(
                page?.excerpt?.rendered || ""
              ),
              content: html,
              fullText: stripHtml(html),

              category:
                "hall-ticket",
              categoryLabel:
                "प्रवेशपत्र",
              categoryIcon:
                "🎟️",
              shortTags: [
                "hall-ticket",
              ],
              categoryNames: [
                "प्रवेशपत्र",
              ],
              tagNames: [],

              /* Use actual Admit Card link */
              pdfLink: "",
              applyLink: admitCardLink,
              officialLink: "",

              /* Original Majhi Naukri child page */
              originalPageUrl:
                page?.link ||
                pageMainLink ||
                "",

              advtNo: "",
              totalPosts: "",
              postDetails: "",
              education: "",
              ageLimit: "",
              location: "",
              applyMethod:
                "ऑनलाइन प्रवेशपत्र",
              lastDate: "",

              isNew:
                page?.modified &&
                Date.now() -
                  new Date(
                    page.modified
                  ).getTime() <
                  2 *
                    24 *
                    60 *
                    60 *
                    1000,
            };
          })
          .filter(Boolean);

        /* ---------------------------------------------------
           REMOVE DUPLICATES
        --------------------------------------------------- */

        const unique = new Map();

        extracted.forEach((item) => {
          const key =
            item.url ||
            item.id;

          if (!unique.has(key)) {
            unique.set(key, item);
          }
        });

        const finalData =
          Array.from(unique.values()).sort(
            (a, b) =>
              new Date(
                b.modified ||
                  b.date ||
                  0
              ).getTime() -
              new Date(
                a.modified ||
                  a.date ||
                  0
              ).getTime()
          );

        if (!cancelled) {
          setHallTicketList(
            finalData
          );
        }
      } catch (err) {
        console.error(
          "Hall Ticket API Error:",
          err
        );

        if (!cancelled) {
          setHallTicketError(
            "प्रवेशपत्र अपडेट्स मिळवताना समस्या आली."
          );
          setHallTicketList([]);
        }
      } finally {
        if (!cancelled) {
          setHallTicketLoading(false);
        }
      }
    };

    fetchHallTicketPages();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     FETCH RESULT PAGES

     IMPORTANT:
     - Only the निकाल category uses WordPress Pages API.
     - Only pages whose TITLE contains "निकाल" are used.
     - Each table inside the page is treated as one result item.
     - Only the relevant Majhi Naukri post link, निकाल link and
       Click Here link are extracted from each table.
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchResultPages = async () => {
      setResultLoading(true);
      setResultError("");

      try {
        /*
         * IMPORTANT: Do NOT assume the Result page is within the
         * first 100 WordPress pages. Search WordPress for "निकाल"
         * first, then strictly keep only pages whose TITLE contains
         * the word "निकाल".
         */
        const pages = [];
        let pageNumber = 1;

        while (pageNumber <= 20) {
          const response = await fetch(
            `${PAGES_API}?search=${encodeURIComponent("निकाल")}&per_page=${FETCH_LIMIT}&page=${pageNumber}&orderby=modified&order=desc`
          );

          /* WordPress returns 400 when there is no next page. */
          if (response.status === 400 && pageNumber > 1) {
            break;
          }

          if (!response.ok) {
            throw new Error(
              `Result Pages API Error ${response.status}`
            );
          }

          const pageData = await response.json();

          if (!Array.isArray(pageData) || !pageData.length) {
            break;
          }

          pages.push(...pageData);

          if (pageData.length < FETCH_LIMIT) {
            break;
          }

          pageNumber += 1;
        }

        if (!pages.length) {
          throw new Error('स्पष्ट "निकाल" page सापडले नाही.');
        }

        const extracted = [];

        pages
          .filter((page) => {
            const title = stripHtml(
              page?.title?.rendered || ""
            ).trim();

            return title.includes("निकाल");
          })
          .forEach((page) => {
            const html = page?.content?.rendered || "";
            if (!html) return;

            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(
                html,
                "text/html"
              );

              const tables = [
                ...doc.querySelectorAll("table"),
              ];

              tables.forEach((table, tableIndex) => {
                const rows = [
                  ...table.querySelectorAll("tr"),
                ];

                if (!rows.length) return;

                /* -------------------------------------------
                   FIRST ROW = MAIN MAJHI NAUKRI POST
                ------------------------------------------- */
                const headerRow = rows[0];
                const headerLinks = [
                  ...headerRow.querySelectorAll("a[href]"),
                ];

                const mainPostLink =
                  headerLinks.find((link) => {
                    try {
                      const url = new URL(
                        link.href,
                        window.location.href
                      );

                      return url.hostname
                        .toLowerCase()
                        .includes("majhinaukri.in");
                    } catch {
                      return false;
                    }
                  })?.href || "";

                const mainPostTitle = (
                  headerRow.textContent || ""
                )
                  .replace(/\s+/g, " ")
                  .trim();

                if (!mainPostTitle || !mainPostLink) {
                  return;
                }

                /* -------------------------------------------
                   FIND RESULT ROWS

                   We intentionally accept rows containing:
                   निकाल / Result / final result / pre result /
                   mains result etc.

                   Date-only rows and unrelated links are ignored.
                ------------------------------------------- */
                const resultRows = rows.filter((row, index) => {
                  if (index === 0) return false;

                  const text = (row.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim()
                    .toLowerCase();

                  return (
                    text.includes("निकाल") ||
                    text.includes("result")
                  );
                });

                const resultLinks = [];

                resultRows.forEach((row) => {
                  const rowText = (row.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim();

                  const anchors = [
                    ...row.querySelectorAll("a[href]"),
                  ];

                  /* Prefer the anchor whose text is निकाल/result. */
                  const resultAnchor = anchors.find((anchor) => {
                    const text = (anchor.textContent || "")
                      .replace(/\s+/g, " ")
                      .trim()
                      .toLowerCase();

                    return (
                      text.includes("निकाल") ||
                      text.includes("result")
                    );
                  }) || anchors[0];

                  if (!resultAnchor?.href) return;

                  const clickHereAnchor = anchors.find((anchor) => {
                    const text = (anchor.textContent || "")
                      .replace(/\s+/g, " ")
                      .trim()
                      .toLowerCase();

                    return text.includes("click here");
                  });

                  const label = rowText
                    .replace(/click here/gi, "")
                    .replace(/\s+/g, " ")
                    .trim();

                  const resultUrl = resultAnchor.href;
                  const clickUrl =
                    clickHereAnchor?.href || resultUrl;

                  const key = `${label}|${resultUrl}`;

                  if (!resultLinks.some((item) => item.key === key)) {
                    resultLinks.push({
                      key,
                      label,
                      resultUrl,
                      clickUrl,
                    });
                  }
                });

                /*
                  If the table contains a result post but no result
                  link, skip it. This prevents unrelated tables from
                  becoming fake result cards.
                */
                if (!resultLinks.length) return;

                const pageTitle = stripHtml(
                  page?.title?.rendered || "निकाल"
                ).trim();

                const title =
                  mainPostTitle || pageTitle || "निकाल";

                extracted.push({
                  id: `result-${page.id}-${tableIndex}`,
                  title,
                  slug: page?.slug || "",
                  url: mainPostLink,
                  originalPageUrl: mainPostLink,
                  date: page?.date || "",
                  modified:
                    page?.modified ||
                    page?.date ||
                    "",
                  excerpt: title,
                  fullText: `${title} ${resultLinks
                    .map((item) => item.label)
                    .join(" ")}`,
                  content: html,

                  category: "result",
                  categoryLabel: "निकाल",
                  categoryIcon: "🏆",
                  shortTags: ["result"],
                  categoryNames: ["निकाल"],
                  tagNames: [],

                  /* Only these links are shown for Result. */
                  resultLinks,
                  pdfLink: "",
                  applyLink: "",
                  officialLink: "",

                  advtNo: "",
                  totalPosts: "",
                  postDetails: "",
                  education: "",
                  ageLimit: "",
                  location: "",
                  applyMethod: "",
                  lastDate: "",

                  isNew:
                    page?.modified &&
                    Date.now() -
                      new Date(page.modified).getTime() <
                      2 * 24 * 60 * 60 * 1000,
                });
              });
            } catch (parseError) {
              console.warn(
                "Result page parsing failed:",
                parseError
              );
            }
          });

        /* -------------------------------------------
           REMOVE DUPLICATES
        ------------------------------------------- */
        const unique = new Map();

        extracted.forEach((item) => {
          const key = `${item.url}|${item.title}|${item.resultLinks
            .map((link) => link.resultUrl)
            .join(",")}`;

          if (!unique.has(key)) {
            unique.set(key, item);
          }
        });

        const finalData = Array.from(unique.values()).sort(
          (a, b) =>
            new Date(
              b.modified || b.date || 0
            ).getTime() -
            new Date(
              a.modified || a.date || 0
            ).getTime()
        );

        if (!cancelled) {
          setResultList(finalData);
        }
      } catch (err) {
        console.error("Result Pages API Error:", err);

        if (!cancelled) {
          setResultError(
            "निकाल अपडेट्स मिळवताना समस्या आली."
          );
          setResultList([]);
        }
      } finally {
        if (!cancelled) {
          setResultLoading(false);
        }
      }
    };

    fetchResultPages();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     GET WORDPRESS TERMS
  ======================================================= */

  const getJobTerms = (
    job
  ) => {
    try {
      const groups =
        job?._embedded?.[
        "wp:term"
        ] || [];

      return groups.flatMap(
        (group) =>
          Array.isArray(group)
            ? group
            : []
      );
    } catch {
      return [];
    }
  };

  /* =======================================================
     STRIP HTML
  ======================================================= */

  const stripHtml = (
    html = ""
  ) => {
    if (!html) return "";

    if (
      typeof document ===
      "undefined"
    ) {
      return String(html)
        .replace(
          /<[^>]*>/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();
    }

    const div =
      document.createElement(
        "div"
      );

    div.innerHTML = html;

    return (
      div.textContent ||
      div.innerText ||
      ""
    ).trim();
  };

  /* =======================================================
     GET JOB CATEGORY
  ======================================================= */

  const getJobCategory = (
    job
  ) => {
    const terms =
      getJobTerms(job);

    /* ---------------------------------------------
       CURRENT AFFAIRS MUST NEVER SHOW
    --------------------------------------------- */

    const hasCurrentAffairs =
      terms.some(
        (term) =>
          (
            term.taxonomy ===
            "category" ||
            term.taxonomy ===
            "post_tag"
          ) &&
          isCurrentAffairs(
            term.name,
            term.slug
          )
      );

    if (
      hasCurrentAffairs
    ) {
      return null;
    }

    /* ---------------------------------------------
       PRIORITY
    --------------------------------------------- */

    const priority = [
      "hall-ticket",
      "result",
      "examination",
      "mega-bharti",
      "current-recruitment",
    ];

    for (
      const priorityCategory of priority
    ) {
      const matched =
        terms.some(
          (term) => {
            if (
              term.taxonomy !==
              "category" &&
              term.taxonomy !==
              "post_tag"
            ) {
              return false;
            }

            return (
              detectCategoryFromTerm(
                term.name,
                term.slug
              ) ===
              priorityCategory
            );
          }
        );

      if (matched) {
        return priorityCategory;
      }
    }

    /* ---------------------------------------------
       TITLE FALLBACK
    --------------------------------------------- */

    const title =
      stripHtml(
        job?.title
          ?.rendered || ""
      );

    if (
      isCurrentAffairs(
        title,
        title
      )
    ) {
      return null;
    }

    return detectCategoryFromTerm(
      title,
      title
    );
  };

  /* =======================================================
     EXTRACT JOB DATA
  ======================================================= */

  const extractJobData = (job) => {
    const html = job?.content?.rendered || "";

    const text = stripHtml(html);

    /*
     * ---------------------------------------------------------
     * HTML TABLE DATA EXTRACTOR
     * Majhi Naukri pages often keep information inside tables.
     * ---------------------------------------------------------
     */

    let tableData = {};

    try {
      if (typeof DOMParser !== "undefined") {
        const parser = new DOMParser();

        const doc = parser.parseFromString(
          html,
          "text/html"
        );

        const rows = doc.querySelectorAll("tr");

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td, th");

          if (cells.length >= 2) {
            const key = stripHtml(
              cells[0].textContent || ""
            )
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();

            const value = stripHtml(
              cells[1].textContent || ""
            )
              .replace(/\s+/g, " ")
              .trim();

            if (key && value) {
              tableData[key] = value;
            }
          }
        });
      }
    } catch (error) {
      console.warn(
        "Table parsing failed:",
        error
      );
    }


    /*
     * ---------------------------------------------------------
     * NORMAL TEXT EXTRACTOR
     * ---------------------------------------------------------
     */

    const getValue = (patterns) => {
      for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match?.[1]) {
          return match[1]
            .replace(/\s+/g, " ")
            .trim();
        }
      }

      return "";
    };


    /*
     * ---------------------------------------------------------
     * TABLE VALUE FINDER
     * ---------------------------------------------------------
     */

    const getTableValue = (keys) => {
      for (const key of keys) {
        const normalizedKey = key
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        if (tableData[normalizedKey]) {
          return tableData[normalizedKey];
        }

        /*
         * Partial match also.
         */

        const foundKey = Object.keys(
          tableData
        ).find((tableKey) =>
          tableKey.includes(normalizedKey)
        );

        if (foundKey && tableData[foundKey]) {
          return tableData[foundKey];
        }
      }

      return "";
    };


    /*
     * ---------------------------------------------------------
     * POST DETAILS
     * ---------------------------------------------------------
     */

    const postDetails =
      getTableValue([
        "पदाचे नाव व तपशील",
        "पदाचे नाव",
        "पदाचे नाव व तपशील:",
        "post name and details",
        "post name",
        "post details",
        "designation",
        "post",
      ]) ||
      getValue([
        /पदाचे नाव\s*(?:व तपशील)?\s*:?\s*([^\n]+)/i,
        /Post Name\s*(?:and Details)?\s*:?\s*([^\n]+)/i,
        /Designation\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * ADVERTISEMENT NUMBER
     * ---------------------------------------------------------
     */

    const advtNo =
      getTableValue([
        "जाहिरात क्र.",
        "जाहिरात क्र",
        "जाहिरात क्रमांक",
        "advertisement no",
        "advertisement number",
      ]) ||
      getValue([
        /जाहिरात क्र\.?\s*:?\s*([^\n]+)/i,
        /जाहिरात क्रमांक\s*:?\s*([^\n]+)/i,
        /Advertisement No\.?\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * TOTAL POSTS
     * ---------------------------------------------------------
     */

    const totalPosts =
      getTableValue([
        "एकूण पदे",
        "एकूण पद",
        "एकूण जागा",
        "total posts",
        "total vacancies",
        "vacancies",
      ]) ||
      getValue([
        /Total\s*:?\s*([0-9,]+\s*(?:जागा|Posts|Vacancies)?)/i,
        /एकूण\s*(?:पदे|जागा)\s*:?\s*([^\n]+)/i,
        /Total Posts\s*:?\s*([^\n]+)/i,
        /Total Vacancies\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * EDUCATION
     * ---------------------------------------------------------
     */

    const education =
      getTableValue([
        "शैक्षणिक पात्रता",
        "शैक्षणिक पात्रता:",
        "educational qualification",
        "qualification",
        "education",
      ]) ||
      getValue([
        /शैक्षणिक पात्रता\s*:?\s*([^\n]+)/i,
        /Educational Qualification\s*:?\s*([^\n]+)/i,
        /Qualification\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * AGE LIMIT
     * ---------------------------------------------------------
     */

    const ageLimit =
      getTableValue([
        "वयाची अट",
        "वयाची अट:",
        "वयोमर्यादा",
        "age limit",
        "age criteria",
      ]) ||
      getValue([
        /वयाची अट\s*:?\s*([^\n]+)/i,
        /वयोमर्यादा\s*:?\s*([^\n]+)/i,
        /Age Limit\s*:?\s*([^\n]+)/i,
        /Age Criteria\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * LOCATION
     * ---------------------------------------------------------
     */

    const location =
      getTableValue([
        "नोकरी ठिकाण",
        "नोकरीचे ठिकाण",
        "job location",
        "place of posting",
      ]) ||
      getValue([
        /नोकरी ठिकाण\s*:?\s*([^\n]+)/i,
        /नोकरीचे ठिकाण\s*:?\s*([^\n]+)/i,
        /Job Location\s*:?\s*([^\n]+)/i,
        /Place of Posting\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * APPLICATION METHOD
     * ---------------------------------------------------------
     */

    const applyMethod =
      getTableValue([
        "अर्ज करण्याची पद्धत",
        "अर्ज पद्धत",
        "अर्जाची पद्धत",
        "application mode",
        "application method",
      ]) ||
      getValue([
        /अर्ज करण्याची पद्धत\s*:?\s*([^\n]+)/i,
        /अर्ज पद्धत\s*:?\s*([^\n]+)/i,
        /अर्जाची पद्धत\s*:?\s*([^\n]+)/i,
        /Application Mode\s*:?\s*([^\n]+)/i,
        /Application Method\s*:?\s*([^\n]+)/i,
      ]);


    /*
     * ---------------------------------------------------------
     * LAST DATE
     * ---------------------------------------------------------
     */

    const lastDate =
      getTableValue([
        "शेवटची तारीख",
        "अर्ज करण्याची शेवटची तारीख",
        "online अर्ज करण्याची शेवटची तारीख",
        "last date",
        "last date of online application",
        "closing date",
      ]) ||
      getValue([
        /Online अर्ज करण्याची शेवटची तारीख\s*:?\s*([^\n]+)/i,
        /अर्ज करण्याची शेवटची तारीख\s*:?\s*([^\n]+)/i,
        /शेवटची तारीख\s*:?\s*([^\n]+)/i,
        /Last Date of Online Application\s*:?\s*([^\n]+)/i,
        /Last Date\s*:?\s*([^\n]+)/i,
        /Closing Date\s*:?\s*([^\n]+)/i,
      ]);


    return {
      advtNo,
      totalPosts,
      postDetails,
      education,
      ageLimit,
      location,
      applyMethod,
      lastDate,
    };
  };

  /* =======================================================
     EXTRACT LINKS
  ======================================================= */

  const extractLinks = (
    job
  ) => {
    const html =
      job?.content
        ?.rendered || "";

    const parser =
      new DOMParser();

    const doc =
      parser.parseFromString(
        html,
        "text/html"
      );

    const links = [
      ...doc.querySelectorAll(
        "a"
      ),
    ];

    let pdfLink = "";
    let applyLink = "";
    let officialLink = "";

    links.forEach(
      (link) => {
        const href =
          link.href || "";

        const text = (
          link.textContent ||
          ""
        )
          .trim()
          .toLowerCase();

        /* PDF */

        if (
          !pdfLink &&
          (
            href
              .toLowerCase()
              .includes(".pdf") ||
            text.includes("pdf") ||
            text.includes("जाहिरात") ||
            text.includes(
              "notification"
            )
          )
        ) {
          pdfLink = href;
        }

        /* APPLY */

        if (
          !applyLink &&
          (
            text.includes(
              "apply"
            ) ||
            text.includes(
              "अर्ज"
            ) ||
            text.includes(
              "online application"
            )
          )
        ) {
          applyLink = href;
        }

        /* OFFICIAL WEBSITE */

        if (
          !officialLink &&
          (
            text.includes(
              "official website"
            ) ||
            text.includes(
              "अधिकृत वेबसाइट"
            )
          )
        ) {
          officialLink = href;
        }
      }
    );

    return {
      pdfLink,
      applyLink,
      officialLink,
    };
  };

  /* =======================================================
     NORMALIZE JOBS
  ======================================================= */

  const normalizedJobs =
    useMemo(() => {
      const output = [];

      jobsList.forEach(
        (job) => {
          const category =
            getJobCategory(
              job
            );

          /* BLOCK UNKNOWN + CURRENT AFFAIRS */

          if (!category) {
            return;
          }

          const jobData =
            extractJobData(
              job
            );

          const links =
            extractLinks(
              job
            );

          const terms =
            getJobTerms(
              job
            );

          /* -----------------------------------------
             SHORT TAGS
          ----------------------------------------- */

          const shortTags =
            [];

          terms.forEach(
            (term) => {
              if (
                term.taxonomy !==
                "category" &&
                term.taxonomy !==
                "post_tag"
              ) {
                return;
              }

              if (
                isCurrentAffairs(
                  term.name,
                  term.slug
                )
              ) {
                return;
              }

              const detected =
                detectCategoryFromTerm(
                  term.name,
                  term.slug
                );

              if (
                detected &&
                !shortTags.includes(
                  detected
                )
              ) {
                shortTags.push(
                  detected
                );
              }
            }
          );

          /* -----------------------------------------
             REMOVE EXPIRED CURRENT RECRUITMENT
          ----------------------------------------- */

          if (
            category ===
            "current-recruitment" &&
            isExpired(
              jobData.lastDate
            )
          ) {
            return;
          }

          const categoryConfig =
            CATEGORY_CONFIG.find(
              (item) =>
                item.key ===
                category
            );

          output.push({
            id: job.id,

            title:
              stripHtml(
                job.title
                  ?.rendered ||
                "शीर्षक नाही"
              ),

            slug:
              job.slug || "",

            url:
              job.link || "",

            date:
              job.date || "",

            modified:
              job.modified || "",

            excerpt:
              stripHtml(
                job.excerpt
                  ?.rendered ||
                ""
              ),

            /* COMPLETE WORDPRESS HTML */

            content:
              job.content
                ?.rendered ||
              "",

            /* COMPLETE TEXT */

            fullText:
              stripHtml(
                job.content
                  ?.rendered ||
                ""
              ),

            image:
              job?._embedded?.[
                "wp:featuredmedia"
              ]?.[0]
                ?.source_url ||
              "",

            category,

            categoryLabel:
              categoryConfig
                ?.label || "",

            categoryIcon:
              categoryConfig
                ?.icon || "💼",

            shortTags,

            categoryNames:
              terms
                .filter(
                  (term) =>
                    term.taxonomy ===
                    "category"
                )
                .map(
                  (term) =>
                    term.name
                ),

            tagNames:
              terms
                .filter(
                  (term) =>
                    term.taxonomy ===
                    "post_tag"
                )
                .map(
                  (term) =>
                    term.name
                ),

            ...jobData,

            ...links,

            /* NEW = LAST 2 DAYS */

            isNew:
              job.modified &&
              Date.now() -
              new Date(
                job.modified
              ).getTime() <
              2 *
              24 *
              60 *
              60 *
              1000,
          });
        }
      );

      /* -----------------------------------------
         REMOVE DUPLICATES
      ----------------------------------------- */

      const unique =
        new Map();

      output.forEach(
        (job) => {
          const key =
            job.url ||
            String(job.id);

          if (
            !unique.has(key)
          ) {
            unique.set(
              key,
              job
            );
          }
        }
      );

      /* -----------------------------------------
         LATEST MODIFIED FIRST
      ----------------------------------------- */

      return Array.from(
        unique.values()
      ).sort(
        (a, b) =>
          new Date(
            b.modified ||
            b.date
          ).getTime() -
          new Date(
            a.modified ||
            a.date
          ).getTime()
      );
    }, [jobsList]);

  /* =======================================================
     FILTER + SEARCH
  ======================================================= */

  const filteredJobs =
    useMemo(() => {
      /* ===================================================
         प्रवेशपत्र = Hall Ticket Pages API
      =================================================== */
      if (jobCategory === "hall-ticket") {
        let result = hallTicketList;

        if (searchTerm.trim()) {
          const query = normalizeSearchText(searchTerm);
          result = result.filter((job) => {
            const searchableText = normalizeSearchText(
              [
                job?.title,
                job?.date,
                job?.excerpt,
                job?.fullText,
              ]
                .filter(Boolean)
                .join(" ")
            );

            return searchableText.includes(query);
          });
        }

        return result;
      }

      /* ===================================================
         निकाल = Result Pages API
      =================================================== */
      if (jobCategory === "result") {
        let result = resultList;

        if (searchTerm.trim()) {
          const query = normalizeSearchText(searchTerm);
          result = result.filter((job) => {
            const searchableText = normalizeSearchText(
              [
                job?.title,
                job?.date,
                job?.excerpt,
                job?.fullText,
              ]
                .filter(Boolean)
                .join(" ")
            );

            return searchableText.includes(query);
          });
        }

        return result;
      }

      /* ===================================================
         ALL OTHER CATEGORIES = ORIGINAL LOGIC
      =================================================== */
      let result = normalizedJobs;

      if (jobCategory !== "all") {
        result = result.filter(
          (job) => job.category === jobCategory
        );
      }

      if (searchTerm.trim()) {
        result = result.filter((job) =>
          jobMatchesSearch(job, searchTerm)
        );
      }

      return result;
    }, [
      normalizedJobs,
      hallTicketList,
      resultList,
      jobCategory,
      searchTerm,
    ]);


  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalJobs =
    filteredJobs.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalJobs /
        POSTS_PER_PAGE
      )
    );

  const paginatedJobs =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        POSTS_PER_PAGE;

      return filteredJobs.slice(
        start,
        start +
        POSTS_PER_PAGE
      );
    }, [
      filteredJobs,
      currentPage,
    ]);

  /* RESET PAGE */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    jobCategory,
    searchTerm,
  ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  /* =======================================================
     PAGE NUMBERS
  ======================================================= */

  const pageNumbers =
    useMemo(() => {
      const pages = [];

      if (
        totalPages <= 7
      ) {
        for (
          let i = 1;
          i <= totalPages;
          i++
        ) {
          pages.push(i);
        }

        return pages;
      }

      pages.push(1);

      if (
        currentPage > 4
      ) {
        pages.push("...");
      }

      const start =
        Math.max(
          2,
          currentPage - 1
        );

      const end =
        Math.min(
          totalPages - 1,
          currentPage + 1
        );

      for (
        let i = start;
        i <= end;
        i++
      ) {
        pages.push(i);
      }

      if (
        currentPage <
        totalPages - 3
      ) {
        pages.push("...");
      }

      pages.push(
        totalPages
      );

      return pages;
    }, [
      currentPage,
      totalPages,
    ]);

  /* =======================================================
     DATE FORMAT
  ======================================================= */

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "माहिती नाही";
    }

    try {
      const parsed =
        new Date(date);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return "माहिती नाही";
      }

      return parsed.toLocaleDateString(
        "mr-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "माहिती नाही";
    }
  };

  /* =======================================================
     MODAL
  ======================================================= */

  const openModal = (
    job
  ) => {
    setSelectedJob(job);
    setActiveTab("info");

    document.body.style.overflow =
      "hidden";
  };

  const closeModal = () => {
    setSelectedJob(null);

    document.body.style.overflow =
      "";
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="jobs-widget">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="jobs-header">

        <div>
          <h2 className="jobs-title">
            नवीनतम अपडेट्स
          </h2>

          <p className="jobs-subtitle">
            नवीन भरती, परीक्षा,
            प्रवेशपत्र आणि निकाल
          </p>
        </div>

        <span className="jobs-count-pill">
          {(loading || hallTicketLoading || resultLoading)
            ? "..."
            : `${totalJobs} अपडेट्स`}
        </span>

      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div className="jobs-search-box">

        <span
          className="jobs-search-icon"
          aria-hidden="true"
        >
          🔎
        </span>

        <input
          type="search"
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
          placeholder="भरती शोधा... Bharti / Exam / Result / Nikal"
          aria-label="नोकरी शोधा"
          autoComplete="off"
          spellCheck="false"
        />

        {searchTerm && (
          <button
            type="button"
            className="jobs-search-clear"
            onClick={() =>
              setSearchTerm("")
            }
            aria-label="शोध साफ करा"
          >
            ✕
          </button>
        )}

      </div>

      {/* =====================================================
          CATEGORY TABS
      ===================================================== */}

      <div className="jobs-category-tabs">

        {CATEGORY_CONFIG.map(
          (category) => (
            <button
              key={
                category.key
              }
              type="button"
              className={`job-cat-btn ${jobCategory ===
                  category.key
                  ? "active"
                  : ""
                }`}
              onClick={() => {
                setJobCategory(
                  category.key
                );
                setCurrentPage(1);
              }}
            >
              <span className="job-cat-icon">
                {category.icon}
              </span>

              <span>
                {category.label}
              </span>
            </button>
          )
        )}

      </div>

      {/* =====================================================
          ACTIVE CATEGORY
      ===================================================== */}

      <div className="jobs-active-category">

        <div className="jobs-active-category-left">

          <span className="jobs-active-icon">
            {
              CATEGORY_CONFIG.find(
                (item) =>
                  item.key ===
                  jobCategory
              )?.icon
            }
          </span>

          <strong>
            {
              CATEGORY_CONFIG.find(
                (item) =>
                  item.key ===
                  jobCategory
              )?.label
            }
          </strong>

        </div>

        <span>
          {(loading || hallTicketLoading || resultLoading)
            ? "..."
            : `${totalJobs} अपडेट्स`}
        </span>

      </div>

      {/* =====================================================
          SEARCH RESULT MESSAGE
      ===================================================== */}

      {!loading &&
        !error &&
        !(jobCategory === "hall-ticket" && hallTicketError) &&
        searchTerm.trim() && (
          <div className="jobs-search-result-info">
            🔎
            <strong>
              {" "}
              "{searchTerm}"
            </strong>{" "}
            साठी{" "}
            <strong>
              {totalJobs}
            </strong>{" "}
            अपडेट्स मिळाले
          </div>
        )}

      {/* =====================================================
          JOB LIST
      ===================================================== */}

      <div className="jobs-list">

        {loading ||
        (jobCategory === "hall-ticket" && hallTicketLoading) ||
        (jobCategory === "result" && resultLoading) ? (
          <div className="jobs-loading">

            <div className="jobs-spinner"></div>

            <p>
              नवीनतम अपडेट्स
              तपासत आहे...
            </p>

          </div>
        ) : (error ||
          (jobCategory === "hall-ticket" && hallTicketError) ||
          (jobCategory === "result" && resultError)) ? (
          <div className="jobs-empty-container">

            <p className="jobs-empty">
              {jobCategory === "hall-ticket"
                ? hallTicketError
                : jobCategory === "result"
                  ? resultError
                  : error}
            </p>

            <button
              type="button"
              className="job-retry-btn"
              onClick={() =>
                window.location.reload()
              }
            >
              पुन्हा प्रयत्न करा
            </button>

          </div>
        ) : paginatedJobs.length ===
          0 ? (
          <div className="jobs-empty-container">

            <div className="jobs-empty-icon">
              🔎
            </div>

            <p className="jobs-empty">

              {searchTerm.trim()
                ? `"${searchTerm}" साठी कोणतेही अपडेट्स सापडले नाहीत.`
                : "या विभागात सध्या कोणतेही अपडेट्स उपलब्ध नाहीत."}

            </p>

            {searchTerm && (
              <button
                type="button"
                className="job-retry-btn"
                onClick={() =>
                  setSearchTerm("")
                }
              >
                Search Clear करा
              </button>
            )}

          </div>
        ) : (
          paginatedJobs.map(
            (job) => (
              <div
                key={job.id}
                className={`saas-job-card ${job.isNew
                    ? "is-new"
                    : ""
                  }`}
                onClick={() =>
                  openModal(job)
                }
              >

                {/* NEW BADGE */}

                {job.isNew && (
                  <span className="job-badge-new">
                    नवीन
                  </span>
                )}

                <div className="job-left-content">

                  <div className="job-icon-box">
                    {job.categoryIcon}
                  </div>

                  <div className="job-info">

                    <span className="job-name">
                      {job.title}
                    </span>

                    {/* SHORT TAGS */}

                    <div className="job-card-categories">

                      <span className="job-mini-category primary">
                        {
                          job.categoryLabel
                        }
                      </span>

                      {job.shortTags
                        .filter(
                          (tag) =>
                            tag !==
                            job.category
                        )
                        .slice(
                          0,
                          2
                        )
                        .map(
                          (tag) => {
                            const config =
                              CATEGORY_CONFIG.find(
                                (item) =>
                                  item.key ===
                                  tag
                              );

                            if (
                              !config
                            ) {
                              return null;
                            }

                            return (
                              <span
                                key={
                                  tag
                                }
                                className="job-mini-category"
                              >
                                {
                                  config.label
                                }
                              </span>
                            );
                          }
                        )}

                    </div>

                    {/* LAST DATE */}

                    {job.lastDate ? (
                      <span className="job-last-date">
                        ⏳ शेवटची तारीख:{" "}
                        <span className="highlight-date-small">
                          {
                            job.lastDate
                          }
                        </span>
                      </span>
                    ) : (
                      <span className="job-last-date">
                        🗓️ पोस्ट तारीख:{" "}
                        <span className="highlight-date-small">
                          {formatDate(
                            job.date
                          )}
                        </span>
                      </span>
                    )}

                  </div>

                </div>

                <button
                  type="button"
                  className="job-detail-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(job);
                  }}
                >
                  पाहा
                </button>

              </div>
            )
          )
        )}

      </div>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {!loading &&
        !(jobCategory === "hall-ticket" && hallTicketLoading) &&
        !(jobCategory === "result" && resultLoading) &&
        !error &&
        !(jobCategory === "hall-ticket" && hallTicketError) &&
        !(jobCategory === "result" && resultError) &&
        totalPages > 1 && (
          <div className="jobs-pagination">

            <button
              type="button"
              className="pagination-arrow"
              disabled={
                currentPage === 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
            >
              ‹
            </button>

            <div className="pagination-pages">

              {pageNumbers.map(
                (
                  page,
                  index
                ) => {
                  if (
                    page ===
                    "..."
                  ) {
                    return (
                      <span
                        key={`dots-${index}`}
                        className="pagination-dots"
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={page}
                      className={`pagination-number ${currentPage ===
                          page
                          ? "active"
                          : ""
                        }`}
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
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
                currentPage ===
                totalPages
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
            >
              ›
            </button>

          </div>
        )}

      {/* =====================================================
          PAGINATION INFO
      ===================================================== */}

      {!loading &&
        !(jobCategory === "hall-ticket" && hallTicketLoading) &&
        !(jobCategory === "result" && resultLoading) &&
        !error &&
        !(jobCategory === "hall-ticket" && hallTicketError) &&
        !(jobCategory === "result" && resultError) &&
        totalJobs > 0 && (
          <div className="pagination-info">

            पृष्ठ{" "}
            <strong>
              {currentPage}
            </strong>{" "}
            /{" "}
            <strong>
              {totalPages}
            </strong>

            {" • "}

            एकूण{" "}
            <strong>
              {totalJobs}
            </strong>{" "}
            अपडेट्स

          </div>
        )}

      {/* =====================================================
          MODAL
      ===================================================== */}

      {selectedJob && (
        <div
          className="job-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="job-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="job-modal-header">

              <div className="job-modal-title-box">

                <div className="modal-category-label">
                  {
                    selectedJob.categoryIcon
                  }{" "}
                  {
                    selectedJob.categoryLabel
                  }
                </div>

                <h3 className="job-modal-title">
                  {
                    selectedJob.title
                  }
                </h3>

                <div className="job-modal-tags">

                  {selectedJob.shortTags.map(
                    (tag) => {
                      const config =
                        CATEGORY_CONFIG.find(
                          (item) =>
                            item.key ===
                            tag
                        );

                      if (
                        !config
                      ) {
                        return null;
                      }

                      return (
                        <span
                          key={tag}
                          className="modal-tag-pill"
                        >
                          {
                            config.label
                          }
                        </span>
                      );
                    }
                  )}

                </div>

              </div>

              <button
                type="button"
                className="job-modal-close"
                onClick={
                  closeModal
                }
                aria-label="Close"
              >
                ✕
              </button>

            </div>

            {/* =================================================
                MODAL TABS
            ================================================= */}

            <div className="job-modal-tabs">

              <button
                type="button"
                className={`job-tab-btn ${activeTab ===
                    "info"
                    ? "active"
                    : ""
                  }`}
                onClick={() =>
                  setActiveTab(
                    "info"
                  )
                }
              >
                📋 संपूर्ण माहिती
              </button>

              <button
                type="button"
                className={`job-tab-btn ${activeTab ===
                    "links"
                    ? "active"
                    : ""
                  }`}
                onClick={() =>
                  setActiveTab(
                    "links"
                  )
                }
              >
                🔗 महत्त्वाच्या लिंक्स
              </button>

              <button
                type="button"
                className={`job-tab-btn ${activeTab ===
                    "complete"
                    ? "active"
                    : ""
                  }`}
                onClick={() =>
                  setActiveTab(
                    "complete"
                  )
                }
              >
                📄 पूर्ण माहिती
              </button>

            </div>

            {/* =================================================
                INFO TAB
            ================================================= */}

            {activeTab ===
              "info" && (
                <div className="job-modal-body fade-in">

                  <table className="premium-info-table">

                    <tbody>

                      <tr>
                        <td>
                          जाहिरात क्र.
                        </td>
                        <td>
                          <strong>
                            {
                              selectedJob.advtNo ||
                              "माहिती नाही"
                            }
                          </strong>
                        </td>
                      </tr>

                      <tr>
                        <td>
                          एकूण पदे
                        </td>
                        <td>
                          <strong>
                            {
                              selectedJob.totalPosts ||
                              "माहिती नाही"
                            }
                          </strong>
                        </td>
                      </tr>

                      <tr>

                        <tr>
                          <td>
                            पदाचे नाव व तपशील
                          </td>
                          <td>
                            {selectedJob.postDetails || "माहिती नाही"}
                          </td>
                        </tr>
                      </tr>

                      <tr>
                        <td>
                          शैक्षणिक पात्रता
                        </td>
                        <td>
                          {
                            selectedJob.education ||
                            "माहिती नाही"
                          }
                        </td>
                      </tr>

                      <tr>
                        <td>
                          वयाची अट
                        </td>
                        <td>
                          {
                            selectedJob.ageLimit ||
                            "माहिती नाही"
                          }
                        </td>
                      </tr>

                      <tr>
                        <td>
                          नोकरी ठिकाण
                        </td>
                        <td>
                          {
                            selectedJob.location ||
                            "माहिती नाही"
                          }
                        </td>
                      </tr>

                      <tr>
                        <td>
                          अर्ज पद्धत
                        </td>
                        <td>
                          {
                            selectedJob.applyMethod ||
                            "माहिती नाही"
                          }
                        </td>
                      </tr>

                      <tr>
                        <td>
                          शेवटची तारीख
                        </td>
                        <td>
                          <span className="highlight-red">
                            {
                              selectedJob.lastDate ||
                              "माहिती नाही"
                            }
                          </span>
                        </td>
                      </tr>

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

                      <tr>
                        <td>
                          शेवटचे अपडेट
                        </td>
                        <td>
                          {formatDate(
                            selectedJob.modified
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td>
                          कॅटेगरी
                        </td>
                        <td>
                          <strong>
                            {
                              selectedJob.categoryLabel
                            }
                          </strong>
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Tags
                        </td>
                        <td>
                          {selectedJob.tagNames?.length
                            ? selectedJob.tagNames.join(
                              ", "
                            )
                            : "माहिती नाही"}
                        </td>
                      </tr>

                    </tbody>

                  </table>

                </div>
              )}

            {/* =================================================
                LINKS TAB
            ================================================= */}

            {activeTab ===
              "links" && (
                <div className="job-modal-body fade-in link-tab-body">

                  {/* PDF */}

                  {selectedJob.category !== "result" && selectedJob.pdfLink && (
                    <div className="action-box pdf-box">

                      <div className="action-text">
                        <h4>
                          अधिकृत जाहिरात
                        </h4>

                        <p>
                          PDF जाहिरात पाहा
                        </p>
                      </div>

                      <a
                        href={
                          selectedJob.pdfLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn pdf-btn"
                      >
                        📄 PDF पाहा
                      </a>

                    </div>
                  )}

                  {/* HALL TICKET */}

                  {selectedJob.category ===
                    "hall-ticket" &&
                    selectedJob.applyLink && (
                      <div className="action-box hall-ticket-box">

                        <div className="action-text">
                          <h4>
                            प्रवेशपत्र
                          </h4>

                          <p>
                            Hall Ticket /
                            Admit Card पाहा
                          </p>
                        </div>

                        <a
                          href={
                            selectedJob.applyLink
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn hall-ticket-btn"
                        >
                          🎟️ Admit Card
                        </a>

                      </div>
                    )}

                  {/* RESULT LINKS */}

                  {selectedJob.category === "result" &&
                    selectedJob.resultLinks?.length > 0 && (
                      <div className="result-links-list">
                        {selectedJob.resultLinks.map(
                          (resultLink, index) => (
                            <div
                              className="action-box result-box"
                              key={`${resultLink.key}-${index}`}
                            >
                              <div className="action-text">
                                <h4>
                                  {resultLink.label || "निकाल"}
                                </h4>

                                <p>
                                  संबंधित निकालाची अधिकृत लिंक
                                </p>
                              </div>

                              <div className="result-action-buttons">
                                <a
                                  href={resultLink.resultUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="action-btn apply-btn"
                                >
                                  🏆 निकाल पाहा
                                </a>

                                <a
                                  href={resultLink.clickUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="action-btn"
                                >
                                  🔗 Click Here
                                </a>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {/* APPLY */}

                  {selectedJob.applyLink &&
                    selectedJob.category !==
                    "hall-ticket" &&
                    selectedJob.category !==
                    "result" && (
                      <div className="action-box apply-box">

                        <div className="action-text">
                          <h4>
                            ऑनलाइन अर्ज
                          </h4>

                          <p>
                            थेट ऑनलाईन अर्ज करा
                          </p>
                        </div>

                        <a
                          href={
                            selectedJob.applyLink
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn apply-btn"
                        >
                          🌐 अर्ज करा
                        </a>

                      </div>
                    )}

                  {/* OFFICIAL WEBSITE */}

                  {selectedJob.category !== "result" && selectedJob.officialLink && (
                    <div className="action-box">

                      <div className="action-text">
                        <h4>
                          अधिकृत वेबसाइट
                        </h4>

                        <p>
                          संबंधित संस्थेची
                          अधिकृत वेबसाइट
                        </p>
                      </div>

                      <a
                        href={
                          selectedJob.officialLink
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn"
                      >
                        🌐 वेबसाइट
                      </a>

                    </div>
                  )}

                  {/* ORIGINAL POST */}

                  {(selectedJob.url || selectedJob.originalPageUrl) && (
                    <div className="action-box">

                      <div className="action-text">
                        <h4>
                          मूळ पोस्ट
                        </h4>

                        <p>
                          Majhi Naukri
                          वरील संपूर्ण पोस्ट
                        </p>
                      </div>

                      <a
                        href={
                          selectedJob.originalPageUrl ||
                          selectedJob.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn"
                      >
                        🔗 पूर्ण पोस्ट
                      </a>

                    </div>
                  )}

                  {/* NO LINKS */}

                  {!selectedJob.pdfLink &&
                    !selectedJob.applyLink &&
                    !selectedJob.officialLink &&
                    !selectedJob.url &&
                    !(selectedJob.category === "result" && selectedJob.resultLinks?.length) && (
                      <div className="jobs-empty-container">
                        <p className="jobs-empty">
                          या पोस्टसाठी
                          कोणतीही लिंक उपलब्ध
                          नाही.
                        </p>
                      </div>
                    )}

                </div>
              )}

            {/* =================================================
                COMPLETE ORIGINAL WORDPRESS CONTENT
            ================================================= */}

            {activeTab ===
              "complete" && (
                <div className="job-modal-body fade-in">

                  <div className="complete-content-wrapper">

                    <div
                      className="wordpress-job-content"
                      dangerouslySetInnerHTML={{
                        __html:
                          selectedJob.content ||
                          "<p>माहिती उपलब्ध नाही.</p>",
                      }}
                    />

                  </div>

                </div>
              )}

          </div>

        </div>
      )}

    </div>
  );
}