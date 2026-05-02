import "./JobBanner.css";

export default function JobBanner() {
  return (
    <div className="jobBanner">
      <div className="left">
        <h3>नोकरी अपडेट्स</h3>
        <p>आता अर्ज करा</p>
      </div>

      <div className="right">
        <img
          src="https://i.ibb.co/VYcVMpdf/Chat-GPT-Image-Apr-9-2026-10-03-40-PM.png"
          alt="job illustration"
        />
      </div>
    </div>
  );
}