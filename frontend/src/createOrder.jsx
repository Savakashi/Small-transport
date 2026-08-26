import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Building2,
  Package,
  PlusCircle,
  ArrowLeft,
  RefreshCw,
  Bookmark,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Scale,
  Calendar,
  X,
} from "lucide-react";

export default function CreateOrderPage() {
  const navigate = useNavigate();

  // Retrieve authenticated user
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const customerId =
    storedUser?.id ||
    storedUser?.user_id ||
    localStorage.getItem("user_id") ||
    2;

  // State Management
  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form Fields
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [cargoType, setCargoType] = useState("Standard Freight");
  const [weightKg, setWeightKg] = useState("50");

  // New Location Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingLoc, setAddingLoc] = useState(false);
  const [newLocationForm, setNewLocationForm] = useState({
    companyName: "",
    title: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  // 1. Fetch User Saved Locations
  const fetchLocations = async () => {
    setLoadingLocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/locations?user_id=${customerId}`);
      if (!res.ok) throw new Error("Failed to load saved destinations");
      const data = await res.json();
      setLocations(data);

      if (data.length >= 2) {
        setPickupLocationId((prev) => prev || String(data[0].id));
        setDropoffLocationId((prev) => prev || String(data[1].id));
      } else if (data.length === 1) {
        setPickupLocationId((prev) => prev || String(data[0].id));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingLocs(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchLocations();
  }, [customerId]);

  // 2. Real-time Invoice Breakdown Calculation
  const weight = parseFloat(weightKg) || 0;
  const baseFare = 500.0;
  const weightSurcharge = weight * 2.5;
  const subtotal = baseFare + weightSurcharge;
  const gstAmount = Number((subtotal * 0.18).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  // 3. Save New Location Handler
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setAddingLoc(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(customerId, 10),
          companyName: newLocationForm.companyName.trim() || null,
          title: newLocationForm.title.trim(),
          address: newLocationForm.address.trim(),
          city: newLocationForm.city.trim(),
          postalCode: newLocationForm.postalCode.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Unable to save location");
      }

      const created = await res.json();
      setShowAddModal(false);
      setNewLocationForm({ companyName: "", title: "", address: "", city: "", postalCode: "" });

      await fetchLocations();
      if (!pickupLocationId) setPickupLocationId(String(created.id));
      else if (!dropoffLocationId) setDropoffLocationId(String(created.id));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setAddingLoc(false);
    }
  };

  // 4. Create Order & Auto-Generate Invoice
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!pickupLocationId || !dropoffLocationId) {
      setErrorMsg("Please select both a pickup and dropoff location.");
      return;
    }

    if (pickupLocationId === dropoffLocationId) {
      setErrorMsg("Pickup and dropoff locations cannot be identical.");
      return;
    }

    if (weight <= 0) {
      setErrorMsg("Consignment weight must be greater than 0 kg.");
      return;
    }

    setSubmitting(true);

    const payload = {
      customerId: parseInt(customerId, 10),
      pickupLocationId: parseInt(pickupLocationId, 10),
      dropoffLocationId: parseInt(dropoffLocationId, 10),
      pickupTime: pickupTime ? new Date(pickupTime).toISOString() : new Date().toISOString(),
      cargoType,
      weightKg: weight,
      fareAmount: totalAmount,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = Array.isArray(err.detail)
          ? err.detail.map((d) => `${d.loc.join(".")}: ${d.msg}`).join("\n")
          : err.detail;
        throw new Error(msg || "Failed to create shipment order");
      }

      navigate("/customer");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/customer")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5 text-emerald-600" /> Save New Address
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-pre-line">{errorMsg}</span>
          </div>
        )}

        {/* Main Grid: Form + Live Invoice Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Order Details Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Freight Consignment</h1>
              <p className="text-xs text-slate-500 mt-0.5">Select from your saved addresses to generate an instant quotation.</p>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Pickup Point Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Origin (Pickup Location)
                </label>
                <select
                  required
                  value={pickupLocationId}
                  onChange={(e) => setPickupLocationId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                >
                  <option value="">-- Select Origin Location --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.company_name ? `[${loc.company_name}] ` : ""}{loc.title} — {loc.city} ({loc.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropoff Point Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> Destination (Dropoff Location)
                </label>
                <select
                  required
                  value={dropoffLocationId}
                  onChange={(e) => setDropoffLocationId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                >
                  <option value="">-- Select Destination Location --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.company_name ? `[${loc.company_name}] ` : ""}{loc.title} — {loc.city} ({loc.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cargo Type & Payload Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-500" /> Cargo Type
                  </label>
                  <select
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  >
                    <option value="Standard Freight">Standard Freight</option>
                    <option value="Industrial Raw Materials">Industrial Raw Materials</option>
                    <option value="Automotive Parts">Automotive Parts</option>
                    <option value="Consumer Electronics">Consumer Electronics</option>
                    <option value="Perishable Cold Chain">Perishable Cold Chain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" /> Weight (Kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Scheduled Pickup Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Scheduled Pickup Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || loadingLocs || locations.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-4"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Generating Booking & Tax Invoice...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-white" />
                    Confirm & Schedule Consignment
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Dynamic Invoice Breakdown Preview */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Invoice Quotation</h3>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                  GSTIN: 27AABCC1234F1Z
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Dispatch Charge:</span>
                  <span className="font-mono font-semibold text-slate-900">₹{baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weight Surcharge ({weight} kg × ₹2.50):</span>
                  <span className="font-mono font-semibold text-slate-900">₹{weightSurcharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal Net Fare:</span>
                  <span className="font-mono font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Integrated GST (18%):</span>
                  <span className="font-mono font-semibold text-emerald-700">+ ₹{gstAmount.toFixed(2)}</span>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Total Payable:</span>
                  <span className="text-xl font-bold font-mono text-emerald-600">
                    ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Normalized Address Integrity
              </p>
              <p>
                Addresses link directly to foreign keys in the <code>locations</code> table and automatically lock the rate inside <code>invoices</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add New Location */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Save Business Location</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase font-bold text-[10px] mb-1">Company / Entity</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Warehousing"
                    value={newLocationForm.companyName}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, companyName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase font-bold text-[10px] mb-1">Location Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gate 3 Facility"
                    value={newLocationForm.title}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold text-[10px] mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 18, Phase II Industrial Area"
                  value={newLocationForm.address}
                  onChange={(e) => setNewLocationForm({ ...newLocationForm, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase font-bold text-[10px] mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune"
                    value={newLocationForm.city}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 uppercase font-bold text-[10px] mb-1">Postal Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 411014"
                    value={newLocationForm.postalCode}
                    onChange={(e) => setNewLocationForm({ ...newLocationForm, postalCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 outline-none focus:bg-white focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLoc}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  {addingLoc ? "Saving..." : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}