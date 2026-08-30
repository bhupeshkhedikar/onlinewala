import { useEffect, useState } from "react";
import { db, storage } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import "./AdminServices.css";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [govtFee, setGovtFee] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [docsList, setDocsList] = useState([]);
  const [customFields, setCustomFields] = useState([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);

    try {
      const snapshot = await getDocs(
        collection(db, "services")
      );

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

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
      setName(service.name || "");
      setDescription(service.description || "");
      setGovtFee(service.govtFee ?? "");
      setServiceCharge(service.serviceCharge ?? "");
      setImageUrl(service.imageUrl || "");
      setCustomFields(service.customFields || []);

      if (service.docs && Array.isArray(service.docs)) {
        const formattedDocs = service.docs.map((item) =>
          typeof item === "string"
            ? { name: item, isRequired: true }
            : item
        );

        setDocsList(formattedDocs);
      } else {
        setDocsList([]);
      }
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
      setGovtFee("");
      setServiceCharge("");
      setImageUrl("");
      setCustomFields([]);
      setDocsList([]);
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (loading) return;

    setIsModalOpen(false);
    setEditingId(null);
    setImageFile(null);
  };

  const addDocField = () => {
    setDocsList([
      ...docsList,
      {
        name: "",
        isRequired: true
      }
    ]);
  };

  const updateDocField = (index, key, value) => {
    const updated = [...docsList];
    updated[index][key] = value;
    setDocsList(updated);
  };

  const removeDocField = (index) => {
    setDocsList(
      docsList.filter((_, i) => i !== index)
    );
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        label: "",
        type: "text",
        options: "",
        required: true
      }
    ]);
  };

  const updateCustomField = (index, key, value) => {
    const updated = [...customFields];
    updated[index][key] = value;
    setCustomFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFields(
      customFields.filter((_, i) => i !== index)
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      alert("Please fill Service Name and Description");
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const fileRef = ref(
          storage,
          `service_icons/${Date.now()}_${imageFile.name}`
        );

        await uploadBytes(fileRef, imageFile);
        finalImageUrl = await getDownloadURL(fileRef);
      }

      const formattedDocs = docsList
        .filter(
          (item) =>
            item.name &&
            item.name.trim() !== ""
        )
        .map((item) => ({
          name: item.name.trim(),
          isRequired: !!item.isRequired
        }));

      const formattedCustomFields =
        customFields
          .filter(
            (field) =>
              field.label &&
              field.label.trim() !== ""
          )
          .map((field) => ({
            ...field,
            label: field.label.trim(),
            options:
              field.type === "select"
                ? typeof field.options === "string"
                  ? field.options
                      .split(",")
                      .map((option) =>
                        option.trim()
                      )
                      .filter(Boolean)
                  : field.options || []
                : []
          }));

      const serviceData = {
        name: name.trim(),
        description: description.trim(),
        docs: formattedDocs,
        govtFee: govtFee
          ? Number(govtFee)
          : 0,
        serviceCharge: serviceCharge
          ? Number(serviceCharge)
          : 0,
        imageUrl: finalImageUrl,
        customFields: formattedCustomFields
      };

      if (editingId) {
        await updateDoc(
          doc(db, "services", editingId),
          serviceData
        );
      } else {
        await addDoc(
          collection(db, "services"),
          serviceData
        );
      }

      await fetchServices();
      setIsModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error(
        "Error saving service:",
        error
      );
      alert("Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this service?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      await deleteDoc(
        doc(db, "services", id)
      );

      await fetchServices();
    } catch (error) {
      console.error(
        "Error deleting service:",
        error
      );
      alert("Failed to delete service");
    } finally {
      setLoading(false);
    }
  };

  const totalServices = services.length;

  const totalDocs = services.reduce(
    (sum, service) =>
      sum + (service.docs?.length || 0),
    0
  );

  const totalFields = services.reduce(
    (sum, service) =>
      sum +
      (service.customFields?.length || 0),
    0
  );

  return (
    <section className="admin-services">

      <div className="services-header">
        <div className="services-heading">
          <div className="services-heading-icon">
            ⚙️
          </div>

          <div>
            <span className="services-eyebrow">
              SERVICE MANAGEMENT
            </span>

            <h2>Manage Services</h2>

            <p>
              Add, edit and manage all available
              services.
            </p>
          </div>
        </div>

        <button
          className="add-service-btn"
          onClick={() => openModal()}
        >
          <span>＋</span>
          Add Service
        </button>
      </div>

      <div className="service-stats">

        <div className="service-stat blue">
          <div className="stat-icon">⚙️</div>
          <div>
            <strong>{totalServices}</strong>
            <span>Total Services</span>
          </div>
        </div>

        <div className="service-stat orange">
          <div className="stat-icon">📄</div>
          <div>
            <strong>{totalDocs}</strong>
            <span>Documents</span>
          </div>
        </div>

        <div className="service-stat green">
          <div className="stat-icon">📝</div>
          <div>
            <strong>{totalFields}</strong>
            <span>Form Fields</span>
          </div>
        </div>

      </div>

      {loading && services.length === 0 ? (
        <div className="services-loading">
          <div className="service-spinner"></div>
          <strong>Loading Services</strong>
          <span>Please wait...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="services-empty">
          <div className="empty-service-icon">
            ⚙️
          </div>

          <h3>No Services Added</h3>

          <p>
            Start by adding your first service.
          </p>

          <button
            onClick={() => openModal()}
            className="empty-add-btn"
          >
            ＋ Add First Service
          </button>
        </div>
      ) : (
        <>
          <div className="services-table-wrapper">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Details</th>
                  <th>Govt Fee</th>
                  <th>Service Charge</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {services.map((service) => {
                  const govt =
                    Number(service.govtFee) || 0;

                  const charge =
                    Number(
                      service.serviceCharge
                    ) || 0;

                  return (
                    <tr key={service.id}>

                      <td>
                        <div className="service-name-cell">
                          <div className="service-image">
                            {service.imageUrl ? (
                              <img
                                src={
                                  service.imageUrl
                                }
                                alt={service.name}
                              />
                            ) : (
                              <span>⚙️</span>
                            )}
                          </div>

                          <div>
                            <strong>
                              {service.name}
                            </strong>

                            <p>
                              {service.description ||
                                "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="detail-badges">
                          <span className="doc-badge">
                            📄{" "}
                            {service.docs
                              ?.length || 0}{" "}
                            Docs
                          </span>

                          <span className="field-badge">
                            📝{" "}
                            {service.customFields
                              ?.length || 0}{" "}
                            Fields
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong className="fee">
                          ₹{govt}
                        </strong>
                      </td>

                      <td>
                        <strong className="charge">
                          ₹{charge}
                        </strong>
                      </td>

                      <td>
                        <strong className="total-fee">
                          ₹{govt + charge}
                        </strong>
                      </td>

                      <td>
                        <div className="service-actions">
                          <button
                            className="edit-btn"
                            onClick={() =>
                              openModal(service)
                            }
                          >
                            ✏️ Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                service.id
                              )
                            }
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-services">

            {services.map((service) => {
              const govt =
                Number(service.govtFee) || 0;

              const charge =
                Number(
                  service.serviceCharge
                ) || 0;

              return (
                <div
                  className="mobile-service-card"
                  key={service.id}
                >

                  <div className="mobile-service-top">

                    <div className="service-name-cell">
                      <div className="service-image">
                        {service.imageUrl ? (
                          <img
                            src={service.imageUrl}
                            alt={service.name}
                          />
                        ) : (
                          <span>⚙️</span>
                        )}
                      </div>

                      <div>
                        <strong>
                          {service.name}
                        </strong>

                        <p>
                          {service.description ||
                            "No description"}
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="mobile-service-badges">
                    <span className="doc-badge">
                      📄{" "}
                      {service.docs?.length ||
                        0}{" "}
                      Documents
                    </span>

                    <span className="field-badge">
                      📝{" "}
                      {service.customFields
                        ?.length || 0}{" "}
                      Fields
                    </span>
                  </div>

                  <div className="mobile-price-grid">

                    <div>
                      <span>
                        GOVT FEE
                      </span>
                      <strong>
                        ₹{govt}
                      </strong>
                    </div>

                    <div>
                      <span>
                        SERVICE CHARGE
                      </span>
                      <strong>
                        ₹{charge}
                      </strong>
                    </div>

                    <div>
                      <span>
                        TOTAL
                      </span>
                      <strong className="total-fee">
                        ₹{govt + charge}
                      </strong>
                    </div>

                  </div>

                  <div className="mobile-service-actions">

                    <button
                      className="edit-btn"
                      onClick={() =>
                        openModal(service)
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        handleDelete(
                          service.id
                        )
                      }
                    >
                      🗑 Delete
                    </button>

                  </div>

                </div>
              );
            })}

          </div>
        </>
      )}

      {isModalOpen && (
        <div
          className="service-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="service-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="service-modal-header">

              <div className="modal-service-title">
                <div className="modal-service-icon">
                  {editingId ? "✏️" : "⚙️"}
                </div>

                <div>
                  <span>
                    SERVICE MANAGEMENT
                  </span>

                  <h2>
                    {editingId
                      ? "Edit Service"
                      : "Add New Service"}
                  </h2>

                  <p>
                    Configure service details,
                    documents and form fields.
                  </p>
                </div>
              </div>

              <button
                className="service-modal-close"
                onClick={closeModal}
                disabled={loading}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSave}
              className="service-form"
            >

              <div className="form-section">

                <div className="form-section-heading">
                  <div>01</div>
                  <span>
                    Basic Information
                  </span>
                </div>

                <div className="form-grid">

                  <div className="form-group full">
                    <label>
                      Service Name
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. PAN Card Application"
                      value={name}
                      onChange={(e) =>
                        setName(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-group full">
                    <label>
                      Description
                    </label>

                    <textarea
                      placeholder="Enter service description..."
                      value={description}
                      onChange={(e) =>
                        setDescription(
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Govt Fee
                    </label>

                    <div className="money-input">
                      <span>₹</span>

                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={govtFee}
                        onChange={(e) =>
                          setGovtFee(
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Service Charge
                    </label>

                    <div className="money-input">
                      <span>₹</span>

                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={serviceCharge}
                        onChange={(e) =>
                          setServiceCharge(
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                </div>

              </div>

              <div className="form-section">

                <div className="form-section-heading">
                  <div>02</div>
                  <span>
                    Service Image
                  </span>
                </div>

                <div className="image-upload-box">

                  <div className="image-preview">
                    {imageFile ? (
                      <img
                        src={URL.createObjectURL(
                          imageFile
                        )}
                        alt="Preview"
                      />
                    ) : imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Current"
                      />
                    ) : (
                      <span>🖼️</span>
                    )}
                  </div>

                  <div className="image-upload-content">

                    <strong>
                      Upload Service Icon
                    </strong>

                    <span>
                      JPG, PNG or WEBP
                    </span>

                    <label className="file-btn">
                      Choose Image

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setImageFile(
                            e.target.files?.[0] ||
                              null
                          )
                        }
                      />
                    </label>

                  </div>

                </div>

              </div>

              <div className="form-section builder-section">

                <div className="builder-header">

                  <div className="builder-title">
                    <div className="builder-icon docs">
                      📄
                    </div>

                    <div>
                      <strong>
                        Required Documents
                      </strong>

                      <span>
                        Documents customers need
                        to upload.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="add-builder-btn blue"
                    onClick={addDocField}
                  >
                    ＋ Add Document
                  </button>

                </div>

                <div className="builder-list">

                  {docsList.map(
                    (docItem, index) => (
                      <div
                        className="builder-item"
                        key={index}
                      >

                        <div className="item-number">
                          {index + 1}
                        </div>

                        <div className="item-input">
                          <label>
                            Document Name
                          </label>

                          <input
                            type="text"
                            placeholder="e.g. Aadhaar Card"
                            value={
                              docItem.name
                            }
                            onChange={(e) =>
                              updateDocField(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>

                        <label className="required-toggle">
                          <input
                            type="checkbox"
                            checked={
                              !!docItem.isRequired
                            }
                            onChange={(e) =>
                              updateDocField(
                                index,
                                "isRequired",
                                e.target.checked
                              )
                            }
                          />

                          <span>
                            Required
                          </span>
                        </label>

                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() =>
                            removeDocField(
                              index
                            )
                          }
                        >
                          ×
                        </button>

                      </div>
                    )
                  )}

                  {docsList.length === 0 && (
                    <div className="builder-empty">
                      <span>📄</span>
                      <strong>
                        No documents added
                      </strong>
                      <small>
                        Add documents required
                        from customers.
                      </small>
                    </div>
                  )}

                </div>

              </div>

              <div className="form-section builder-section">

                <div className="builder-header">

                  <div className="builder-title">
                    <div className="builder-icon green">
                      📝
                    </div>

                    <div>
                      <strong>
                        Dynamic Form Fields
                      </strong>

                      <span>
                        Collect additional
                        information.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="add-builder-btn green"
                    onClick={addCustomField}
                  >
                    ＋ Add Field
                  </button>

                </div>

                <div className="builder-list">

                  {customFields.map(
                    (field, index) => (
                      <div
                        className="custom-field-item"
                        key={index}
                      >

                        <div className="item-number">
                          {index + 1}
                        </div>

                        <div className="item-input">
                          <label>
                            Field Label
                          </label>

                          <input
                            type="text"
                            placeholder="e.g. Train Number"
                            value={
                              field.label
                            }
                            onChange={(e) =>
                              updateCustomField(
                                index,
                                "label",
                                e.target.value
                              )
                            }
                            required
                          />
                        </div>

                        <div className="item-input type-input">
                          <label>
                            Field Type
                          </label>

                          <select
                            value={
                              field.type
                            }
                            onChange={(e) =>
                              updateCustomField(
                                index,
                                "type",
                                e.target.value
                              )
                            }
                          >
                            <option value="text">
                              Text
                            </option>

                            <option value="number">
                              Number
                            </option>

                            <option value="date">
                              Date
                            </option>

                            <option value="select">
                              Dropdown
                            </option>
                          </select>
                        </div>

                        {field.type ===
                          "select" && (
                          <div className="item-input">
                            <label>
                              Options
                            </label>

                            <input
                              type="text"
                              placeholder="Option 1, Option 2"
                              value={
                                Array.isArray(
                                  field.options
                                )
                                  ? field.options.join(
                                      ", "
                                    )
                                  : field.options ||
                                    ""
                              }
                              onChange={(e) =>
                                updateCustomField(
                                  index,
                                  "options",
                                  e.target.value
                                )
                              }
                              required
                            />
                          </div>
                        )}

                        <label className="required-toggle">
                          <input
                            type="checkbox"
                            checked={
                              !!field.required
                            }
                            onChange={(e) =>
                              updateCustomField(
                                index,
                                "required",
                                e.target.checked
                              )
                            }
                          />

                          <span>
                            Required
                          </span>
                        </label>

                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() =>
                            removeCustomField(
                              index
                            )
                          }
                        >
                          ×
                        </button>

                      </div>
                    )
                  )}

                  {customFields.length === 0 && (
                    <div className="builder-empty">
                      <span>📝</span>
                      <strong>
                        No form fields added
                      </strong>
                      <small>
                        Add fields to collect
                        customer information.
                      </small>
                    </div>
                  )}

                </div>

              </div>

              <div className="service-form-footer">

                <div className="form-total">

                  <span>
                    TOTAL CUSTOMER CHARGE
                  </span>

                  <strong>
                    ₹
                    {(Number(govtFee) || 0) +
                      (Number(
                        serviceCharge
                      ) || 0)}
                  </strong>

                </div>

                <div className="form-actions">

                  <button
                    type="button"
                    className="cancel-service-btn"
                    onClick={closeModal}
                    disabled={loading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-service-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="mini-spinner"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        ✓{" "}
                        {editingId
                          ? "Update Service"
                          : "Save Service"}
                      </>
                    )}
                  </button>

                </div>

              </div>

            </form>
          </div>
        </div>
      )}

    </section>
  );
}