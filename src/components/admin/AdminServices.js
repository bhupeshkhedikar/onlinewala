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
  const [description, setDescription] = useState(""); 
  const [docs, setDocs] = useState(""); 
  const [govtFee, setGovtFee] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  
  // 🔥 Image States
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  
  // 🔥 State for Custom Fields
  const [customFields, setCustomFields] = useState([]);

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
      setDescription(service.description || ""); 
      setDocs(service.docs ? service.docs.join(", ") : "");
      setGovtFee(service.govtFee);
      setServiceCharge(service.serviceCharge);
      setImageUrl(service.imageUrl || ""); 
      setCustomFields(service.customFields || []);
    } else {
      setEditingId(null);
      setName("");
      setDescription(""); 
      setDocs("");
      setGovtFee("");
      setServiceCharge("");
      setImageUrl("");
      setCustomFields([]); 
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { label: "", type: "text", options: "", required: true }]);
  };

  const updateCustomField = (index, key, value) => {
    const updatedFields = [...customFields];
    updatedFields[index][key] = value;
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !description) {
      return alert("Please fill Name and Description");
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;
      
      // Upload image if a new file is selected
      if (imageFile) {
        const fileRef = ref(storage, `service_icons/${Date.now()}_${imageFile.name}`);
        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      const docsArray = docs ? docs.split(",").map(d => d.trim()).filter(d => d !== "") : [];

      const formattedCustomFields = customFields.map(field => ({
        ...field,
        options: field.type === "select" ? (typeof field.options === 'string' ? field.options.split(",").map(o => o.trim()) : field.options) : []
      }));

      const serviceData = {
        name,
        description, 
        docs: docsArray,
        govtFee: govtFee ? Number(govtFee) : 0, 
        serviceCharge: serviceCharge ? Number(serviceCharge) : 0, 
        imageUrl: finalImageUrl, // Will save empty string if no image was uploaded
        customFields: formattedCustomFields 
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
        <button onClick={() => openModal()} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Add New Service
        </button>
      </div>

      {loading && services.length === 0 ? <p>Loading services...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Icon</th>
              <th style={{ padding: '10px' }}>Service Name</th>
              <th style={{ padding: '10px' }}>Custom Fields</th>
              <th style={{ padding: '10px' }}>Govt Fee</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center' }}>No services added yet.</td></tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>
                    {s.imageUrl ? <img src={s.imageUrl} alt={s.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} /> : "No Img"}
                  </td>
                  <td style={{ padding: '10px' }}><strong>{s.name}</strong></td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{s.customFields?.length || 0} fields</td>
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
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Service" : "Add New Service"}</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* --- BASIC FIELDS --- */}
              <div><label>Service Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }} /></div>
              <div><label>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }} /></div>
              <div><label>Required Documents</label><input type="text" value={docs} onChange={(e) => setDocs(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }} placeholder="Adhaar, PAN" /></div>
              
              {/* 🔥 NEW: Optional Image Upload Field */}
              <div>
                <label>Service Icon / Image (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImageFile(e.target.files[0])} 
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', background: '#fff' }} 
                />
                {/* Show a preview link if editing a service that already has an image */}
                {imageUrl && !imageFile && (
                  <p style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                    Current Image: <a href={imageUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>View Image</a>
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label>Govt Fee</label><input type="number" value={govtFee} onChange={(e) => setGovtFee(e.target.value)}  style={{ width: '100%', padding: '8px' }} /></div>
                <div style={{ flex: 1 }}><label>Service Charge</label><input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)}  style={{ width: '100%', padding: '8px' }} /></div>
              </div>

              {/* 🔥 DYNAMIC CUSTOM FIELDS BUILDER 🔥 */}
              <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold' }}>Dynamic Requirements (Form Fields)</label>
                  <button type="button" onClick={addCustomField} style={{ background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>+ Add Field</button>
                </div>

                {customFields.map((field, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', background: '#fff', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                    <div style={{ flex: 1 }}>
                      <input type="text" placeholder="Field Name (e.g. Train No)" value={field.label} onChange={(e) => updateCustomField(index, "label", e.target.value)} style={{ width: '100%', padding: '6px' }} required />
                    </div>
                    <div style={{ flex: 1 }}>
                      <select value={field.type} onChange={(e) => updateCustomField(index, "type", e.target.value)} style={{ width: '100%', padding: '6px' }}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>
                    {field.type === "select" && (
                      <div style={{ flex: 1 }}>
                        <input type="text" placeholder="Options (comma separated)" value={Array.isArray(field.options) ? field.options.join(",") : field.options} onChange={(e) => updateCustomField(index, "options", e.target.value)} style={{ width: '100%', padding: '6px' }} required />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '12px' }}><input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(index, "required", e.target.checked)} /> Req</label>
                    </div>
                    <button type="button" onClick={() => removeCustomField(index)} style={{ background: 'transparent', color: 'red', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  </div>
                ))}
                {customFields.length === 0 && <p style={{ fontSize: '12px', color: '#777' }}>No custom fields added. Add fields like "Train Name", "Class" for specific services.</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 