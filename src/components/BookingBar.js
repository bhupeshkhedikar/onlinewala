import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import BookingModal from "./BookingModal";
import "./BookingBar.css";

// 🔥 Accept 'user' prop and 'onLoginRequest' function
export default function BookingBar({ user, onLoginRequest }) {
  // State to hold user selections
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔥 State for dynamic services list
  const [servicesList, setServicesList] = useState([]);

  // 🔥 Fetch services dynamically when the component loads
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, "services"));
        // Hum sirf service ka naam (name) nikal rahe hain dropdown ke liye
        const names = snapshot.docs.map(doc => doc.data().name);
        setServicesList(names);
      } catch (error) {
        console.error("Error fetching services for BookingBar:", error);
      }
    };
    
    fetchServices();
  }, []);

  // Generate time slots (10:00 AM → 9:00 PM, 30 min)
  const generateTimeSlots = () => {
    const slots = [];
    let startHour = 10;
    let endHour = 21;

    for (let h = startHour; h < endHour; h++) {
      slots.push(formatTime(h, 0));
      slots.push(formatTime(h, 30));
    }
    return slots;
  };

  const formatTime = (hour, min) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = min === 0 ? "00" : min;
    return `${h}:${m} ${ampm}`;
  };

  const timeSlots = generateTimeSlots();

  const handleNextClick = () => {
    // 1. Check if user is logged in
    if (!user) {
      if (onLoginRequest) {
        onLoginRequest(); // Redirects to Login page smoothly
      } else {
        alert("सेवा बुक करण्यासाठी कृपया प्रथम लॉग इन करा!");
      }
      return;
    }

    // 2. Validate if all fields are selected
    if (!selectedService || !selectedDate || !selectedTime) {
      alert("पुढे जाण्यासाठी कृपया सेवा, तारीख आणि वेळ निवडा.");
      return;
    }

    // 3. Open Modal
    setIsModalOpen(true);
  };

  return (
    <div className="bookingBar-wrapper">
      <div className="bookingBar">
        
        {/* 🔥 NAYA CENTERED TITLE */}
        <h3 className="bookingBar-title">सेवा बुक करा</h3>
        
        {/* 🔥 DYNAMIC SERVICES DROPDOWN WITH DEFAULT PLACEHOLDER */}
        <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
          <option value="" disabled hidden>सेवा निवडा</option>
          {servicesList.length === 0 ? (
            <option value="" disabled>सेवा लोड होत आहेत...</option>
          ) : (
            servicesList.map((svcName, i) => (
              <option key={i} value={svcName}>{svcName}</option>
            ))
          )}
        </select>

        {/* 🔥 DATE INPUT WITH SMART PLACEHOLDER */}
        <input 
          type={selectedDate ? "date" : "text"} 
          placeholder="तारीख निवडा"
          onFocus={(e) => (e.target.type = "date")}
          onBlur={(e) => {
            if (!selectedDate) e.target.type = "text";
          }}
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
        />

        {/* 🔥 TIME DROPDOWN WITH DEFAULT PLACEHOLDER */}
        <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
          <option value="" disabled hidden>वेळ निवडा</option>
          {timeSlots.map((slot, i) => (
            <option key={i} value={slot}>{slot}</option>
          ))}
        </select>

        <button onClick={handleNextClick}>आता बुक करा</button>
      </div>

      {/* Render Modal if open and pass the pre-selected data */}
      {isModalOpen && (
        <BookingModal 
          user={user} 
          initialData={{ service: selectedService, date: selectedDate, time: selectedTime }}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}