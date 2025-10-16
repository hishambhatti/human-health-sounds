import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_grid_index_p100.json" // the JSON from Python script

const GRID_SIZE = 143
const CELL_SIZE = 10
const CELL_GAP = 0

export default function Visualization() {
  const [selected, setSelected] = useState({ x: 71, y: 71 })

  // Ref to keep track of currently playing sound
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    const svg = d3.select("#grid")
      .attr("width", GRID_SIZE * (CELL_SIZE + CELL_GAP))
      .attr("height", GRID_SIZE * (CELL_SIZE + CELL_GAP));

    // Clear previous
    svg.selectAll("*").remove();

    // Draw cells
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        svg.append("rect")
          .attr("x", x * (CELL_SIZE + CELL_GAP))
          .attr("y", y * (CELL_SIZE + CELL_GAP))
          .attr("width", CELL_SIZE)
          .attr("height", CELL_SIZE)
          .attr("fill", "#fff")
          .attr("stroke", "#ccc")
          .attr("id", `cell-${x}-${y}`)
          .on("click", () => handleCellClick(x, y));
      }
    }
  }, []);

  const handleCellClick = (x, y) => {
    setSelected({ x, y });

    const flippedY = GRID_SIZE - 1 - y;
    const key = `${x}_${flippedY}`;
    const selectedData = dataJson[key];
    if (!selectedData) return;

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
    // Reset all cells
    d3.selectAll("rect")
      .attr("fill", "#fff")
      .attr("width", CELL_SIZE)
      .attr("height", CELL_SIZE);

    // Highlight selected
    const sel = d3.select(`#cell-${selected.x}-${selected.y}`);
    sel.attr("fill", "#add8e6")
       .attr("width", CELL_SIZE * 1.5)
       .attr("height", CELL_SIZE * 1.5);

  }, [selected]);

  const flippedY = GRID_SIZE - 1 - selected.y;
  const key = `${selected.x}_${flippedY}`;
  const selectedData = dataJson[key];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 50 }}>
      {selectedData && (
        <div style={{ marginBottom: 20, padding: 10, border: "1px solid #ccc", borderRadius: 4, backgroundColor: "#f0f0f0" }}>
          {key} {" "}
          {selectedData.id}
        </div>
      )}
      <svg id="grid"></svg>
    </div>
  );
}
