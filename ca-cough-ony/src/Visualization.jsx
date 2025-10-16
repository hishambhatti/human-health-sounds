import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import IconButton from "./components/IconButton";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_grid_index_p100.json" // the JSON from Python script

const GRID_SIZE = 143
const CELL_SIZE = 8
const CELL_GAP = 0

const SOUND_COLORS = {
  laughter: "#e57373",
  throatclearing: "#ffb74d",
  sigh: "#64b5f6",
  sneeze: "#ba68c8",
  cough: "#a1887f",
  sniff: "#81c784",
};

export default function Visualization({ handleClickAbout }) {
  const [selected, setSelected] = useState({ x: 71, y: 71 })
  const [metadataPos, setMetadataPos] = useState({ left: 0, top: 0})
  const svgRef = useRef()
  const gRef = useRef()
  const zoomRef = useRef()
  const [audio, setAudio] = useState(null);

  useEffect(() => {
    const svg = d3
      .select(svgRef.current)
      .attr("width", GRID_SIZE * CELL_SIZE)
      .attr("height", GRID_SIZE * CELL_SIZE)
      .style("background-color", "#fff")
      .style("overflow", "visible") // allows highlight growth beyond edges

    // Clear previous
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("id", "grid-group");
    gRef.current = g;

    // Draw cells only where metadata exists
    Object.keys(dataJson).forEach((key) => {
      const [x, flippedY] = key.split("_").map(Number);
      const y = GRID_SIZE - 1 - flippedY; // flip back for display consistency
      const d = dataJson[key]
      const color = SOUND_COLORS[d.sound_type?.toLowerCase()] || "#cccccc";

      g
        .append("rect")
        .attr("x", x * CELL_SIZE)
        .attr("y", y * CELL_SIZE)
        .attr("width", CELL_SIZE)
        .attr("height", CELL_SIZE)
        .attr("fill", color)
        .attr("id", `cell-${x}-${y}`)
        .style("cursor", "pointer")
        .on("click", (event) => handleCellClick(x, y, event));
    });

    // Draw grid border after cells
    g.append("rect")
      .attr("x", -1)
      .attr("y", -1)
      .attr("width", GRID_SIZE * CELL_SIZE + 2)
      .attr("height", GRID_SIZE * CELL_SIZE + 2)
      .attr("fill", "none")
      .attr("stroke", "#777")
      .attr("stroke-width", 1.5);

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });

    svg.call(zoom);
    zoomRef.current = zoom;
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
      left: rect.x - svgRect.x + CELL_SIZE * 0.5,
      top: rect.y - svgRect.y - CELL_SIZE * 5, // above the cell
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
    svg
      .selectAll("rect")
      .filter((d, i, nodes) =>
        d3.select(nodes[i]).attr("id")?.startsWith("cell-")
      )
      .attr("transform", null)
      .attr("width", CELL_SIZE)
      .attr("height", CELL_SIZE)
      .attr("stroke", "none");

    // Highlight selected
    const sel = d3.select(`#cell-${selected.x}-${selected.y}`);
    if (!sel.empty()) {
      sel.raise() // bring to front
      sel
        .transition()
        .duration(100)
        .attr("width", CELL_SIZE * 8)
        .attr("height", CELL_SIZE * 8)
        .attr("transform", `translate(${-CELL_SIZE * 3.5},${-CELL_SIZE * 3.5})`) // cell_size - 1% 2
        .attr("stroke", "#42a5f5")
        .attr("stroke-width", 2.5)
    }
  }, [selected]);

  const calculateTargetTransform = (zoomScale, selectedCell) => {
    const { x, y } = selectedCell;
    const gridCenter = (GRID_SIZE * CELL_SIZE) / 2;
    const targetX = x * CELL_SIZE + CELL_SIZE / 2; // center of cell
    const targetY = y * CELL_SIZE + CELL_SIZE / 2; // center of cell

    // Calculate the required translation *before* scaling
    const newTx = gridCenter - targetX * zoomScale;
    const newTy = gridCenter - targetY * zoomScale;

    // Create a new transform: first translate, then scale (d3.zoomIdentity.translate(tx, ty).scale(k))
    // We need to apply the translation that places the center point at (0,0) before scaling
    // and then translate to the final position.

    // The correct D3 way is often: zoomIdentity.translate(x, y).scale(k)
    // which is equivalent to applying scale first, then translation (scale * x + tx)

    // Recalculating the necessary translation for the zoom to hit the center
    const tx = gridCenter / zoomScale - targetX;
    const ty = gridCenter / zoomScale - targetY;

    return d3.zoomIdentity.translate(tx, ty).scale(zoomScale);
  };

  const handleZoom = (direction) => {
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    if (!zoom) return;

    svg.transition().duration(300).call(zoom.scaleBy, direction === "in" ? 1.3 : 1 / 1.3);
  };

  const flippedY = GRID_SIZE - 1 - selected.y;
  const key = `${selected.x}_${flippedY}`;
  const selectedData = dataJson[key];

  return (
    <div className="flex justify-center mt-10 relative">
      <div className="relative">
        <svg id="grid" ref={svgRef}></svg>

        {selectedData && (
          <div className="absolute bg-white border border-gray-300 rounded-md shadow-md px-2 py-1 text-xs text-center z-10 flex items-center justify-center"
            style={{
              left: metadataPos.left,
              top: metadataPos.top,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              height: CELL_SIZE * 2,
            }}
          >
            {selectedData.id}
          </div>
        )}

        {/* 🕹️ Floating Control Buttons */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: -70,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <IconButton icon="?" handleClick={handleClickAbout} />
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: -70,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <IconButton icon="+" handleClick={() => handleZoom("in")} />
          <IconButton icon="–" handleClick={() => handleZoom("out")} />
        </div>
      </div>
    </div>
  );
}
