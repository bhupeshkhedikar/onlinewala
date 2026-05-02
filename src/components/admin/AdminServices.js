import { useEffect, useState } from "react";
import { db, storage } from "./firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState(""); // 🔥 New State for Description
  const [docs, setDocs] = useState(""); 
  const [govtFee, setGovtFee] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "services"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (service = null) => {
    setImageFile(null); 
    if (service) {
      setEditingId(service.id);
      setName(service.name);
      setDescription(service.description || ""); // 🔥 Set Description
      setDocs(service.docs ? service.docs.join(", ") : "");
      setGovtFee(service.govtFee);
      setServiceCharge(service.serviceCharge);
      setImageUrl(service.imageUrl || ""); 
    } else {
      setEditingId(null);
      setName("");
      setDescription(""); // 🔥 Clear Description
      setDocs("");
      setGovtFee("");
      setServiceCharge("");
      setImageUrl("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !description || !docs || govtFee === "" || serviceCharge === "") {
      return alert("Please fill all fields");
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const fileRef = ref(storage, `service_icons/${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      const docsArray = docs.split(",").map(d => d.trim()).filter(d => d !== "");

      const serviceData = {
        name,
        description, // 🔥 Save Description to Firestore
        docs: docsArray,
        govtFee: Number(govtFee),
        serviceCharge: Number(serviceCharge),
        imageUrl: finalImageUrl, 
      };

      if (editingId) {
        await updateDoc(doc(db, "services", editingId), serviceData);
      } else {
        await addDoc(collection(db, "services"), serviceData);
      }
      
      fetchServices();
      closeModal();
    } catch (error) {
      console.error("Error saving service:", error);
      alert("Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "services", id));
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '30px', background: '#fff', padding: '20px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Manage Services</h3>
        <button 
          onClick={() => openModal()} 
          style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add New Service
        </button>
      </div>

      {loading && services.length === 0 ? <p>Loading services...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Icon</th>
              <th style={{ padding: '10px' }}>Service Name</th>
              <th style={{ padding: '10px' }}>Description</th> {/* 🔥 New Column */}
              <th style={{ padding: '10px' }}>Required Documents</th>
              <th style={{ padding: '10px' }}>Govt Fee</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '10px', textAlign: 'center' }}>No services added yet.</td></tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt={s.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', background: '#e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#6b7280' }}>No Img</div>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}><strong>{s.name}</strong></td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#555', maxWidth: '200px' }}>
                    {/* 🔥 Truncate description for table view */}
                    {s.description?.length > 50 ? s.description.substring(0, 50) + "..." : s.description}
                  </td>
                  <td style={{ padding: '10px', fontSize: '13px', color: '#555' }}>
                    {s.docs?.join(", ")}
                  </td>
                  <td style={{ padding: '10px' }}>₹{s.govtFee}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => openModal(s)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Edit</button>
                    <button onClick={() => handleDelete(s.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Del</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '450px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Service" : "Add New Service"}</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Service Icon / Image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                {imageUrl && !imageFile && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={imageUrl} alt="Current" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>Current Image</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Service Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="e.g. PAN Card" />
              </div>

              {/* 🔥 New Description Field */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Service Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical', minHeight: '60px' }} placeholder="Provide details about what this service includes..." />
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Required Documents (Comma separated)</label>
                <textarea value={docs} onChange={(e) => setDocs(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }} placeholder="Photo, Aadhaar Card, Signature" />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Govt Fee (₹)</label>
                  <input type="number" value={govtFee} onChange={(e) => setGovtFee(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Service Charge (₹)</label>
                  <input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {loading ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}