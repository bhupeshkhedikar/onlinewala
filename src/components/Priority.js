import "./Priority.css";

export default function Priority() {
  return (
    <div className="priority-wrapper">
      <div className="priority-widget">
        
        {/* Left Side: Info */}
        <div className="priority-content">
          <div className="priority-badge">👑 VIP ACCESS</div>
          <h2 className="priority-title">Fast Track Priority Service</h2>
          <p className="priority-subtitle">
            Skip the regular queue. Get instant support and priority processing for all your applications.
          </p>
        </div>

        {/* Right Side: Action Button */}
        <button className="priority-cta">
          Comming Soon...
        </button>
{/* ➔ */}
        {/* Decorative Glow */}
        <div className="priority-glow"></div>
      </div>
    </div>
  );
}