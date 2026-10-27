import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export default function GeoapifyAutocomplete({ onSelectLocation, placeholder = "Search Indian address, area, or hub..." }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

  // Debounced API call to Geoapify Geocoding & Autocomplete
  useEffect(() => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Bias to India (country code 'in')
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
            query
          )}&filter=countrycode:in&format=json&apiKey=${API_KEY}`
        );
        const data = await response.json();
        setSuggestions(data.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Geoapify autocomplete error:", err);
      } finally {
        setLoading(false);
      }
    }, 350); // 350ms debounce

    return () => clearTimeout(timer);
  }, [query, API_KEY]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    setQuery(item.formatted);
    setIsOpen(false);
    onSelectLocation({
      formattedAddress: item.formatted,
      city: item.city || item.county || item.state || "",
      postalCode: item.postcode || "",
      latitude: item.lat,
      longitude: item.lon,
    });
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
        {loading && (
          <Loader2 className="absolute right-3 top-3 text-emerald-600 animate-spin" size={18} />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              className="p-3 hover:bg-emerald-50 cursor-pointer text-left transition-colors flex items-start space-x-2"
            >
              <MapPin size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{item.address_line1 || item.formatted}</p>
                <p className="text-xs text-slate-500">{item.address_line2 || item.city || item.state}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}