import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

export default function Charts({ users = [], bookings = [] }) {
  const chartRef = useRef(null);
  const canvasRef = useRef(null);
  
  // 🔥 State to track the active filter
  const [filter, setFilter] = useState("monthly"); // Default to monthly

  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 1. Prepare empty data arrays and labels based on the selected filter
    let labels = [];
    let paidData = [];
    let pendingData = [];
    
    let yearlyPaidMap = {}; 
    let yearlyPendingMap = {}; 

    if (filter === "daily") {
      labels = Array.from({ length: daysInCurrentMonth }, (_, i) => `${i + 1}`);
      paidData = Array(daysInCurrentMonth).fill(0);
      pendingData = Array(daysInCurrentMonth).fill(0);
    } else if (filter === "monthly") {
      labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      paidData = Array(12).fill(0);
      pendingData = Array(12).fill(0);
    }

    // Helper function to bin the data into the correct arrays
    const addDataToChart = (dateObj, amount, isPaid) => {
      if (!dateObj || isNaN(dateObj.getTime())) return;

      const appYear = dateObj.getFullYear();
      const appMonth = dateObj.getMonth();
      const appDate = dateObj.getDate();

      if (filter === "daily") {
        if (appYear === currentYear && appMonth === currentMonth) {
          if (isPaid) paidData[appDate - 1] += amount;
          else pendingData[appDate - 1] += amount;
        }
      } else if (filter === "monthly") {
        if (appYear === currentYear) {
          if (isPaid) paidData[appMonth] += amount;
          else pendingData[appMonth] += amount;
        }
      } else if (filter === "yearly") {
        if (!yearlyPaidMap[appYear]) yearlyPaidMap[appYear] = 0;
        if (!yearlyPendingMap[appYear]) yearlyPendingMap[appYear] = 0;

        if (isPaid) yearlyPaidMap[appYear] += amount;
        else yearlyPendingMap[appYear] += amount;
      }
    };

    // 2. Loop through USERS (Offline Applications)
    users.forEach(u => {
      u.applications?.forEach(app => {
        let dateObj = app.date?.seconds ? new Date(app.date.seconds * 1000) : new Date(app.date);
        
        let serviceChargeTotal = Number(app.serviceCharge) || 0;
        if (app.extraServices && Array.isArray(app.extraServices)) {
          app.extraServices.forEach(extra => {
            serviceChargeTotal += Number(extra.serviceCharge) || 0;
          });
        }

        const isPaid = app.paid === true || app.paid === "true";
        addDataToChart(dateObj, serviceChargeTotal, isPaid);
      });
    });

    // 3. Loop through BOOKINGS (Online Services)
    bookings.forEach(b => {
      // Use createdAt timestamp if available, fallback to date string
      let dateObj = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.date);
      
      let serviceChargeTotal = Number(b.serviceCharge) || 0;
      const isPaid = b.paymentStatus === "Paid";
      
      addDataToChart(dateObj, serviceChargeTotal, isPaid);
    });

    // 4. Finalize yearly data formatting
    if (filter === "yearly") {
      // Get all unique years from both maps
      const allYears = Array.from(new Set([...Object.keys(yearlyPaidMap), ...Object.keys(yearlyPendingMap)])).sort();
      labels = allYears;
      paidData = allYears.map(year => yearlyPaidMap[year] || 0);
      pendingData = allYears.map(year => yearlyPendingMap[year] || 0);
    }

    // 🔥 destroy previous chart to prevent overlapping
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // 🔥 create new chart with TWO datasets
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Paid Income",
            data: paidData,
            backgroundColor: "rgba(16, 185, 129, 0.7)", // Emerald Green
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: "Pending Payments",
            data: pendingData,
            backgroundColor: "rgba(245, 158, 11, 0.7)", // Amber/Orange
            borderColor: "rgba(245, 158, 11, 1)",
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true, // Show the legend so admin knows Green = Paid, Orange = Pending
            position: "top",
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value; 
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [users, bookings, filter]); // 🔥 Re-run effect if users, bookings, or filter changes

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
      {/* Analytics Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#111827", fontSize: "18px" }}>Revenue Overview</h3>
        <div style={{ display: "flex", gap: "5px", background: "#f3f4f6", padding: "4px", borderRadius: "8px" }}>
          <button 
            onClick={() => setFilter("daily")}
            style={getBtnStyle(filter === "daily")}
          >
            Daily
          </button>
          <button 
            onClick={() => setFilter("monthly")}
            style={getBtnStyle(filter === "monthly")}
          >
            Monthly
          </button>
          <button 
            onClick={() => setFilter("yearly")}
            style={getBtnStyle(filter === "yearly")}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ height: "300px", width: "100%" }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

// Quick helper for styling the toggle buttons
const getBtnStyle = (isActive) => ({
  padding: "6px 14px",
  border: "none",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.2s",
  background: isActive ? "#ffffff" : "transparent",
  color: isActive ? "#111827" : "#6b7280",
  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
});