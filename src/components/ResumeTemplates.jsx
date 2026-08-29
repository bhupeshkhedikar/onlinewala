import React from "react";

export const RESUME_TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional & formal",
    icon: "📄",
  },
  {
    id: "modern",
    name: "Modern Blue",
    description: "Clean & professional",
    icon: "💼",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Premium & stylish",
    icon: "✦",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple & ATS friendly",
    icon: "◫",
  },
  {
    id: "professional",
    name: "Professional",
    description: "Corporate two-column",
    icon: "▣",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Modern & attractive",
    icon: "🎨",
  },
];

export default function ResumeTemplates({
  data,
  template,
}) {
  const personalRows = (
    <>
      <tr>
        <td>NAME</td>
        <td>: {data.name}</td>
      </tr>

      {data.personalInfo.map((item) => (
        <tr key={item.id}>
          <td>{item.label}</td>
          <td>: {item.value}</td>
        </tr>
      ))}
    </>
  );

  const educationRows = data.education.map(
    (edu, index) => (
      <tr key={edu.id}>
        <td>{index + 1}</td>
        <td>{edu.exam}</td>
        <td>{edu.board}</td>
        <td>{edu.year}</td>
        <td>{edu.percentage}</td>
      </tr>
    )
  );

  /* =====================================================
     CLASSIC
  ===================================================== */

  if (template === "classic") {
    return (
      <div className="rb-template rb-template-classic">

        <h1 className="rb-classic-title">
          RESUME
        </h1>

        <div className="rb-classic-header">
          <p>
            <strong>NAME:- </strong>
            {data.name}
          </p>

          <p>
            <strong>ADD: </strong>
            {data.address
              .split("\n")
              .map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
          </p>

          <p>
            <strong>CONTACT NO.:</strong>{" "}
            {data.contact}
          </p>

          <p>
            <strong>EMAIL ID.:</strong>{" "}
            {data.email}
          </p>
        </div>

        <ClassicSection title="CAREER OBJECTIVE">
          <p>{data.objective}</p>
        </ClassicSection>

        <ClassicSection
          title={data.personalInfoTitle}
        >
          <table className="rb-classic-table">
            <tbody>{personalRows}</tbody>
          </table>
        </ClassicSection>

        <ClassicSection
          title={data.educationTitle}
        >
          <table className="rb-classic-education">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Name of Exam</th>
                <th>Board/University</th>
                <th>Year of Passing</th>
                <th>Percentage</th>
              </tr>
            </thead>

            <tbody>
              {educationRows}
            </tbody>
          </table>
        </ClassicSection>

        <ClassicSection
          title={data.declarationTitle}
        >
          <p>
            I hereby declare that the Information
            giving above is true to the best of my
            knowledge.
          </p>
        </ClassicSection>

        <div className="rb-classic-footer">
          <div>
            <p>
              {data.dateLabel}{" "}
              {data.dateValue}
            </p>

            <p>
              {data.placeLabel}{" "}
              {data.placeValue}
            </p>
          </div>

          <div>
            <p>{data.signOff}</p>
            <br />
            <br />
            <strong>{data.signature}</strong>
          </div>
        </div>

      </div>
    );
  }

  /* =====================================================
     MODERN BLUE
  ===================================================== */

  if (template === "modern") {
    return (
      <div className="rb-template rb-template-modern">

        <div className="rb-modern-header">

          <div className="rb-modern-avatar">
            {data.name
              ? data.name.charAt(0)
              : "R"}
          </div>

          <div>
            <h1>{data.name}</h1>

            <p>
              {data.contact}{" "}
              •{" "}
              {data.email}
            </p>
          </div>

        </div>

        <div className="rb-modern-address">
          {data.address
            .split("\n")
            .join(" • ")}
        </div>

        <ModernSection title="Career Objective">
          <p>{data.objective}</p>
        </ModernSection>

        <ModernSection
          title={data.personalInfoTitle}
        >
          <div className="rb-modern-personal-grid">
            {data.personalInfo.map(
              (item) => (
                <div
                  key={item.id}
                  className="rb-modern-info"
                >
                  <span>
                    {item.label}
                  </span>

                  <strong>
                    {item.value}
                  </strong>
                </div>
              )
            )}
          </div>
        </ModernSection>

        <ModernSection
          title={data.educationTitle}
        >
          <table className="rb-modern-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Board / University</th>
                <th>Year</th>
                <th>Percentage</th>
              </tr>
            </thead>

            <tbody>
              {data.education.map(
                (edu) => (
                  <tr key={edu.id}>
                    <td>{edu.exam}</td>
                    <td>{edu.board}</td>
                    <td>{edu.year}</td>
                    <td>
                      {edu.percentage}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </ModernSection>

        <ModernSection
          title={data.declarationTitle}
        >
          <p>
            I hereby declare that the
            information given above is true
            to the best of my knowledge.
          </p>
        </ModernSection>

        <div className="rb-modern-footer">
          <div>
            {data.dateLabel}{" "}
            {data.dateValue}
            <br />
            {data.placeLabel}{" "}
            {data.placeValue}
          </div>

          <div>
            {data.signOff}
            <br />
            <br />
            <strong>{data.signature}</strong>
          </div>
        </div>

      </div>
    );
  }

  /* =====================================================
     ELEGANT
  ===================================================== */

  if (template === "elegant") {
    return (
      <div className="rb-template rb-template-elegant">

        <div className="rb-elegant-top">

          <span className="rb-elegant-small">
            PROFESSIONAL RESUME
          </span>

          <h1>{data.name}</h1>

          <p>
            {data.contact} &nbsp; | &nbsp;
            {data.email}
          </p>

        </div>

        <div className="rb-elegant-body">

          <ElegantSection title="Profile">
            <p>{data.objective}</p>
          </ElegantSection>

          <ElegantSection
            title={data.personalInfoTitle}
          >
            <div className="rb-elegant-info">
              {data.personalInfo.map(
                (item) => (
                  <div key={item.id}>
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.value}
                    </strong>
                  </div>
                )
              )}
            </div>
          </ElegantSection>

          <ElegantSection
            title={data.educationTitle}
          >
            {data.education.map(
              (edu) => (
                <div
                  className="rb-elegant-education"
                  key={edu.id}
                >
                  <div>
                    <strong>
                      {edu.exam}
                    </strong>

                    <span>
                      {edu.board}
                    </span>
                  </div>

                  <div>
                    <strong>
                      {edu.year}
                    </strong>

                    <span>
                      {edu.percentage}
                    </span>
                  </div>
                </div>
              )
            )}
          </ElegantSection>

          <ElegantSection
            title={data.declarationTitle}
          >
            <p>
              I hereby declare that the
              information given above is true
              to the best of my knowledge.
            </p>
          </ElegantSection>

        </div>

        <div className="rb-elegant-footer">
          <span>
            {data.dateLabel}{" "}
            {data.dateValue}
          </span>

          <span>
            {data.placeLabel}{" "}
            {data.placeValue}
          </span>

          <strong>
            {data.signature}
          </strong>
        </div>

      </div>
    );
  }

  /* =====================================================
     MINIMAL
  ===================================================== */

  if (template === "minimal") {
    return (
      <div className="rb-template rb-template-minimal">

        <header>
          <h1>{data.name}</h1>

          <div>
            {data.contact}
            {"  "}•{"  "}
            {data.email}
          </div>

          <p>
            {data.address
              .split("\n")
              .join(", ")}
          </p>
        </header>

        <MinimalSection title="Objective">
          {data.objective}
        </MinimalSection>

        <MinimalSection
          title={data.personalInfoTitle}
        >
          <div className="rb-minimal-list">
            {data.personalInfo.map(
              (item) => (
                <div key={item.id}>
                  <strong>
                    {item.label}
                  </strong>

                  <span>
                    {item.value}
                  </span>
                </div>
              )
            )}
          </div>
        </MinimalSection>

        <MinimalSection
          title={data.educationTitle}
        >
          <div className="rb-minimal-education">

            {data.education.map(
              (edu) => (
                <div key={edu.id}>
                  <strong>
                    {edu.exam}
                  </strong>

                  <span>
                    {edu.board}
                  </span>

                  <span>
                    {edu.year}
                  </span>

                  <span>
                    {edu.percentage}
                  </span>
                </div>
              )
            )}

          </div>
        </MinimalSection>

        <MinimalSection
          title={data.declarationTitle}
        >
          I hereby declare that the
          information given above is true
          to the best of my knowledge.
        </MinimalSection>

        <footer>
          <span>
            {data.dateLabel}{" "}
            {data.dateValue}
          </span>

          <span>
            {data.placeLabel}{" "}
            {data.placeValue}
          </span>

          <strong>
            {data.signature}
          </strong>
        </footer>

      </div>
    );
  }

  /* =====================================================
     PROFESSIONAL TWO COLUMN
  ===================================================== */

  if (template === "professional") {
    return (
      <div className="rb-template rb-template-professional">

        <aside className="rb-professional-sidebar">

          <div className="rb-professional-avatar">
            {data.name
              ? data.name.charAt(0)
              : "R"}
          </div>

          <h1>{data.name}</h1>

          <div className="rb-professional-contact">
            <p>{data.contact}</p>
            <p>{data.email}</p>
          </div>

          <div className="rb-professional-side-section">

            <h3>
              PERSONAL
            </h3>

            {data.personalInfo.map(
              (item) => (
                <div key={item.id}>
                  <span>
                    {item.label}
                  </span>

                  <strong>
                    {item.value}
                  </strong>
                </div>
              )
            )}

          </div>

        </aside>

        <main className="rb-professional-main">

          <ProfessionalSection title="Career Objective">
            <p>{data.objective}</p>
          </ProfessionalSection>

          <ProfessionalSection
            title={data.educationTitle}
          >
            {data.education.map(
              (edu) => (
                <div
                  className="rb-professional-edu"
                  key={edu.id}
                >
                  <div>
                    <strong>
                      {edu.exam}
                    </strong>

                    <span>
                      {edu.board}
                    </span>
                  </div>

                  <div>
                    {edu.year}
                    <br />
                    {edu.percentage}
                  </div>
                </div>
              )
            )}
          </ProfessionalSection>

          <ProfessionalSection
            title={data.declarationTitle}
          >
            <p>
              I hereby declare that the
              information given above is
              true to the best of my
              knowledge.
            </p>
          </ProfessionalSection>

          <div className="rb-professional-footer">
            <span>
              {data.dateLabel}{" "}
              {data.dateValue}
            </span>

            <span>
              {data.placeLabel}{" "}
              {data.placeValue}
            </span>

            <strong>
              {data.signature}
            </strong>
          </div>

        </main>

      </div>
    );
  }

  /* =====================================================
     CREATIVE
  ===================================================== */

  return (
    <div className="rb-template rb-template-creative">

      <div className="rb-creative-header">

        <div className="rb-creative-circle">
          {data.name
            ? data.name.charAt(0)
            : "R"}
        </div>

        <div>
          <h1>{data.name}</h1>

          <p>
            {data.contact}
            {" • "}
            {data.email}
          </p>
        </div>

      </div>

      <div className="rb-creative-content">

        <div className="rb-creative-section">

          <span className="rb-creative-label">
            ABOUT ME
          </span>

          <p>{data.objective}</p>

        </div>

        <div className="rb-creative-section">

          <span className="rb-creative-label">
            PERSONAL DETAILS
          </span>

          <div className="rb-creative-grid">

            {data.personalInfo.map(
              (item) => (
                <div key={item.id}>
                  <small>
                    {item.label}
                  </small>

                  <strong>
                    {item.value}
                  </strong>
                </div>
              )
            )}

          </div>

        </div>

        <div className="rb-creative-section">

          <span className="rb-creative-label">
            {data.educationTitle}
          </span>

          <div className="rb-creative-education">

            {data.education.map(
              (edu, index) => (
                <div key={edu.id}>

                  <span>
                    0{index + 1}
                  </span>

                  <div>
                    <strong>
                      {edu.exam}
                    </strong>

                    <p>
                      {edu.board}
                    </p>
                  </div>

                  <div>
                    <strong>
                      {edu.year}
                    </strong>

                    <p>
                      {edu.percentage}
                    </p>
                  </div>

                </div>
              )
            )}

          </div>

        </div>

        <div className="rb-creative-section">

          <span className="rb-creative-label">
            DECLARATION
          </span>

          <p>
            I hereby declare that the
            information given above is
            true to the best of my
            knowledge.
          </p>

        </div>

      </div>

      <div className="rb-creative-footer">
        <span>
          {data.dateLabel}{" "}
          {data.dateValue}
        </span>

        <span>
          {data.placeLabel}{" "}
          {data.placeValue}
        </span>

        <strong>
          {data.signature}
        </strong>
      </div>

    </div>
  );
}


/* =========================================================
   SECTION HELPERS
========================================================= */

function ClassicSection({
  title,
  children,
}) {
  return (
    <section className="rb-classic-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ModernSection({
  title,
  children,
}) {
  return (
    <section className="rb-modern-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ElegantSection({
  title,
  children,
}) {
  return (
    <section className="rb-elegant-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MinimalSection({
  title,
  children,
}) {
  return (
    <section className="rb-minimal-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function ProfessionalSection({
  title,
  children,
}) {
  return (
    <section className="rb-professional-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}