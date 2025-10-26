import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_processed_grid_index_p50.json"
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

const AGE_RANGES = [
  { label: "18–24", min: 18, max: 24 },
  { label: "25–34", min: 25, max: 34 },
  { label: "35–44", min: 35, max: 44 },
  { label: "45–54", min: 45, max: 54 },
  { label: "55–64", min: 55, max: 64 },
  { label: "65+", min: 65, max: Infinity },
];

const GRID_SIZE = 144
const CELL_SIZE = 5
const CELL_GAP = 0

export default function Visualization({ handleClickAbout }) {
  const [selected, setSelected] = useState({ x: 71, y: 71 })
  const [metadataPos, setMetadataPos] = useState({ left: 0, top: 0})
  const canvasRef = useRef()
  const [filters, setFilters] = useState([]);
  const [images, setImages] = useState({});

  const handleZoomIn = () => {
    console.log("Zoom In clicked!");
    // Implement zoom in logic (e.g., change CELL_SIZE, re-render)
  };

  const handleZoomOut = () => {
    console.log("Zoom Out clicked!");
    // Implement zoom out logic
  };

  // Function to map screen coordinates to grid coordinates
  const getCellCoordinates = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Convert pixel coordinates to grid index
    const x = Math.floor(canvasX / (CELL_SIZE + CELL_GAP));
    const y = Math.floor(canvasY / (CELL_SIZE + CELL_GAP));

    return { x, y };
  }, []);

  const handleCellClick = useCallback((x, y) => {
    // Check if the click is within the grid bounds and on a valid cell
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    setSelected({ x, y });

    const flippedY = GRID_SIZE - 1 - y;
    const key = `${x}_${flippedY}`;
    const selectedData = dataJson[key];
    if (!selectedData) return;

    // Compute metadata position
    const left = x * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
    const top = y * (CELL_SIZE + CELL_GAP) - CELL_SIZE * 5;
    setMetadataPos({ left, top });

    // Create and play a new Audio instance
    const fileName = selectedData.file_name;
    const audioPath = `audio_processed/${fileName}.wav`;
    const newAudio = new Audio(audioPath);
    newAudio.play().catch(() => {});
  }, []);

  const handleCanvasClick = useCallback((e) => {
    const { x, y } = getCellCoordinates(e);
    handleCellClick(x, y);
  }, [getCellCoordinates, handleCellClick]);

  // --- NEW: Image Pre-loading Effect ---
  useEffect(() => {
      const allFileNames = Object.keys(dataJson).map(key => dataJson[key].file_name);
      let loadedImages = {};
      let totalToLoad = 0;

      // Filter to only include files that exist in the JSON
      const uniqueFileNames = [...new Set(allFileNames)];
      totalToLoad = uniqueFileNames.length;
      let loadedCount = 0;

      if (totalToLoad === 0) return;

      uniqueFileNames.forEach(fileName => {
          const img = new Image();
          const imagePath = `/sparse_spectrograms/${fileName}.png`;

          img.onload = () => {
              loadedImages[fileName] = img;
              loadedCount++;
              if (loadedCount === totalToLoad) {
                  setImages(loadedImages);
              }
          };
          img.onerror = () => {
              // Gracefully handle missing images
              loadedCount++;
              if (loadedCount === totalToLoad) {
                  setImages(loadedImages);
              }
          };
          img.src = imagePath;
      });
  }, []); // Run only once on mount

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || Object.keys(images).length === 0) return;

    const context = canvas.getContext("2d");
    const width = GRID_SIZE * (CELL_SIZE + CELL_GAP);
    const height = GRID_SIZE * (CELL_SIZE + CELL_GAP);

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear the canvas
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);

    const activeFilters = filters.filter(f => f.active).map(f => f.name);

    Object.keys(dataJson).forEach(key => {
      const [x, flippedY] = key.split("_").map(Number);
      const data = dataJson[key];
      const y = GRID_SIZE - 1 - flippedY;

      const matches =
        activeFilters.length === 0 ||
        activeFilters.every((f) => {
          // Gender or sound type match
          if (f === data.gender || f.toLowerCase() === data.sound_type.toLowerCase()) return true;

          // Age range match
          const ageLabel = f.replace("Age: ", "");
          const range = AGE_RANGES.find((r) => r.label === ageLabel);
          if (range) {
            const ageNum = Number(data.age);
            return ageNum >= range.min && ageNum <= range.max;
          }
          return false;
      });
      if (!matches) return;

      const fileName = data.file_name;
      const image = images[fileName];
      const drawX = x * (CELL_SIZE + CELL_GAP);
      const drawY = y * (CELL_SIZE + CELL_GAP);

      if (image) {
        // Draw the image
        context.drawImage(image, drawX, drawY, CELL_SIZE, CELL_SIZE);
        }
    });
  }, [filters, images]);

  const prevSelected = useRef(selected);

  // --- SELECTION HIGHLIGHT EFFECT ---
  // This must run *after* the main draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selected) return;

    const context = canvas.getContext("2d");
    const { x, y } = selected;
    const highlightSize = CELL_SIZE * 8;
    const offset = CELL_SIZE * 3.5;
    const drawX = x * (CELL_SIZE + CELL_GAP);
    const drawY = y * (CELL_SIZE + CELL_GAP);
    const fileName = dataJson[`${x}_${GRID_SIZE - 1 - y}`]?.file_name;
    const selectedImage = images[fileName];

    // Redraw the main grid to clear the old selection
    // NOTE: This will be very fast since it's just pixel copying from the previous draw,
    // but a truly optimized solution would only clear the local area.
    // For simplicity, we'll clear the old highlight area and redraw the image at normal size.

    // Clear the old highlight area (assuming the old one was CELL_SIZE * 8)
    const prev = prevSelected.current;
    if (prev && (prev.x !== x || prev.y !== y)) {
      const prevDrawX = prev.x * (CELL_SIZE + CELL_GAP);
      const prevDrawY = prev.y * (CELL_SIZE + CELL_GAP);

      // Clear old highlight area
      context.clearRect(prevDrawX - offset, prevDrawY - offset, highlightSize, highlightSize);

      // Redraw the previously selected image at normal size
      const prevFileName = dataJson[`${prev.x}_${GRID_SIZE - 1 - prev.y}`]?.file_name;
      const prevImage = images[prevFileName];
      if (prevImage) {
          context.drawImage(prevImage, prevDrawX, prevDrawY, CELL_SIZE, CELL_SIZE);
      }
    }

    // Draw NEW Highlight
    if (selectedImage) {
      // Draw the background highlight fill
      context.fillStyle = "#d7ecff"; // Light blue fill
      context.strokeStyle = "#5dade2"; // Blue stroke
      context.lineWidth = 1;

      // Draw the background rectangle (scaled up)
      context.fillRect(drawX - offset, drawY - offset, highlightSize, highlightSize);
      context.strokeRect(drawX - offset, drawY - offset, highlightSize, highlightSize);

      // Draw the image on top of the highlight
      // This is where you draw the spectrogram zoomed in
      context.drawImage(selectedImage, drawX - offset, drawY - offset, highlightSize, highlightSize);
    }

    prevSelected.current = selected;
  }, [selected, images]); // Depends on selected cell and loaded images

  const flippedY = GRID_SIZE - 1 - selected.y;
  const key = `${selected.x}_${flippedY}`;
  const selectedData = dataJson[key];

  // Calculate grid size for the Canvas Wrapper div
  const wrapperWidth = GRID_SIZE * (CELL_SIZE + CELL_GAP);
  const wrapperHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP);

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex flex-col items-center justify-center font-[Poppins,sans-serif]">
      <div className="relative" style={{ width: wrapperWidth, height: wrapperHeight }}>
        {/* Replace SVG with Canvas */}
        <canvas
          id="grid"
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            display: Object.keys(images).length === 0 ? 'none' : 'block', // Hide canvas until images load
            cursor: 'pointer'
          }}
        ></canvas>
        {Object.keys(images).length === 0 && (
            <div style={{ padding: '20px', fontSize: '20px' }}>Loading {GRID_SIZE * GRID_SIZE} spectrograms...</div>
        )}

        {/* Metadata display remains the same */}
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
          SOUND_TYPE_STYLES={SOUND_TYPE_STYLES}
          GENDER_COLORS={GENDER_COLORS}
          AGE_RANGES={AGE_RANGES}
          AGE_COLORS={AGE_COLORS}
        />
      </div>
    </div>
  );
}