import React, { useState, useEffect } from "react";
import {
  Truck,
  DollarSign,
  Send,
  Clock,
  PlusCircle,
  UserPlus,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dispatch");
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Vehicle form state
  const [newVehicle, setNewVehicle] = useState({
    registrationNumber: "",
    model: "Tata Motors",
    vehicleType: "Tata Ace",
    maxPayloadKg: "",
  });

  // Driver form state
  const [newDriver, setNewDriver] = useState({
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    password: "password123",
  });

  const API_BASE = import.meta.env.VITE_API_URL || "";

  // Helper to show temporary flash messages
  const notifySuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // 1. Fetch live DB data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [resBookings, resVehicles, resDrivers] = await Promise.all([
        fetch(`${API_BASE}/api/v1/bookings`),
        fetch(`${API_BASE}/api/v1/vehicles`),
        fetch(`${API_BASE}/api/v1/drivers`),
      ]);

      if (!resBookings.ok || !resVehicles.ok || !resDrivers.ok) {
        throw new Error("Failed to fetch fleet data from server");
      }

      const [bookingsData, vehiclesData, driversData] = await Promise.all([
        resBookings.json(),
        resVehicles.json(),
        resDrivers.json(),
      ]);

      setBookings(bookingsData);
      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (err) {
      setError(err.message || "Failed to connect to backend API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 2. Dispatch Booking API Action
  const handleDispatch = async () => {
    if (!selectedVehicleId || !selectedDriverId || !selectedBooking) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/${selectedBooking.id}/dispatch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: parseInt(selectedVehicleId),
          driver_id: parseInt(selectedDriverId),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        // Parse FastAPI 422 array format or standard string detail
        const errorMessage = Array.isArray(errData.detail)
          ? errData.detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('\n')
          : (typeof errData.detail === 'object' ? JSON.stringify(errData.detail) : errData.detail);

        throw new Error(errorMessage || "Dispatch failed");
      }

      await loadDashboardData();
      setSelectedBooking(null);
      setSelectedVehicleId("");
      setSelectedDriverId("");
    } catch (err) {
      alert(`Error dispatching:\n${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Mark Delivered API Action
  const handleCompleteTrip = async (bookingId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/${bookingId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Could not complete trip");
      }

      notifySuccess(`Trip #${bookingId} marked as completed!`);
      await loadDashboardData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Add Vehicle API Action
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_number: newVehicle.registrationNumber.trim().toUpperCase(),
          model: newVehicle.model,
          vehicle_type: newVehicle.vehicleType,
          max_payload_kg: parseFloat(newVehicle.maxPayloadKg),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Vehicle registration failed");
      }

      notifySuccess("Vehicle registered successfully!");
      setNewVehicle({
        registrationNumber: "",
        model: "Tata Motors",
        vehicleType: "Tata Ace",
        maxPayloadKg: "",
      });
      setActiveTab("fleet");
      await loadDashboardData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Register Driver API Action
  const handleAddDriver = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDriver.name.trim(),
          email: newDriver.email.trim().toLowerCase(),
          phone: newDriver.phone.trim(),
          license_number: newDriver.licenseNumber.trim().toUpperCase(),
          password: newDriver.password || "password123",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Driver registration failed");
      }

      notifySuccess(`Driver ${newDriver.name} registered successfully!`);
      setNewDriver({
        name: "",
        email: "",
        phone: "",
        licenseNumber: "",
        password: "password123",
      });
      setActiveTab("driversRoster");
      await loadDashboardData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.fare_amount || b.fareAmount) || 0), 0);
  const activeTripsCount = bookings.filter((b) => b.status === "IN_TRANSIT").length;
  const availableVehiclesCount = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const activeDriversCount = drivers.filter((d) => d.is_available ?? d.isAvailable).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-5 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <Truck className="w-8 h-8 text-emerald-400" />
            <span className="text-xl font-bold tracking-tight">FleetAdmin</span>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("dispatch")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "dispatch" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Send className="w-4 h-4" /> Live Dispatch
            </button>

            <button
              onClick={() => setActiveTab("fleet")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "fleet" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Truck className="w-4 h-4" /> Fleet Roster
            </button>

            <button
              onClick={() => setActiveTab("driversRoster")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "driversRoster" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Users className="w-4 h-4" /> Drivers Roster
            </button>

            <div className="pt-2 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Management
            </div>

            <button
              onClick={() => setActiveTab("addVehicle")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "addVehicle" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Register Vehicle
            </button>

            <button
              onClick={() => setActiveTab("addDriver")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === "addDriver" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Register Driver
            </button>
          </nav>
        </div>

        <div className="space-y-3 border-t border-slate-800 pt-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Tables
          </button>
          <div className="text-xs text-slate-500">
            Logged in as: <span className="text-slate-300">Admin Operations</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Flash Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Value</p>
              <h3 className="text-2xl font-bold text-slate-900">₹{totalRevenue.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">In-Transit</p>
              <h3 className="text-2xl font-bold text-slate-900">{activeTripsCount} Trips</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fleet Units</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {availableVehiclesCount} / {vehicles.length} Free
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Drivers</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {activeDriversCount} / {drivers.length} Free
              </h3>
            </div>
          </div>
        </div>

        {/* Tab 1: Live Dispatch */}
        {activeTab === "dispatch" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Live Cargo & Dispatch Desk</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                {bookings.length} Total Trips
              </span>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Cargo / Weight</th>
                  <th className="py-3 px-4">Assigned Unit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No bookings found in database.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">#{booking.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{booking.pickup_address || booking.pickupAddress}</div>
                        <div className="text-xs text-slate-500">→ {booking.dropoff_address || booking.dropoffAddress}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{booking.cargo_type || booking.cargoType || "Standard Freight"}</div>
                        <div className="text-xs text-slate-400">{booking.weight_kg || booking.weightKg} kg</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {booking.vehicle_registration || booking.vehicleRegistration || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            booking.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : booking.status === "IN_TRANSIT"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {booking.status === "PENDING" && (
                          <button
                            disabled={actionLoading}
                            onClick={() => setSelectedBooking(booking)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm disabled:opacity-50"
                          >
                            Dispatch
                          </button>
                        )}
                        {booking.status === "IN_TRANSIT" && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleCompleteTrip(booking.id)}
                            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm disabled:opacity-50"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Fleet Roster */}
        {activeTab === "fleet" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Vehicle Fleet Register</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Vehicle Model / Type</th>
                  <th className="py-3 px-4">Max Payload</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium">{v.registration_number || v.registrationNumber}</td>
                    <td className="py-3 px-4">{v.vehicle_type || v.vehicleType}</td>
                    <td className="py-3 px-4">{v.max_payload_kg || v.maxPayloadKg} kg</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          v.status === "AVAILABLE"
                            ? "bg-emerald-100 text-emerald-800"
                            : v.status === "ON_TRIP"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Drivers Roster */}
        {activeTab === "driversRoster" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Active Drivers Roster</h2>
              <button
                onClick={() => setActiveTab("addDriver")}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Driver
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Driver Name</th>
                  <th className="py-3 px-4">Email / Phone</th>
                  <th className="py-3 px-4">Driving License</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      No drivers registered yet.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{d.email}</div>
                        <div className="text-xs text-slate-400">{d.phone || "—"}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{d.license_number || d.licenseNumber}</td>
                      <td className="py-3 px-4 text-amber-600 font-semibold">
                        ★ {d.rating ? Number(d.rating).toFixed(1) : "5.0"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            (d.is_available ?? d.isAvailable)
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {(d.is_available ?? d.isAvailable) ? "AVAILABLE" : "ON TRIP / OFF"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Register Vehicle */}
        {activeTab === "addVehicle" && (
          <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Register New Fleet Unit</h2>
            <p className="text-xs text-slate-500 mb-5">Add a new commercial vehicle to the central fleet ledger.</p>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-XY-9876"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
                  value={newVehicle.registrationNumber}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Type</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newVehicle.vehicleType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                  >
                    <option value="Tata Ace">Tata Ace (Mini Truck)</option>
                    <option value="Bolero Maxi">Bolero Maxi Truck</option>
                    <option value="Eicher 14ft">Eicher 14ft Open</option>
                    <option value="Container 20ft">Container 20ft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Payload Capacity (kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newVehicle.maxPayloadKg}
                    onChange={(e) => setNewVehicle({ ...newVehicle, maxPayloadKg: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition mt-4 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Vehicle to Database"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Register Driver */}
        {activeTab === "addDriver" && (
          <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Register New Fleet Driver</h2>
            <p className="text-xs text-slate-500 mb-5">
              Creates a driver account with `ROLE_DRIVER` and registers commercial driving license credentials.
            </p>

            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. driver@cloudhaul.com"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +919876543212"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Driving License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH1220200012345"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm uppercase font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Default: password123"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm transition mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {actionLoading ? "Registering Driver..." : "Register Driver to Database"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modal: Dispatch Booking */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Dispatch Booking #{selectedBooking.id}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Assign an available vehicle and licensed driver to start transit.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Available Vehicle</label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  <option value="">-- Choose Available Vehicle --</option>
                  {vehicles
                    .filter((v) => v.status === "AVAILABLE")
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number || v.registrationNumber} ({v.vehicle_type || v.vehicleType} - max{" "}
                        {v.max_payload_kg || v.maxPayloadKg}kg)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assign Driver</label>
                <select
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Choose Active Driver --</option>
                  {drivers
                    .filter((d) => d.is_available ?? d.isAvailable)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Lic: {d.license_number || d.licenseNumber})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!selectedVehicleId || !selectedDriverId || actionLoading}
                onClick={handleDispatch}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg"
              >
                {actionLoading ? "Dispatching..." : "Confirm & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}