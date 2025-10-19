import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_grid_index_p100.json" // the JSON from Python script
import IconButton from "./components/IconButton";

const GRID_SIZE = 143
const CELL_SIZE = 5
const CELL_GAP = 0

export default function Visualization({ handleClickAbout }) {
  const [selected, setSelected] = useState({ x: 71, y: 71 })
  const [metadataPos, setMetadataPos] = useState({ left: 0, top: 0})
  const svgRef = useRef()
  const [audio, setAudio] = useState(null);

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

    // Draw the grid only once (on first render)
    if (svg.selectAll("rect").empty()) {
      // Outer border
      svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", GRID_SIZE * (CELL_SIZE + CELL_GAP))
        .attr("height", GRID_SIZE * (CELL_SIZE + CELL_GAP))
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 1.5);

      // Draw cells
      Object.keys(dataJson).forEach(key => {
        const [x, flippedY] = key.split("_").map(Number);
        const y = GRID_SIZE - 1 - flippedY;
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
    }

    // === Highlighting logic ===
    // Reset all cells
    svg.selectAll("rect")
      .filter(function () {
        return d3.select(this).attr("id")?.startsWith("cell-");
      })
      .attr("fill", "#fff")
      .attr("stroke", "#999")
      .attr("width", CELL_SIZE)
      .attr("height", CELL_SIZE)
      .attr("transform", null);

    // Highlight selected cell
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
  }, [selected, handleCellClick]);

  const flippedY = GRID_SIZE - 1 - selected.y;
  const key = `${selected.x}_${flippedY}`;
  const selectedData = dataJson[key];

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex flex-col items-center justify-center font-[Poppins,sans-serif]">
      <div className="relative">
        <svg id="grid" ref={svgRef}></svg>

        {selectedData && (
          <div className="absolute bg-white border border-gray-300 rounded shadow-md p-2 text-xs pointer-events-none whitespace-nowrap h-10 flex items-center justify-center z-10"
            style={{
              left: metadataPos.left,
              top: metadataPos.top,
              transform: "translate(-50%, -100%)",
              height: CELL_SIZE * 2, // same height as enlarged cell
            }}
          >
            {selectedData.id}
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
    </div>
  );
}