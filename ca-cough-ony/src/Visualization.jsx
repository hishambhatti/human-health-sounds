import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_grid_index_p100.json" // the JSON from Python script

const GRID_SIZE = 143
const CELL_SIZE = 5
const CELL_GAP = 0

export default function Visualization() {
  const [selected, setSelected] = useState({ x: 71, y: 71 })
  const [metadataPos, setMetadataPos] = useState({ left: 0, top: 0})
  const svgRef = useRef()
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current)
      .attr("width", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .attr("height", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .style("background-color", "#fff");

    // Clear previous
    svg.selectAll("*").remove();

    // Draw outer border so you can see full 143x143 bounds
    svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .attr("height", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5);

    // Draw cells only where metadata exists
    Object.keys(dataJson).forEach(key => {
      const [x, flippedY] = key.split("_").map(Number);
      const y = GRID_SIZE - 1 - flippedY; // flip back for display consistency
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
  }, []);

  const handleCellClick = (x, y, event) => {
    setSelected({ x, y });

    const flippedY = GRID_SIZE - 1 - y;
    const key = `${x}_${flippedY}`;
    const selectedData = dataJson[key];
    if (!selectedData) return;

    // Compute metadata position relative to SVG
    const rect = event.target.getBoundingClientRect();
    const svgRect = svgRef.current.getBoundingClientRect();

    setMetadataPos({
      left: rect.x - svgRect.x + CELL_SIZE * 0.75,
      top: rect.y - svgRect.y - CELL_SIZE * 2, // above the cell
    });

    const fileName = selectedData.file_name; // e.g. "f0423_0_sniff"
    const audioPath = `/audio/${fileName}.wav`; // from public/audio

    // Stop any currently playing sound
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Create and play new audio
    const newAudio = new Audio(audioPath);
    newAudio.play();
    setAudio(newAudio);
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    // Reset all cells
    svg.selectAll("rect")
      .filter(function () {
          return d3.select(this).attr("id")?.startsWith("cell-");
        })
      .attr("fill", "#fff")
      .attr("stroke", "#ccc")
      .attr("width", CELL_SIZE)
      .attr("height", CELL_SIZE)
      .attr("transform", null)

    // Highlight selected
    const sel = d3.select(`#cell-${selected.x}-${selected.y}`);
    if (!sel.empty()) {
      sel.raise() // bring to front
      sel.transition()
        .duration(150)
        .attr("fill", "#d7ecff") // lighter blue
        .attr("stroke", "#5dade2") // light blue border
        .attr("width", CELL_SIZE * 1.8)
        .attr("height", CELL_SIZE * 1.8)
        .attr("transform", `translate(${-CELL_SIZE * 0.4},${-CELL_SIZE * 0.4})`);
    }
  }, [selected]);

  const flippedY = GRID_SIZE - 1 - selected.y;
  const key = `${selected.x}_${flippedY}`;
  const selectedData = dataJson[key];

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
      <div style={{ position: "relative" }}>
        <svg id="grid" ref={svgRef}></svg>

        {selectedData && (
          <div
            style={{
              position: "absolute",
              left: metadataPos.left,
              top: metadataPos.top,
              transform: "translate(-50%, -100%)",
              backgroundColor: "#ffffff",
              border: "1px solid #ccc",
              borderRadius: 2,
              boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
              padding: "8px 10px",
              fontSize: 12,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              height: CELL_SIZE * 2, // same height as enlarged cell
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10
            }}
          >
            {selectedData.id}
          </div>
        )}
      </div>
    </div>
  );
}
