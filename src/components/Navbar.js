import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    {
      name: "मुखपृष्ठ",
      path: "/",
      icon: "⌂",
    },
    {
      name: "रेजूम बनवा",
      path: "/resume-builder",
      icon: "✦",
    },
    {
      name: "लग्न बायोडाटा बनवा",
      path: "/biodata-builder",
      icon: "♡",
    },
    {
      name: "वय मोजा",
      path: "/age-calculator",
      icon: "◷",
    },
  ];

  return (
    <nav className="main-saas-navbar">
      <div className="main-nav-glow"></div>

      <div className="main-nav-wrapper">
        <div className="main-nav-pills">

          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`main-nav-link ${
                  isActive
                    ? "main-nav-link-active"
                    : ""
                }`}
              >
                <span className="main-nav-link-icon">
                  {item.icon}
                </span>

                <span className="main-nav-link-text">
                  {item.name}
                </span>

                {isActive && (
                  <span className="main-nav-active-dot"></span>
                )}
              </Link>
            );
          })}

        </div>
      </div>
    </nav>
  );
}