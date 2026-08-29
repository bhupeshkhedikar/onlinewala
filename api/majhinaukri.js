const cheerio = require("cheerio");

const WP_API =
  "https://majhinaukri.in/wp-json/wp/v2";

const SITE =
  "https://majhinaukri.in";

const PAGE_SLUGS = {
  current: "current-recruitment",
  hall: "hall-ticket",
  result: "result",
};

const CATEGORY_ALIASES = {
  mega: [
    "megabharti",
    "mega-bharti",
    "mega-bharti-2",
    "mega-bharti-2026",
  ],

  exam: [
    "examination",
    "exam",
  ],
};

const BLOCKED_SLUGS = new Set([
  "current-affairs",
  "current_affairs",
  "current-affair",
]);

const BLOCKED_NAMES = [
  "current affairs",
  "चालू घडामोडी",
];

const DATE_REGEX =
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/;

/* =========================================================
   TEXT
========================================================= */

function cleanText(value = "") {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   URL
========================================================= */

function absoluteUrl(url = "") {
  if (!url) return "";

  try {
    return new URL(url, SITE).href;
  } catch {
    return "";
  }
}

function slugFromUrl(url = "") {
  try {
    const parsed = new URL(url, SITE);

    return (
      parsed.pathname
        .replace(/^\/|\/$/g, "")
        .split("/")
        .pop() || ""
    );
  } catch {
    return "";
  }
}

/* =========================================================
   DATE
========================================================= */

function parseDateDMY(value = "") {
  const match =
    cleanText(value).match(DATE_REGEX);

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

function isFutureOrToday(value) {
  const date = parseDateDMY(value);

  if (!date) return false;

  const today = new Date();

  const todayUTC = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    )
  );

  return date >= todayUTC;
}

function isRecent(value, days = 90) {
  if (!value) return false;

  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return (
    Date.now() - timestamp <=
    days *
      24 *
      60 *
      60 *
      1000
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

function getCategories(post) {
  return (
    post?._embedded?.["wp:term"] || []
  )
    .flat()
    .filter(
      (term) =>
        term?.taxonomy === "category"
    );
}

function isBlockedCategory(category) {
  const slug = String(
    category?.slug || ""
  ).toLowerCase();

  const name = String(
    category?.name || ""
  ).toLowerCase();

  if (BLOCKED_SLUGS.has(slug)) {
    return true;
  }

  return BLOCKED_NAMES.some((blocked) =>
    name.includes(blocked)
  );
}

function isBlockedPost(post) {
  return getCategories(post).some(
    isBlockedCategory
  );
}

/* =========================================================
   HTML EXTRACTION
========================================================= */

function extractJobData(html = "") {
  const $ = cheerio.load(html);

  const text = cleanText(
    $.root().text()
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

  return {
    advtNo: find([
      /जाहिरात\s*क्र\.?\s*:?\s*([^\n|]+)/i,
      /Advertisement\s*No\.?\s*:?\s*([^\n|]+)/i,
    ]),

    totalPosts: find([
      /एकूण\s*(?:पदे|जागा)\s*:?\s*([^\n|]+)/i,
      /Total\s*(?:Posts)?\s*:?\s*([0-9,]+)/i,
    ]),

    education: find([
      /शैक्षणिक\s*पात्रता\s*:?\s*([^\n|]+)/i,
      /Educational\s*Qualification\s*:?\s*([^\n|]+)/i,
    ]),

    ageLimit: find([
      /वयाची\s*अट\s*:?\s*([^\n|]+)/i,
      /Age\s*Limit\s*:?\s*([^\n|]+)/i,
    ]),

    location: find([
      /नोकरी\s*ठिकाण\s*:?\s*([^\n|]+)/i,
      /Job\s*Location\s*:?\s*([^\n|]+)/i,
    ]),

    applyMethod: find([
      /अर्ज\s*करण्याची\s*पद्धत\s*:?\s*([^\n|]+)/i,
      /Application\s*Mode\s*:?\s*([^\n|]+)/i,
    ]),

    lastDate: find([
      /Last\s*Date\s*of\s*Online\s*Application\s*:?\s*([^\n|]+)/i,
      /Online\s*अर्ज\s*करण्याची\s*शेवटची\s*तारीख\s*:?\s*([^\n|]+)/i,
      /शेवटची\s*तारीख\s*:?\s*([^\n|]+)/i,
    ]),
  };
}

/* =========================================================
   LINKS
========================================================= */

function extractLinks(html = "") {
  const $ = cheerio.load(html);

  let pdfLink = "";
  let applyLink = "";
  let officialLink = "";

  $("a[href]").each((_, element) => {
    const href = absoluteUrl(
      $(element).attr("href")
    );

    const text = cleanText(
      $(element).text()
    ).toLowerCase();

    const lowerHref =
      href.toLowerCase();

    if (
      !pdfLink &&
      (
        lowerHref.includes(".pdf") ||
        text.includes("जाहिरात") ||
        text.includes("notification") ||
        text.includes("advertisement")
      )
    ) {
      pdfLink = href;
    }

    if (
      !applyLink &&
      (
        text.includes("apply") ||
        text.includes("अर्ज") ||
        text.includes("online application")
      )
    ) {
      applyLink = href;
    }

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
  });

  return {
    pdfLink,
    applyLink,
    officialLink,
  };
}

/* =========================================================
   NORMALIZE WORDPRESS POST
========================================================= */

function normalizePost(post) {
  const content =
    post?.content?.rendered || "";

  const categories =
    getCategories(post);

  const title = cleanText(
    cheerio
      .load(
        post?.title?.rendered || ""
      )
      .text()
  );

  return {
    id: post?.id,

    title,

    slug: post?.slug || "",

    url: absoluteUrl(
      post?.link
    ),

    date: post?.date || "",

    modified:
      post?.modified || "",

    content,

    image:
      post?._embedded?.[
        "wp:featuredmedia"
      ]?.[0]?.source_url || "",

    categoryNames:
      categories.map(
        (category) =>
          category.name
      ),

    categorySlugs:
      categories.map(
        (category) =>
          category.slug
      ),

    ...extractJobData(content),

    ...extractLinks(content),
  };
}

/* =========================================================
   CURRENT RECRUITMENT PAGE
========================================================= */

function parseCurrentRecruitment(
  html = ""
) {
  const $ = cheerio.load(html);

  const jobs = [];

  $("table tr").each(
    (index, row) => {
      const cells =
        $(row).find("td");

      if (cells.length < 2) {
        return;
      }

      const titleCell =
        cells.eq(0);

      const dateCell =
        cells.eq(1);

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

      if (!title || !link) {
        return;
      }

      if (
        /job title/i.test(
          title
        )
      ) {
        return;
      }

      if (
        /current affairs/i.test(
          title
        ) ||
        /चालू घडामोडी/.test(
          title
        )
      ) {
        return;
      }

      jobs.push({
        id:
          `current-${slugFromUrl(
            link
          ) || index}`,

        title,

        slug:
          slugFromUrl(link),

        url: link,

        lastDate,

        categoryNames: [
          "वर्तमान भरती:2026",
        ],

        categorySlugs: [
          "current-recruitment",
        ],

        type: "recruitment",
      });
    }
  );

  return jobs;
}

/* =========================================================
   HALL TICKET
========================================================= */

function parseHallTicket(
  html = ""
) {
  const $ = cheerio.load(html);

  const jobs = [];

  $("table tr").each(
    (index, row) => {
      const cells =
        $(row).find("td");

      if (cells.length < 2) {
        return;
      }

      const titleCell =
        cells.eq(0);

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

      if (!title || !link) {
        return;
      }

      if (
        /examination/i.test(
          title
        ) &&
        /exam date/i.test(
          examDate
        )
      ) {
        return;
      }

      jobs.push({
        id:
          `hall-${slugFromUrl(
            link
          ) || index}`,

        title,

        slug:
          slugFromUrl(link),

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
      });
    }
  );

  return jobs;
}

/* =========================================================
   RESULTS
========================================================= */

function parseResults(
  html = ""
) {
  const $ = cheerio.load(html);

  const jobs = [];

  const seen = new Set();

  $(
    "main a[href], .entry-content a[href], article a[href]"
  ).each((_, element) => {
    const href = absoluteUrl(
      $(element).attr("href")
    );

    const title = cleanText(
      $(element).text()
    );

    if (
      !href ||
      !title ||
      seen.has(href)
    ) {
      return;
    }

    if (
      !href.startsWith(SITE)
    ) {
      return;
    }

    if (
      href === `${SITE}/result/` ||
      href === `${SITE}/`
    ) {
      return;
    }

    const lower =
      title.toLowerCase();

    const isResult =
      lower.includes("result") ||
      lower.includes(
        "answer key"
      ) ||
      title.includes("निकाल") ||
      title.includes(
        "उत्तरतालिका"
      );

    if (!isResult) {
      return;
    }

    seen.add(href);

    jobs.push({
      id:
        `result-${slugFromUrl(
          href
        ) || jobs.length}`,

      title,

      slug:
        slugFromUrl(href),

      url: href,

      categoryNames: [
        "निकाल",
      ],

      categorySlugs: [
        "result",
      ],

      type: "result",
    });
  });

  return jobs;
}

/* =========================================================
   WORDPRESS API
========================================================= */

async function wpFetch(path) {
  const response =
    await fetch(
      `${WP_API}${path}`,
      {
        headers: {
          Accept:
            "application/json",

          "User-Agent":
            "MajhiNaukriJobsWidget/2.0",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `WordPress API ${response.status}`
    );
  }

  return response.json();
}

/* =========================================================
   PAGE
========================================================= */

async function getPage(slug) {
  const pages =
    await wpFetch(
      `/pages?slug=${encodeURIComponent(
        slug
      )}&per_page=1`
    );

  if (
    !Array.isArray(pages) ||
    !pages[0]
  ) {
    throw new Error(
      `Page not found: ${slug}`
    );
  }

  return pages[0];
}

/* =========================================================
   CATEGORY
========================================================= */

async function resolveCategoryId(
  aliases
) {
  const categories =
    await wpFetch(
      "/categories?per_page=100&hide_empty=false"
    );

  for (const alias of aliases) {
    const found =
      categories.find(
        (category) =>
          String(
            category.slug
          ).toLowerCase() ===
          alias.toLowerCase()
      );

    if (found) {
      return found.id;
    }
  }

  return null;
}

/* =========================================================
   CATEGORY POSTS
========================================================= */

async function getCategoryPosts(
  source
) {
  const aliases =
    CATEGORY_ALIASES[source];

  const categoryId =
    await resolveCategoryId(
      aliases
    );

  if (!categoryId) {
    throw new Error(
      `Category not found: ${source}`
    );
  }

  const posts =
    await wpFetch(
      `/posts?_embed=1&categories=${categoryId}&per_page=50&orderby=date&order=desc`
    );

  return posts
    .filter(
      (post) =>
        !isBlockedPost(post)
    )
    .map(normalizePost);
}

/* =========================================================
   SINGLE POST
========================================================= */

async function getPostBySlug(
  slug
) {
  if (!slug) {
    throw new Error(
      "Missing slug"
    );
  }

  const posts =
    await wpFetch(
      `/posts?slug=${encodeURIComponent(
        slug
      )}&_embed=1&per_page=1`
    );

  if (!posts?.[0]) {
    throw new Error(
      "Post not found"
    );
  }

  if (
    isBlockedPost(
      posts[0]
    )
  ) {
    throw new Error(
      "Blocked category"
    );
  }

  return normalizePost(
    posts[0]
  );
}

/* =========================================================
   FILTER LATEST
========================================================= */

function filterLatest(
  source,
  jobs
) {
  if (source === "current") {
    return jobs
      .filter(
        (job) =>
          isFutureOrToday(
            job.lastDate
          )
      )
      .slice(0, 30);
  }

  if (source === "mega") {
    return jobs
      .filter(
        (job) =>
          !isBlockedPost(job)
      )
      .filter(
        (job) =>
          isFutureOrToday(
            job.lastDate
          )
      )
      .slice(0, 30);
  }

  if (source === "exam") {
    return jobs
      .filter(
        (job) =>
          !isBlockedPost(job)
      )
      .filter(
        (job) =>
          isRecent(
            job.modified ||
              job.date,
            90
          )
      )
      .slice(0, 30);
  }

  if (source === "hall") {
    return jobs
      .slice(0, 20);
  }

  if (source === "result") {
    return jobs
      .slice(0, 20);
  }

  return [];
}

/* =========================================================
   VERCEL HANDLER
========================================================= */

module.exports =
  async function handler(
    req,
    res
  ) {
    res.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate=600"
    );

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
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

      /* ---------------------------------
         SINGLE POST
      --------------------------------- */

      if (
        action === "post"
      ) {
        const slug = String(
          req.query?.slug || ""
        );

        const job =
          await getPostBySlug(
            slug
          );

        return res.status(200).json({
          success: true,
          job,
        });
      }

      /* ---------------------------------
         CURRENT RECRUITMENT
      --------------------------------- */

      if (
        source === "current"
      ) {
        const page =
          await getPage(
            PAGE_SLUGS.current
          );

        const jobs =
          parseCurrentRecruitment(
            page.content
              ?.rendered || ""
          );

        const latest =
          filterLatest(
            "current",
            jobs
          );

        return res.status(200).json({
          success: true,
          source,
          jobs: latest,
          total: latest.length,
        });
      }

      /* ---------------------------------
         HALL TICKET
      --------------------------------- */

      if (
        source === "hall"
      ) {
        const page =
          await getPage(
            PAGE_SLUGS.hall
          );

        const jobs =
          parseHallTicket(
            page.content
              ?.rendered || ""
          );

        const latest =
          filterLatest(
            "hall",
            jobs
          );

        return res.status(200).json({
          success: true,
          source,
          jobs: latest,
          total: latest.length,
        });
      }

      /* ---------------------------------
         RESULT
      --------------------------------- */

      if (
        source === "result"
      ) {
        const page =
          await getPage(
            PAGE_SLUGS.result
          );

        const jobs =
          parseResults(
            page.content
              ?.rendered || ""
          );

        const latest =
          filterLatest(
            "result",
            jobs
          );

        return res.status(200).json({
          success: true,
          source,
          jobs: latest,
          total: latest.length,
        });
      }

      /* ---------------------------------
         MEGA / EXAM
      --------------------------------- */

      if (
        source === "mega" ||
        source === "exam"
      ) {
        const posts =
          await getCategoryPosts(
            source
          );

        const latest =
          filterLatest(
            source,
            posts
          );

        return res.status(200).json({
          success: true,
          source,
          jobs: latest,
          total: latest.length,
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
          error instanceof Error
            ? error.message
            : "Unable to fetch job updates",
      });
    }
  };