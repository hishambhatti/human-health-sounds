import React, { useState } from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  filters,
  setFilters,
  SOUND_TYPE_STYLES,
  GENDER_COLORS,
  AGE_RANGES,
  AGE_COLORS,
}) {
  const [query, setQuery] = useState("");

  // Add the "Age: ..." label to each age range
  const options = [
    ...Object.keys(SOUND_TYPE_STYLES),
    ...Object.keys(GENDER_COLORS),
    ...AGE_RANGES.map((r) => `Age: ${r.label}`),
  ];

  const getColor = (option) => {
    if (option.startsWith("Age: ")) {
      const label = option.replace("Age: ", "");
      return AGE_COLORS(label.split("–")[0] || label.replace("+", ""));
    }
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
      if (exists) return prev;
      return [...prev, { name: option, active: true }];
    });
    setQuery("");
  };

  // Enhanced filtering logic
  const filteredOptions = options.filter((opt) => {
    const q = query.toLowerCase();

    // Text match
    if (opt.toLowerCase().includes(q)) return true;

    // Number search: match if user types a number that falls in an age range
    if (!isNaN(Number(q))) {
      const num = Number(q);
      if (opt.startsWith("Age: ")) {
        const label = opt.replace("Age: ", "");
        const range = AGE_RANGES.find((r) => r.label === label);
        if (range && num >= range.min && num <= range.max) return true;
      }
    }

    return false;
  });

  return (
    <div className="w-full flex flex-col items-center">
      {/* Search box */}
      <div className="flex items-center bg-white rounded-lg shadow-md px-4 py-2 w-[300px]">
        <Search size={18} className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search sound, gender, or age"
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
      {filters.length > 0 && (<div className="fixed bottom-4 flex space-x-2 bg-white px-3 py-2 rounded-lg shadow-md">
        {filters.map((f) => (
          <div
            key={f.name}
            className="flex items-center space-x-2 px-2 py-1 rounded-md border"
            style={{
              borderColor: getColor(f.name),
              opacity: f.active ? 1 : 0.5,
            }}
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
      </div>)}
    </div>
  );
}
