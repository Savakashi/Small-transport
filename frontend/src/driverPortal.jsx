import React, { useState, useEffect } from "react";
import {
  Truck,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Play,
  Navigation,
  RefreshCw,
  AlertCircle,
  Phone,
  ShieldCheck,
  Award,
} from "lucide-react";

export default function DriverPortal({ user }) {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  // Retrieve driver ID or user ID
  const driverId = user?.id || storedUser?.id || storedUser?.user_id || localStorage.getItem("user_id") || 1;

  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'completed'
  const [driverStats, setDriverStats] = useState({ name: "Driver Operations", rating: 4.9, completedTrips: 0 });
  const [assignedBookings, setAssignedBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // 1. Fetch live assigned cargo for this specific driver
  const fetchDriverAssignments = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings?driver_id=${driverId}`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error("Failed to load assigned shipments");
      }

      const data = await res.json();

      const formatted = data.map((b) => ({
        id: b.id,
        pickupAddress: b.pickup_address || b.pickupAddress,
        dropoffAddress: b.dropoff_address || b.dropoffAddress,
        cargoType: b.cargo_type || b.cargoType || "Freight",
        weightKg: Number(b.weight_kg || b.weightKg) || 0,
        fareAmount: Number(b.fare_amount || b.fareAmount) || 0,
        status: b.status,
        vehicleRegistration: b.vehicle_registration || b.vehicleRegistration || "Assigned Truck",
        customerName: b.customer_name || b.customerName || "Customer",
        customerPhone: b.customer_phone || b.customerPhone || "+91 98765 43210",
        createdAt: b.created_at || b.createdAt,
      }));

      setAssignedBookings(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      fetchDriverAssignments();
    }
  }, [driverId]);

  // 2. Mark shipment as Completed / Delivered
  const handleMarkDelivered = async (bookingId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Could not complete delivery");
      }

      notifySuccess(`Shipment #${bookingId} delivered successfully!`);
      await fetchDriverAssignments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const activeShipments = assignedBookings.filter((b) => b.status === "IN_TRANSIT" || b.status === "PENDING");
  const completedShipments = assignedBookings.filter((b) => b.status === "COMPLETED");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white leading-none block">Driver Transit Hub</span>
              <span className="text-xs text-emerald-400 font-mono">Driver ID: #{driverId}</span>
            </div>
          </div>

          <button
            onClick={fetchDriverAssignments}
            disabled={loading}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Status / Metric Banner */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Pending Transit</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{activeShipments.length}</h3>
          </div>
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Completed</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{completedShipments.length}</h3>
          </div>
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Rating</p>
            <h3 className="text-2xl font-black text-white mt-1">★ 4.9</h3>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === "active" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Active Cargo ({activeShipments.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === "completed" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Trip History ({completedShipments.length})
          </button>
        </div>

        {/* Shipments List */}
        <div className="space-y-4">
          {loading && assignedBookings.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              Checking dispatch desk...
            </div>
          ) : (activeTab === "active" ? activeShipments : completedShipments).length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center text-slate-400 text-sm">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              {activeTab === "active" ? "No active cargo assigned to you." : "No completed deliveries found."}
            </div>
          ) : (
            (activeTab === "active" ? activeShipments : completedShipments).map((booking) => (
              <div
                key={booking.id}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg space-y-4"
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-900 text-emerald-400 px-2 py-1 rounded-md border border-slate-700">
                      #{booking.id}
                    </span>
                    <span className="text-xs bg-slate-700 text-slate-300 font-mono px-2 py-1 rounded-md">
                      {booking.vehicleRegistration}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      booking.status === "IN_TRANSIT"
                        ? "bg-blue-900/60 text-blue-300 border border-blue-700"
                        : booking.status === "COMPLETED"
                        ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                        : "bg-amber-900/60 text-amber-300 border border-amber-700"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {/* Routing Flow */}
                <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg mt-0.5">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Pickup Location</p>
                      <p className="text-sm font-semibold text-white">{booking.pickupAddress}</p>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-slate-700 ml-4 h-3" />

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Destination Dropoff</p>
                      <p className="text-sm font-semibold text-white">{booking.dropoffAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/30">
                    <span className="text-slate-400 block text-[10px]">Cargo Description</span>
                    <span className="font-semibold text-slate-200">{booking.cargoType}</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/30">
                    <span className="text-slate-400 block text-[10px]">Consignment Weight</span>
                    <span className="font-semibold text-slate-200">{booking.weightKg} kg</span>
                  </div>
                  <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/30 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">Trip Fare</span>
                    <span className="font-semibold text-emerald-400">₹{booking.fareAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Controls */}
                {booking.status === "IN_TRANSIT" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleMarkDelivered(booking.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    {actionLoading ? "Submitting Proof..." : "Confirm & Mark as Delivered"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}