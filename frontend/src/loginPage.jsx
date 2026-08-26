import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ROLE_CUSTOMER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "";

  const handleRouteRedirect = (userRole) => {
    const normalizedRole = userRole
      ? userRole.toUpperCase().replace("ROLE_", "")
      : "CUSTOMER";

    if (normalizedRole === "ADMIN") {
      navigate("/admin");
    } else if (normalizedRole === "DRIVER") {
      navigate("/driver");
    } else {
      navigate("/customer");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isRegister) {
        // --- REGISTER USER ---
        const registerPayload = {
          name: name.trim(),
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: password,
          role: role,
        };

        const regResponse = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(registerPayload),
        });

        const regData = await regResponse.json();

        if (!regResponse.ok) {
          const errorDetail = Array.isArray(regData.detail)
            ? regData.detail.map((err) => `${err.loc.join(".")}: ${err.msg}`).join("\n")
            : regData.detail;
          throw new Error(errorDetail || "Registration failed. Please try again.");
        }

        setSuccessMsg("Account created! Logging you in...");
      }

      // --- AUTHENTICATE / LOGIN ---
      const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await loginResponse.json();

      if (!loginResponse.ok) {
        const errorDetail = Array.isArray(data.detail)
          ? data.detail.map((err) => `${err.loc.join(".")}: ${err.msg}`).join("\n")
          : data.detail;
        throw new Error(errorDetail || "Authentication failed. Please check your credentials.");
      }

      // Structured user payload
      const userPayload = {
        id: data.user_id,
        user_id: data.user_id,
        email: data.email,
        name: data.full_name || name,
        role: data.role,
      };

      // Persist to localStorage
      localStorage.setItem("auth_token", data.access_token || "");
      localStorage.setItem("user_id", String(data.user_id));
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_email", data.email);
      localStorage.setItem("user_name", data.full_name || name);
      localStorage.setItem("user", JSON.stringify(userPayload));

      // Redirect based on role
      handleRouteRedirect(data.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
    setSuccessMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative z-10 border border-slate-100 transition-all duration-300">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/30 mb-3">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CloudHaul Portal</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister
              ? "Create your commercial shipping account"
              : "Sign in with your registered account"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              !isRegister
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              isRegister
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-pre-line">{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Registration Fields */}
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name / Business Entity
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required={isRegister}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar / Acme Corp"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required={isRegister}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Type
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  >
                    <option value="ROLE_CUSTOMER">Freight Shipper / Customer</option>
                    <option value="ROLE_DRIVER">Commercial Fleet Driver</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cloudhaul.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-50 mt-3"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Text */}
        <div className="mt-5 text-center text-xs text-slate-500">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-bold text-emerald-600 hover:underline inline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-bold text-emerald-600 hover:underline inline"
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}