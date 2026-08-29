import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10.8 12 3l9 7.8" />
      <path d="M5.5 9.8V21h13V9.8" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8h7" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h4.5" />
      <path d="M9 3.5V2.5h6v1" />
    </svg>
  );
}

function BiodataIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5S4.5 16 4.5 9.7C4.5 6.8 6.3 5 8.7 5c1.5 0 2.7.8 3.3 2 0.6-1.2 1.8-2 3.3-2 2.4 0 4.2 1.8 4.2 4.7C19.5 16 12 20.5 12 20.5Z" />
    </svg>
  );
}

function AgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function BottomNav() {
  const location = useLocation();

  const items = [
    {
      name: "मुखपृष्ठ",
      path: "/",
      icon: <HomeIcon />,
    },
    {
      name: "रेजूम",
      path: "/resume-builder",
      icon: <ResumeIcon />,
    },
    {
      name: "बायोडाटा",
      path: "/biodata-builder",
      icon: <BiodataIcon />,
    },
    {
      name: "वय मोजा",
      path: "/age-calculator",
      icon: <AgeIcon />,
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="ow-bottom-nav">
      <div className="ow-bottom-nav-glow" />

      <div className="ow-bottom-bar">

        {/* LEFT */}
        <div className="ow-bottom-group">
          {items.slice(0, 2).map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`ow-nav-item ${
                  active ? "ow-nav-item-active" : ""
                }`}
              >
                <span className="ow-nav-icon">
                  {item.icon}
                </span>

                <span className="ow-nav-label">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* CENTER CREATE BUTTON */}
        <Link
          to="/resume-builder"
          className="ow-create-button"
          aria-label="नवीन रेजूम बनवा"
        >
          <span className="ow-create-button-inner">
            <PlusIcon />
          </span>

          <span className="ow-create-button-shine" />
        </Link>

        {/* RIGHT */}
        <div className="ow-bottom-group">
          {items.slice(2, 4).map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`ow-nav-item ${
                  active ? "ow-nav-item-active" : ""
                }`}
              >
                <span className="ow-nav-icon">
                  {item.icon}
                </span>

                <span className="ow-nav-label">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}