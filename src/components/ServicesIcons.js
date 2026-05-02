import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import BookingModal from "./BookingModal";
import "./ServicesIcons.css";

export default function ServicesIcons({ user, onLoginRequest }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, "services"));
        const fetchedServices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setServices(fetchedServices);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleServiceClick = (serviceName) => {
    if (!user) {
      if (onLoginRequest) {
        onLoginRequest(); 
      } else {
        alert("Please login first to book a service!");
      }
      return;
    }
    setSelectedService(serviceName);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="services-container" style={{  marginTop:"5 0px"}}>
        <div className="servicesRow">
          {loading ? (
            <p className="status-text">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="status-text">No services available right now.</p>
          ) : (
            services.map((svc) => (
              <div 
                key={svc.id} 
                className="serviceItem" 
                onClick={() => handleServiceClick(svc.name)}
              >
                <div className="icon-container">
                  {svc.imageUrl ? (
                    <img className="icon-img" src={svc.imageUrl} alt={svc.name} />
                  ) : (
                    <div className="icon-fallback">No Img</div>
                  )}
                </div>
                <p className="service-name">{svc.name}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <BookingModal 
          user={user} 
          initialData={{ service: selectedService, date: "", time: "" }}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}