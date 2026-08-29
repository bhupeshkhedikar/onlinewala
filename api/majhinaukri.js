const cheerio = require("cheerio");

const SITE = "https://majhinaukri.in";

const SOURCE_PAGES = {
  current:
    "https://majhinaukri.in/current-recruitment/",

  hall:
    "https://majhinaukri.in/hall-ticket/",

  result:
    "https://majhinaukri.in/result/",

  mega:
    "https://majhinaukri.in/mega-bharti/",

  exam:
    "https://majhinaukri.in/category/examination/",
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

function absoluteUrl(url = "") {
  if (!url) return "";

  try {
    return new URL(url, SITE).href;
  } catch {
    return "";
  }
}

function getSlug(url = "") {
  try {
    return new URL(url, SITE)
      .pathname
      .replace(/^\/|\/$/g, "")
      .split("/")
      .pop() || "";
  } catch {
    return "";
  }
}

/* =========================================================
   DATE
========================================================= */

function parseDMY(value = "") {
  const match = cleanText(value).match(
    /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/
  );

  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function isActiveDate(value = "") {
  const date = parseDMY(value);

  if (!date) return false;

  const now = new Date();

  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  return date >= today;
}

/* =========================================================
   CURRENT RECRUITMENT
========================================================= */

function parseCurrentRecruitment(html) {
  const $ = cheerio.load(html);

  const jobs = [];

  $("table tr").each((index, row) => {
    const cells = $(row).find("td");

    if (cells.length < 2) return;

    const titleCell = cells.eq(0);
    const dateCell = cells.eq(1);

    const title = cleanText(
      titleCell.text()
    );

    const lastDate = cleanText(
      dateCell.text()
    );

    const link = absoluteUrl(
      titleCell
        .find("a")
        .first()
        .attr("href")
    );

    if (!title || !link) return;

    if (
      title.toLowerCase().includes(
        "current affairs"
      ) ||
      title.includes(
        "चालू घडामोडी"
      )
    ) {
      return;
    }

    const slug = getSlug(link);

    jobs.push({
      id:
        `current-${slug || index}`,

      title,

      slug,

      url: link,

      lastDate,

      categoryNames: [
        "वर्तमान भरती:2026",
      ],

      categorySlugs: [
        "current-recruitment",
      ],

      type: "recruitment",

      isNew: index < 5,
    });
  });

  /*
   * IMPORTANT:
   * Old / expired jobs are removed here.
   */

  return jobs
    .filter((job) =>
      isActiveDate(
        job.lastDate
      )
    )
    .slice(0, 30);
}

/* =========================================================
   HALL TICKET
========================================================= */

function parseHallTicket(html) {
  const $ = cheerio.load(html);

  const jobs = [];

  $("table tr").each((index, row) => {
    const cells = $(row).find("td");

    if (cells.length < 2) return;

    const titleCell = cells.eq(0);

    const title = cleanText(
      titleCell.text()
    );

    const examDate = cleanText(
      cells.eq(1).text()
    );

    const link = absoluteUrl(
      titleCell
        .find("a")
        .first()
        .attr("href")
    );

    if (!title || !link) return;

    if (
      title.toLowerCase() ===
      "examination"
    ) {
      return;
    }

    jobs.push({
      id:
        `hall-${getSlug(link) || index}`,

      title,

      slug: getSlug(link),

      url: link,

      examDate,

      lastDate: examDate,

      categoryNames: [
        "प्रवेशपत्र",
      ],

      categorySlugs: [
        "hall-ticket",
      ],

      type: "hall",

      isNew: index < 5,
    });
  });

  return jobs.slice(0, 30);
}

/* =========================================================
   RESULT
========================================================= */

function parseResult(html) {
  const $ = cheerio.load(html);

  const jobs = [];

  const seen = new Set();

  $("a[href]").each((index, element) => {
    const link = absoluteUrl(
      $(element).attr("href")
    );

    const title = cleanText(
      $(element).text()
    );

    if (!link || !title) return;

    if (seen.has(link)) return;

    if (
      link ===
      `${SITE}/result/`
    ) {
      return;
    }

    const lower =
      title.toLowerCase();

    const isResult =
      lower.includes("result") ||
      title.includes("निकाल") ||
      lower.includes(
        "answer key"
      ) ||
      title.includes(
        "उत्तरतालिका"
      );

    if (!isResult) return;

    seen.add(link);

    jobs.push({
      id:
        `result-${getSlug(link) || index}`,

      title,

      slug: getSlug(link),

      url: link,

      categoryNames: [
        "निकाल",
      ],

      categorySlugs: [
        "result",
      ],

      type: "result",

      isNew: index < 5,
    });
  });

  return jobs.slice(0, 30);
}

/* =========================================================
   GENERIC PAGE
========================================================= */

async function fetchPage(url) {
  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept:
        "text/html,application/xhtml+xml",

      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36",

      "Accept-Language":
        "mr-IN,mr;q=0.9,en-US;q=0.8,en;q=0.7",

      "Cache-Control":
        "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Majhi Naukri returned ${response.status}`
    );
  }

  return response.text();
}

/* =========================================================
   MEGA / EXAM
========================================================= */

function parsePostLinks(
  html,
  source
) {
  const $ = cheerio.load(html);

  const jobs = [];

  const seen = new Set();

  $(
    "article a[href], .entry-content a[href], main a[href]"
  ).each((index, element) => {
    const link = absoluteUrl(
      $(element).attr("href")
    );

    const title = cleanText(
      $(element).text()
    );

    if (!link || !title) return;

    if (
      link === SITE ||
      link === `${SITE}/`
    ) {
      return;
    }

    if (seen.has(link)) return;

    const lowerTitle =
      title.toLowerCase();

    /*
     * NEVER allow Current Affairs.
     */

    if (
      lowerTitle.includes(
        "current affairs"
      ) ||
      title.includes(
        "चालू घडामोडी"
      )
    ) {
      return;
    }

    /*
     * Ignore navigation/tool links.
     */

    const ignored = [
      "home",
      "contact",
      "about",
      "privacy",
      "disclaimer",
      "career",
      "tools",
      "age calculator",
      "gst calculator",
      "image resizer",
      "image to pdf",
    ];

    if (
      ignored.some((item) =>
        lowerTitle === item
      )
    ) {
      return;
    }

    /*
     * Only Majhi Naukri internal posts.
     */

    if (!link.startsWith(SITE)) {
      return;
    }

    seen.add(link);

    jobs.push({
      id:
        `${source}-${getSlug(link) || index}`,

      title,

      slug: getSlug(link),

      url: link,

      categoryNames: [
        source === "mega"
          ? "मेगाभरती"
          : "परीक्षा",
      ],

      categorySlugs: [
        source === "mega"
          ? "mega-bharti"
          : "examination",
      ],

      type: source,

      isNew: jobs.length < 5,
    });
  });

  return jobs.slice(0, 30);
}

/* =========================================================
   SINGLE POST DETAILS
========================================================= */

function extractDetails(html) {
  const $ = cheerio.load(html);

  const text = cleanText(
    $("body").text()
  );

  const find = (patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        return cleanText(match[1]);
      }
    }

    return "";
  };

  let pdfLink = "";
  let applyLink = "";
  let officialLink = "";

  $("a[href]").each((_, element) => {
    const href = absoluteUrl(
      $(element).attr("href")
    );

    const linkText = cleanText(
      $(element).text()
    ).toLowerCase();

    if (!href) return;

    if (
      !pdfLink &&
      (
        href.toLowerCase().includes(".pdf") ||
        linkText.includes(
          "pdf"
        ) ||
        linkText.includes(
          "जाहिरात"
        ) ||
        linkText.includes(
          "notification"
        )
      )
    ) {
      pdfLink = href;
    }

    if (
      !applyLink &&
      (
        linkText.includes(
          "apply online"
        ) ||
        linkText === "apply" ||
        linkText.includes(
          "अर्ज करा"
        ) ||
        linkText.includes(
          "online application"
        )
      )
    ) {
      applyLink = href;
    }

    if (
      !officialLink &&
      (
        linkText.includes(
          "official website"
        ) ||
        linkText.includes(
          "अधिकृत वेबसाइट"
        )
      )
    ) {
      officialLink = href;
    }
  });

  return {
    advtNo: find([
      /जाहिरात\s*क्र\.?\s*:?\s*([^\n]+)/i,
      /Advertisement\s*No\.?\s*:?\s*([^\n]+)/i,
    ]),

    totalPosts: find([
      /Total\s*:?\s*([0-9,]+\s*(?:जागा|Posts)?)/i,
      /एकूण\s*:?\s*([0-9,]+\s*(?:जागा|पदे)?)/i,
    ]),

    education: find([
      /Educational Qualification\s*:?\s*([^\n]+)/i,
      /शैक्षणिक पात्रता\s*:?\s*([^\n]+)/i,
    ]),

    ageLimit: find([
      /Age Limit\s*:?\s*([^\n]+)/i,
      /वयाची अट\s*:?\s*([^\n]+)/i,
    ]),

    location: find([
      /Job Location\s*:?\s*([^\n]+)/i,
      /नोकरी ठिकाण\s*:?\s*([^\n]+)/i,
    ]),

    applyMethod: find([
      /Application Mode\s*:?\s*([^\n]+)/i,
      /अर्ज पद्धत\s*:?\s*([^\n]+)/i,
    ]),

    lastDate: find([
      /Last Date[^:\n]*:?\s*([^\n]+)/i,
      /शेवटची तारीख\s*:?\s*([^\n]+)/i,
    ]),

    pdfLink,

    applyLink,

    officialLink,

    content: $(".entry-content")
      .first()
      .html() || "",
  };
}

/* =========================================================
   HANDLER
========================================================= */

module.exports = async function handler(
  req,
  res
) {
  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  /*
   * Cache for 5 minutes.
   * This means your users don't repeatedly
   * hit Majhi Naukri.
   */

  res.setHeader(
    "Cache-Control",
    "s-maxage=300, stale-while-revalidate=600"
  );

  try {
    const source = String(
      req.query?.source ||
        "current"
    );

    const action = String(
      req.query?.action ||
        "feed"
    );

    /* =====================================
       SINGLE POST
    ===================================== */

    if (
      action === "post"
    ) {
      const slug = String(
        req.query?.slug || ""
      );

      if (!slug) {
        return res.status(400).json({
          success: false,
          error:
            "Post slug missing",
        });
      }

      const url =
        `${SITE}/${slug}/`;

      const html =
        await fetchPage(url);

      const details =
        extractDetails(html);

      return res.status(200).json({
        success: true,

        job: {
          slug,
          url,

          ...details,
        },
      });
    }

    /* =====================================
       CURRENT
    ===================================== */

    if (
      source === "current"
    ) {
      const html =
        await fetchPage(
          SOURCE_PAGES.current
        );

      const jobs =
        parseCurrentRecruitment(
          html
        );

      return res.status(200).json({
        success: true,
        source,
        total: jobs.length,
        jobs,
      });
    }

    /* =====================================
       HALL
    ===================================== */

    if (
      source === "hall"
    ) {
      const html =
        await fetchPage(
          SOURCE_PAGES.hall
        );

      const jobs =
        parseHallTicket(
          html
        );

      return res.status(200).json({
        success: true,
        source,
        total: jobs.length,
        jobs,
      });
    }

    /* =====================================
       RESULT
    ===================================== */

    if (
      source === "result"
    ) {
      const html =
        await fetchPage(
          SOURCE_PAGES.result
        );

      const jobs =
        parseResult(html);

      return res.status(200).json({
        success: true,
        source,
        total: jobs.length,
        jobs,
      });
    }

    /* =====================================
       MEGA
    ===================================== */

    if (
      source === "mega"
    ) {
      const html =
        await fetchPage(
          SOURCE_PAGES.mega
        );

      const jobs =
        parsePostLinks(
          html,
          "mega"
        );

      return res.status(200).json({
        success: true,
        source,
        total: jobs.length,
        jobs,
      });
    }

    /* =====================================
       EXAM
    ===================================== */

    if (
      source === "exam"
    ) {
      const html =
        await fetchPage(
          SOURCE_PAGES.exam
        );

      const jobs =
        parsePostLinks(
          html,
          "exam"
        );

      return res.status(200).json({
        success: true,
        source,
        total: jobs.length,
        jobs,
      });
    }

    return res.status(400).json({
      success: false,
      error:
        "Invalid source",
    });
  } catch (error) {
    console.error(
      "Majhi Naukri API error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error?.message ||
        "Unable to fetch Majhi Naukri",
    });
  }
};