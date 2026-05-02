import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const navItems = [
    { name: "Home", path: "/" },
    { name: "रेजूम बनवा", path: "/resume-builder" },
    { name: "लग्न बायोडाटा बनवा", path: "/biodata-builder" },
    { name: "वय मोजा", path: "/age-calculator" },
    { name: "Status", path: "/status" },
  ];

  return (
    <nav className="saas-navbar">
      <div className="nav-scroll-container">
        {navItems.map((item, index) => (
          <Link key={index} to={item.path} className="nav-item">
            {item.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}