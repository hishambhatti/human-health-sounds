import React, { useState } from "react";
import { Search } from "lucide-react";

const SOUND_TYPE_STYLES = {
  Sigh: { color: "#5DADE2" },
  Throatclearing: { color: "#F5B041" },
  Sniff: { color: "#48C9B0" },
  Laughter: { color: "#E84393" },
  Sneeze: { color: "#E74C3C" },
  Cough: { color: "#8E44AD" },
};

const GENDER_COLORS = {
  Male: "#3498DB",
  Female: "#E84393",
};

export default function SearchBar({ filters, setFilters }) {
  const [query, setQuery] = useState("");

  const options = [
    ...Object.keys(SOUND_TYPE_STYLES),
    ...Object.keys(GENDER_COLORS)
  ];

  const getColor = (option) => {
    return (
      SOUND_TYPE_STYLES[option]?.color ||
      GENDER_COLORS[option] ||
      "#555"
    );
  };

  const handleToggle = (name) => {
    setFilters((prev) =>
      prev.map((f) =>
        f.name === name ? { ...f, active: !f.active } : f
      )
    );
  };

  const handleRemove = (name) => {
    setFilters((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSelect = (option) => {
    setFilters((prev) => {
      const exists = prev.some((f) => f.name === option);
      if (exists) return prev; // already in list
      return [...prev, { name: option, active: true }];
    });
    setQuery("");
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col items-center">
      {/* Search box */}
      <div className="flex items-center bg-white rounded-lg shadow-md px-4 py-2 w-[300px]">
        <Search size={18} className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search sound or gender"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-sm outline-none"
        />
      </div>

      {/* Dropdown options */}
      {query && (
        <div className="bg-white rounded-lg shadow-md mt-2 w-[300px] max-h-[150px] overflow-y-auto">
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              className="px-4 py-1 text-sm cursor-pointer hover:bg-gray-100"
              style={{ color: getColor(opt) }}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Filter tags */}
      <div className="fixed bottom-4 flex space-x-2 bg-white px-3 py-2 rounded-lg shadow-md">
        {filters.map((f) => (
          <div
            key={f.name}
            className="flex items-center space-x-2 px-2 py-1 rounded-md border"
            style={{ borderColor: getColor(f.name), opacity: f.active ? 1 : 0.5 }}
          >
            <input
              type="checkbox"
              checked={f.active}
              onChange={() => handleToggle(f.name)}
              style={{ accentColor: getColor(f.name) }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: getColor(f.name) }}
            >
              {f.name}
            </span>
            <button
              onClick={() => handleRemove(f.name)}
              className="text-gray-400 hover:text-black text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
