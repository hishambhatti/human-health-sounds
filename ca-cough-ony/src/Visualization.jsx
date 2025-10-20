import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_grid_index_p100.json" // the JSON from Python script
import IconButton from "./components/IconButton";
import SearchBar from "./components/SearchBar";

const SOUND_TYPE_STYLES = {
  Sigh: { color: "#5DADE2", emoji: "🥱" },
  Throatclearing: { color: "#F5B041", emoji: "😤" },
  Sniff: { color: "#48C9B0", emoji: "👃" },
  Laughter: { color: "#E84393", emoji: "😂" },
  Sneeze: { color: "#E74C3C", emoji: "🤧" },
  Cough: { color: "#8E44AD", emoji: "😮‍💨" },
};

const GENDER_COLORS = {
  Male: "#3498DB",
  Female: "#E84393",
};

const AGE_COLORS = (age) => {
  const n = Number(age);
  if (n >= 18 && n <= 24) return "#2ECC71";
  if (n >= 25 && n <= 34) return "#F1C40F";
  if (n >= 35 && n <= 44) return "#E67E22";
  if (n >= 45 && n <= 54) return "#E74C3C";
  if (n >= 55 && n <= 64) return "#9B59B6";
  if (n >= 65) return "#9B59B6";
  return "#BDC3C7"; // fallback gray
};

const GRID_SIZE = 143
const CELL_SIZE = 5
const CELL_GAP = 0

export default function Visualization({ handleClickAbout }) {
  const [selected, setSelected] = useState({ x: 71, y: 71 })
  const [metadataPos, setMetadataPos] = useState({ left: 0, top: 0})
  const svgRef = useRef()
  const [audio, setAudio] = useState(null);
  const [filters, setFilters] = useState([]);

  const handleZoomIn = () => {
    console.log("Zoom In clicked!");
    // Implement zoom in logic (e.g., change CELL_SIZE, re-render)
  };

  const handleZoomOut = () => {
    console.log("Zoom Out clicked!");
    // Implement zoom out logic
  };

  const handleCellClick = useCallback((x, y) => {
    setSelected({ x, y });

    const flippedY = GRID_SIZE - 1 - y;
    const key = `${x}_${flippedY}`;
    const selectedData = dataJson[key];
    if (!selectedData) return;

    // === FIX: Compute metadata position from grid coordinates ===
    const left = x * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    const top = y * (CELL_SIZE + CELL_GAP) - CELL_SIZE * 5;

    setMetadataPos({ left, top });

    // === Audio playback logic ===
    const fileName = selectedData.file_name;
    const audioPath = `/audio/${fileName}.wav`;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    const newAudio = new Audio(audioPath);
    newAudio.play();
    setAudio(newAudio);
  }, [audio]);

  useEffect(() => {
    const svg = d3.select(svgRef.current)
      .attr("width", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .attr("height", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .style("background-color", "#fff");

    // === Clear existing cells (but not outer border) ===
    svg.selectAll("rect")
      .filter(function () {
        return d3.select(this).attr("id")?.startsWith("cell-");
      })
      .remove();

    // === Draw cells based on active filters ===
    Object.keys(dataJson).forEach(key => {
      const [x, flippedY] = key.split("_").map(Number);
      const data = dataJson[key];
      const y = GRID_SIZE - 1 - flippedY;

      const activeFilters = filters.filter(f => f.active).map(f => f.name);

      const matches =
        activeFilters.length === 0 ||
        activeFilters.every(
          (f) =>
            f === data.gender ||
            f.toLowerCase() === data.sound_type.toLowerCase()
        );

      if (!matches) return;

      svg.append("rect")
        .attr("x", x * (CELL_SIZE + CELL_GAP))
        .attr("y", y * (CELL_SIZE + CELL_GAP))
        .attr("width", CELL_SIZE)
        .attr("height", CELL_SIZE)
        .attr("fill", "#fff")
        .attr("stroke", "#ccc")
        .attr("id", `cell-${x}-${y}`)
        .style("cursor", "pointer")
        .on("click", (event) => handleCellClick(x, y, event));
    });

    // === Highlight selected cell ===
    svg.selectAll("rect")
      .attr("fill", "#fff")
      .attr("stroke", "#999")
      .attr("width", CELL_SIZE)
      .attr("height", CELL_SIZE)
      .attr("transform", null);

    const sel = d3.select(`#cell-${selected.x}-${selected.y}`);
    if (!sel.empty()) {
      sel.raise()
        .transition()
        .duration(100)
        .attr("fill", "#d7ecff")
        .attr("stroke", "#5dade2")
        .attr("width", CELL_SIZE * 8)
        .attr("height", CELL_SIZE * 8)
        .attr("transform", `translate(${-CELL_SIZE * 3.5},${-CELL_SIZE * 3.5})`);
    }
  }, [selected, handleCellClick, filters]);

  const flippedY = GRID_SIZE - 1 - selected.y;
  const key = `${selected.x}_${flippedY}`;
  const selectedData = dataJson[key];

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex flex-col items-center justify-center font-[Poppins,sans-serif]">
      <div className="relative">
        <svg id="grid" ref={svgRef}></svg>
        {selectedData && (
          <div
            className="absolute bg-white border border-gray-300 rounded-lg shadow-md px-3 py-2 text-xs pointer-events-none z-10 flex items-center justify-between"
            style={{
              left: metadataPos.left,
              top: metadataPos.top,
              transform: "translate(-50%, -120%)",
              minWidth: 130,
            }}
          >
            <div className="flex flex-col leading-tight">
              <div className="flex items-center space-x-2 text-base">
                <span className="font-bold text-black">{selectedData.id}</span>
                <span
                  style={{
                    color: SOUND_TYPE_STYLES[selectedData.sound_type]?.color || "#555",
                    fontWeight: 600,
                  }}
                >
                  {selectedData.sound_type}
                </span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <span
                  style={{
                    color: GENDER_COLORS[selectedData.gender] || "#555",
                    fontWeight: 600,
                  }}
                >
                  {selectedData.gender}
                </span>
                <span
                  style={{
                    color: AGE_COLORS(selectedData.age),
                    fontWeight: 600,
                  }}
                >
                  {selectedData.age}
                </span>
              </div>
            </div>
            <div className="ml-2 text-2xl">
              {SOUND_TYPE_STYLES[selectedData.sound_type]?.emoji || "🎧"}
            </div>
          </div>
        )}
      </div>

      <div className="fixed top-6 right-6 z-20">
        <IconButton handleClick={handleClickAbout}>
          ?
        </IconButton>
      </div>

      <div className="fixed bottom-6 right-6 z-20 flex flex-col items-center space-y-4">
        <IconButton handleClick={handleZoomIn}>
          +
        </IconButton>
        <IconButton handleClick={handleZoomOut}>
          &minus;
        </IconButton>
      </div>

      <div className="fixed top-6 left-6 z-20">
        <SearchBar
          filters={filters}
          setFilters={setFilters}
        />
      </div>
    </div>
  );
}