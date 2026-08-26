import React, { useState, useEffect } from "react";
import {
  Truck,
  PlusCircle,
  Clock,
  Package,
  MapPin,
  CheckCircle,
  RefreshCw,
  Calendar,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CustomerPortal({ user }) {
  const [activeTab, setActiveTab] = useState("bookings");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);

  // 1. Retrieve the logged-in customer ID (prop -> localStorage -> fallback)
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const customerId = user?.id || user?.user_id || storedUser?.id || storedUser?.user_id || 2;

  // 2. Fetch bookings filtered strictly by customerId
  const fetchBookings = async () => {
    if (!customerId) return;
    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "";
      
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings?customer_id=${customerId}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();

      // Normalize snake_case (FastAPI/SQLAlchemy) and camelCase properties
      const formattedData = data.map((b) => ({
        id: b.id,
        pickupAddress: b.pickup_address || b.pickupAddress,
        dropoffAddress: b.dropoff_address || b.dropoffAddress,
        cargoType: b.cargo_type || b.cargoType || "General Cargo",
        weightKg: Number(b.weight_kg || b.weightKg) || 0,
        fareAmount: Number(b.fare_amount || b.fareAmount) || 0,
        status: b.status,
        vehicleRegistration: b.vehicle_registration || b.vehicleRegistration || null,
        driverId: b.driver_id || b.driverId || null,
        createdAt: b.created_at || b.createdAt,
      }));

      setBookings(formattedData);
    } catch (err) {
      console.error("FastAPI fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [customerId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Awaiting Driver
          </span>
        );
      case "IN_TRANSIT":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Truck className="w-3 h-3" /> On The Way
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Delivered
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                CloudHaul Logistics
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Customer ID: <span className="font-mono text-emerald-600 font-bold">#{customerId}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === "bookings"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate("/create")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Book Freight
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Shipment Management
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Track live goods in transit, review delivery proofs, and request new loads.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchBookings}
                disabled={loading}
                className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5 font-medium transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => navigate("/create")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs inline-flex items-center gap-2 shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" /> New Booking
              </button>
            </div>
          </div>

          {/* Bookings List */}
          {loading && bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
              Loading your consignments...
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 mb-1">
                No Shipments Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                You haven't booked any cargo transportation yet. Book your first vehicle in minutes.
              </p>
              <button
                onClick={() => navigate("/create")}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition"
              >
                Book Your First Truck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        #{booking.id}
                      </span>
                      {getStatusBadge(booking.status)}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "Today"}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{booking.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 pl-6 text-xs">
                        <span className="text-slate-400">to</span>
                        <span className="font-medium text-slate-800">{booking.dropoffAddress}</span>
                      </div>
                    </div>

                    {/* Load info */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                      <div>
                        Cargo: <span className="font-medium text-slate-800">{booking.cargoType}</span>
                      </div>
                      <div>
                        Weight: <span className="font-medium text-slate-800">{booking.weightKg} kg</span>
                      </div>
                      {booking.vehicleRegistration && (
                        <div>
                          Vehicle: <span className="font-mono font-medium text-slate-800">{booking.vehicleRegistration}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Price & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost</span>
                      <span className="text-xl font-bold text-slate-900">₹{booking.fareAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-2">
                      {booking.status === "COMPLETED" && (
                        <button className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Invoice
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}