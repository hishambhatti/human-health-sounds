import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_processed_grid_index_p50.json"
import IconButton from "./components/IconButton";
import SearchBar from "./components/SearchBar";
import ProgressBar from "./components/ProgressBar";

// --- CONSTANTS & HELPER FUNCTIONS (Unchanged) ---
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
const CELL_SIZE = 8
const CELL_GAP = 0
const INITIAL_SCALE = 2.0;
const MIN_SCALE = 0.5;
const MAX_SCALE = 8.0;
const ZOOM_FACTOR = 1.02;
const WHEEL_ZOOM_FACTOR = 1.05;
const CENTER_SMOOTHING_FACTOR = 0.08;
const MIN_PLAY_INTERVAL_MS = 125; // Max 8 playing simultaneously
const IMAGE_LOAD_PATH = "sparse_spectrograms";

const CANVAS_DRAW_SIZE = GRID_SIZE * (CELL_SIZE + CELL_GAP);

const checkFilters = (data, filters, AGE_RANGES) => {
  const activeFilters = filters.filter(f => f.active).map(f => f.name);
  if (activeFilters.length === 0) return true;
  if (!data) return false;

  return activeFilters.every((f) => {
    if (f === data.gender || f.toLowerCase() === data.sound_type.toLowerCase()) return true;

    const ageLabel = f.replace("Age: ", "");
    const range = AGE_RANGES.find((r) => r.label === ageLabel);
    if (range) {
      const ageNum = Number(data.age);
      return ageNum >= range.min && ageNum <= range.max;
    }
    return false;
  });
};

// --- NEW COMPONENT ---
export default function FastVisualization({ handleClickAbout }) {
  const initialCenterIndex = Math.floor(GRID_SIZE / 2);
  const [selected, setSelected] = useState({ x: initialCenterIndex, y: initialCenterIndex })
  const [metadataPos, setMetadataPos] = useState({ left: 0, top: 0})

  const canvasRef = useRef()
  const [filters, setFilters] = useState([]);
  const [images, setImages] = useState({});
  const isMouseDownRef = useRef(false);

  const preRenderedGridRef = useRef(null);
  const [isGridReady, setIsGridReady] = useState(false);
  const [initialCenterApplied, setInitialCenterApplied] = useState(false);
  const zoomIntervalRef = useRef(null);
  const smoothCenterTimeoutRef = useRef(null);

  // Track last play time for audio buffer
  const lastPlayTimeRef = useRef(0);

  const [loadingProgress, setLoadingProgress] = useState(0);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [transform, setTransform] = useState({
    scale: MIN_SCALE,
    translateX: 0,
    translateY: 0,
  });

  // --- Centering Helper (Finds the translation for a cell to be centered on screen) ---
  const calculateCenterTransform = useCallback((scale, targetX, targetY) => {
    if (!canvasRef.current) return { translateX: 0, translateY: 0 };

    const screenCenterX = canvasRef.current.clientWidth / 2;
    const screenCenterY = canvasRef.current.clientHeight / 2;

    const cellCenterX = (targetX * (CELL_SIZE + CELL_GAP)) + CELL_SIZE / 2;
    const cellCenterY = (targetY * (CELL_SIZE + CELL_GAP)) + CELL_SIZE / 2;

    const newTranslateX = screenCenterX - (cellCenterX * scale);
    const newTranslateY = screenCenterY - (cellCenterY * scale);

    return { translateX: newTranslateX, translateY: newTranslateY };
  }, []);

  // 1. IMAGE PRE-LOADING EFFECT (Asynchronous task)
  useEffect(() => {
    const allFileNames = Object.keys(dataJson).map(key => dataJson[key].file_name);
    let loadedImages = {};
    const uniqueFileNames = [...new Set(allFileNames)];
    const totalToLoad = uniqueFileNames.length;
    let loadedCount = 0;

    if (totalToLoad === 0) {
      setIsGridReady(true);
      return;
    }

    uniqueFileNames.forEach(fileName => {
      const img = new Image();
      const imagePath = `/${IMAGE_LOAD_PATH}/${fileName}.png`;

      const checkLoadComplete = () => {
        loadedCount++;
        const newProgress = Math.min(100, Math.round((loadedCount / totalToLoad) * 100));
        setLoadingProgress(newProgress);

        if (loadedCount === totalToLoad) {
          setImages(loadedImages);
          // Set progress to 100 one last time to ensure it is complete
          setLoadingProgress(100);
        }
      }

      img.onload = () => {
        loadedImages[fileName] = img;
        checkLoadComplete();
      };
      img.onerror = () => {
        // Still count failed images towards the total, but log the error
        console.warn(`Failed to load image: ${imagePath}`);
        checkLoadComplete();
      };
      img.src = imagePath;
    });

  }, []);

  useLayoutEffect(() => {
      // Check if the ref is available
      if (canvasRef.current) {
          const newWidth = canvasRef.current.clientWidth;
          const newHeight = canvasRef.current.clientHeight;

          // Only update if dimensions are non-zero AND if they are different from current state.
          // This prevents infinite loops if the browser reports 0,0 multiple times.
          if (newWidth > 0 && newHeight > 0 && (newWidth !== canvasSize.width || newHeight !== canvasSize.height)) {
              setCanvasSize({
                  width: newWidth,
                  height: newHeight,
              });
          }
      }
  }, [canvasSize.width, canvasSize.height]);

  useLayoutEffect(() => {
    if (Object.keys(images).length > 0 && !initialCenterApplied && canvasSize.width > 0) {

        const centerCellIndex = GRID_SIZE / 2;

        const { translateX, translateY } = calculateCenterTransform(INITIAL_SCALE, centerCellIndex, centerCellIndex);

        setTransform({
            scale: INITIAL_SCALE,
            translateX: translateX,
            translateY: translateY,
        });

        // Now that centering is applied, we mark it as done.
        setInitialCenterApplied(true);
    }
  }, [images, calculateCenterTransform, initialCenterApplied, canvasSize.width, canvasSize.height]);


  const compositeGrid = useCallback((currentFilters) => {
    if (Object.keys(images).length === 0) return;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_DRAW_SIZE;
    offscreenCanvas.height = CANVAS_DRAW_SIZE;
    const context = offscreenCanvas.getContext("2d");

    context.fillStyle = "#fff";
    context.fillRect(0, 0, CANVAS_DRAW_SIZE, CANVAS_DRAW_SIZE);

    Object.keys(dataJson).forEach(key => {
      const [x, flippedY] = key.split("_").map(Number);
      const data = dataJson[key];
      const y = GRID_SIZE - 1 - flippedY;

      const matches = checkFilters(data, currentFilters, AGE_RANGES);
      const fileName = data.file_name;
      const image = images[fileName];

      const drawX = x * (CELL_SIZE + CELL_GAP);
      const drawY = y * (CELL_SIZE + CELL_GAP);

      if (matches && image) {
        context.drawImage(image, drawX, drawY, CELL_SIZE, CELL_SIZE);
      } else {
        context.fillStyle = "#f4f3ef";
        context.fillRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
      }
    });

    preRenderedGridRef.current = offscreenCanvas;
    setIsGridReady(true);
  }, [images]);

  useEffect(() => {
    if (Object.keys(images).length > 0) {
      setIsGridReady(false);
      compositeGrid(filters);
    }
  }, [filters, images, compositeGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const preRenderedGrid = preRenderedGridRef.current;
    if (!canvas || !preRenderedGrid || !isGridReady) return;

    const context = canvas.getContext("2d");
    const { scale, translateX, translateY } = transform;
    const { x: selX, y: selY } = selected;

    const viewWidth = canvas.clientWidth;
    const viewHeight = canvas.clientHeight;
    canvas.width = viewWidth;
    canvas.height = viewHeight;

    context.fillStyle = "#f4f3ef";
    context.fillRect(0, 0, viewWidth, viewHeight);

    context.save();
    context.translate(translateX, translateY);
    context.scale(scale, scale);
    context.drawImage(preRenderedGrid, 0, 0);
    context.restore();

    // Draw the Selection Highlight
    const key = `${selX}_${GRID_SIZE - 1 - selY}`;
    const selectedData = dataJson[key];
    const fileName = selectedData?.file_name;
    const image = images[fileName];

    if (image) {
      const cellDrawX = selX * (CELL_SIZE + CELL_GAP);
      const cellDrawY = selY * (CELL_SIZE + CELL_GAP);

      const screenX = cellDrawX * scale + translateX;
      const screenY = cellDrawY * scale + translateY;

      const highlightSize = CELL_SIZE * 8;

      const highlightOffset = (highlightSize - CELL_SIZE * scale) / 2;

      let highlightDrawX = screenX - highlightOffset;

      // Note: CELL_SIZE * CELL_SIZE is a constant to make the metadata the right height above the selection
      let highlightDrawY = screenY - highlightOffset + CELL_SIZE * CELL_SIZE;

      setMetadataPos({ left: screenX + (CELL_SIZE * scale) / 2, top: highlightDrawY});

      if (screenX + highlightSize > 0 && screenY + highlightSize > 0 &&
          screenX < viewWidth && screenY < viewHeight) {

        const highlightOffset = (highlightSize - CELL_SIZE * scale) / 2;

        highlightDrawX = screenX - highlightOffset;
        highlightDrawY = screenY - highlightOffset;

        context.fillStyle = "#d7ecff";
        context.strokeStyle = "#5dade2";
        context.lineWidth = 2;

        context.fillRect(highlightDrawX, highlightDrawY, highlightSize, highlightSize);
        context.strokeRect(highlightDrawX, highlightDrawY, highlightSize, highlightSize);

        context.drawImage(image, highlightDrawX, highlightDrawY, highlightSize, highlightSize);
      }
    }
  }, [transform, selected, isGridReady, images]);

  const getCellCoordinates = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const { scale, translateX, translateY } = transform;
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const gridX_pre_scale = (canvasX - translateX) / scale;
    const gridY_pre_scale = (canvasY - translateY) / scale;
    const x = Math.floor(gridX_pre_scale / (CELL_SIZE + CELL_GAP));
    const y = Math.floor(gridY_pre_scale / (CELL_SIZE + CELL_GAP));
    return { x, y };
  }, [transform]);

  // Add this helper function inside FastVisualization, near your other helper functions
  const findNearestValidCell = useCallback((startX, startY, currentFilters) => {
      // Check the start cell first
      const key = `${startX}_${GRID_SIZE - 1 - startY}`;
      const data = dataJson[key];
      if (data && checkFilters(data, currentFilters, AGE_RANGES)) {
          return { x: startX, y: startY };
      }

      // Spiral search outwards
      for (let r = 1; r < GRID_SIZE / 2; r++) { // r is the radius/distance
          // Check the boundary of the square defined by radius r
          for (let dx = -r; dx <= r; dx++) {
              for (let dy = -r; dy <= r; dy++) {
                  // Only check the cells on the square's perimeter for this radius
                  if (Math.abs(dx) === r || Math.abs(dy) === r) {
                      const x = startX + dx;
                      const y = startY + dy;

                      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                          const cellKey = `${x}_${GRID_SIZE - 1 - y}`;
                          const cellData = dataJson[cellKey];

                          // Check if cell exists and passes filters
                          if (cellData && checkFilters(cellData, currentFilters, AGE_RANGES)) {
                              return { x, y }; // Found the nearest valid cell
                          }
                      }
                  }
              }
          }
      }

      return null; // No valid cell found within the search limit
  }, []); // Dependency array is only needed if used in a component's body

  const handleCellSelect = useCallback((x, y) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    // 1. Determine the target cell coordinates
    let targetX = x;
    let targetY = y;

    const flippedY = GRID_SIZE - 1 - y;
    const key = `${x}_${flippedY}`;
    const selectedData = dataJson[key];
    const isCursorCellValid = selectedData && checkFilters(selectedData, filters, AGE_RANGES);

    if (!isCursorCellValid) {
        // 2. If the cursor cell is NOT valid, find the nearest valid one
        const nearestCell = findNearestValidCell(x, y, filters);

        if (!nearestCell) {
            // No nearby valid cell found, do nothing (i.e., stay on the current selection)
            return;
        }

        // 3. Snap the selection to the nearest valid cell
        targetX = nearestCell.x;
        targetY = nearestCell.y;
    }

    // Now, retrieve the data for the *actual* target cell (which may have been snapped)
    const targetFlippedY = GRID_SIZE - 1 - targetY;
    const targetKey = `${targetX}_${targetFlippedY}`;
    const finalSelectedData = dataJson[targetKey];

    // Safety check (should always pass if logic is correct)
    if (!finalSelectedData) return;

    // Prevent unnecessary state updates if we snapped to the current selection
    if (targetX === selected.x && targetY === selected.y) return;

    // 4. Update the selection and play the audio
    setSelected({ x: targetX, y: targetY });
    const fileName = finalSelectedData.file_name;
    const audioPath = `audio_processed/${fileName}.wav`;

    const now = Date.now();
    if (now - lastPlayTimeRef.current < MIN_PLAY_INTERVAL_MS) {
        return;
    }

    lastPlayTimeRef.current = now; // Update the last play time
    const newAudio = new Audio(audioPath);
    newAudio.play().catch(() => {});
  }, [selected.x, selected.y, filters, findNearestValidCell]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isMouseDownRef.current) return;
    const { x, y } = getCellCoordinates(e);
    handleCellSelect(x, y);
  }, [getCellCoordinates, handleCellSelect]);

  const handleMouseDown = useCallback((e) => {
    isMouseDownRef.current = true;
    handleCanvasMouseMove(e);
  }, [handleCanvasMouseMove]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
  }, []);

  useEffect(() => {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);


  const animateToCenter = useCallback(() => {
    // Target is the grid center at MIN_SCALE
    const targetTransform = calculateCenterTransform(MIN_SCALE, GRID_SIZE / 2, GRID_SIZE / 2);

    setTransform(prevTransform => {
        const { scale, translateX, translateY } = prevTransform;
        const diffX = targetTransform.translateX - translateX;
        const diffY = targetTransform.translateY - translateY;

        if (Math.abs(diffX) < 1 && Math.abs(diffY) < 1) {
            // When you get close, just lock to center
            if (smoothCenterTimeoutRef.current) clearTimeout(smoothCenterTimeoutRef.current);
            smoothCenterTimeoutRef.current = null;
            return { scale, ...targetTransform };
        }

        const newTranslateX = translateX + diffX * CENTER_SMOOTHING_FACTOR;
        const newTranslateY = translateY + diffY * CENTER_SMOOTHING_FACTOR;

        smoothCenterTimeoutRef.current = setTimeout(animateToCenter, 16);

        return {
            scale: scale,
            translateX: newTranslateX,
            translateY: newTranslateY,
        };
    });
  }, [calculateCenterTransform]);

  const applyZoom = useCallback((direction, factor) => {
    setTransform(prevTransform => {
      const { scale: oldScale, translateX: oldTX, translateY: oldTY } = prevTransform;
      let newScale = oldScale;

      if (smoothCenterTimeoutRef.current) {
          clearTimeout(smoothCenterTimeoutRef.current);
          smoothCenterTimeoutRef.current = null;
      }

      const shouldZoomOut = direction === 'out';

      if (shouldZoomOut) {
          if (oldScale <= MIN_SCALE) {
              // PHASE 2: Hit MIN_SCALE, start smooth center snap
              if (smoothCenterTimeoutRef.current === null) {
                  smoothCenterTimeoutRef.current = setTimeout(animateToCenter, 10);
              }
              return prevTransform;
          }
          // PHASE 1: Zoom out, keeping current cell fixed
          newScale = Math.max(oldScale / factor, MIN_SCALE);
      } else {
          // PHASE 1: Zoom in, keeping current cell fixed
          newScale = Math.min(oldScale * factor, MAX_SCALE);
      }

      if (newScale === oldScale) return prevTransform;

      // Calculate selected cell's center in grid space
      const cellCenterX = (selected.x * (CELL_SIZE + CELL_GAP)) + CELL_SIZE / 2;
      const cellCenterY = (selected.y * (CELL_SIZE + CELL_GAP)) + CELL_SIZE / 2;

      // Calculate the selected point's current screen position (PX, PY)
      const PX = cellCenterX * oldScale + oldTX;
      const PY = cellCenterY * oldScale + oldTY;

      // New translation to keep PX, PY fixed on screen after scale change
      const newTranslateX = PX - (cellCenterX * newScale);
      const newTranslateY = PY - (cellCenterY * newScale);

      return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      };
    });
  }, [selected.x, selected.y, animateToCenter]);

  const startZoom = useCallback((direction) => {
      if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = setInterval(() => {
          applyZoom(direction, ZOOM_FACTOR);
      }, 10);
  }, [applyZoom]);

  const stopZoom = useCallback(() => {
      if (zoomIntervalRef.current) {
          clearInterval(zoomIntervalRef.current);
          zoomIntervalRef.current = null;
      }
  }, []);

  const handleZoomInStart = () => startZoom('in');
  const handleZoomOutStart = () => startZoom('out');

  const handleWheel = useCallback((e) => {
    //e.preventDefault();
    if (!isGridReady) return;
    const direction = e.deltaY < 0 ? 'in' : 'out';
    applyZoom(direction, WHEEL_ZOOM_FACTOR);
  }, [isGridReady, applyZoom]);

  useEffect(() => {
    window.addEventListener('mouseup', stopZoom);
    return () => {
        window.removeEventListener('mouseup', stopZoom);
        if (smoothCenterTimeoutRef.current) clearTimeout(smoothCenterTimeoutRef.current);
    }
  }, [stopZoom]);

  const key = `${selected.x}_${GRID_SIZE - 1 - selected.y}`;
  const selectedData = dataJson[key];

  // This transform is used to determine if the zoom-out button should be disabled
  const fullCenterTransform = calculateCenterTransform(MIN_SCALE, GRID_SIZE / 2, GRID_SIZE / 2);
  const isPerfectlyCentered =
    transform.scale === MIN_SCALE &&
    Math.abs(transform.translateX - fullCenterTransform.translateX) < 1 &&
    Math.abs(transform.translateY - fullCenterTransform.translateY) < 1;

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex flex-col items-center justify-center font-[Poppins,sans-serif]">
      <div className="fixed inset-0" style={{ pointerEvents: isGridReady ? 'auto' : 'none' }}>
        <canvas
          id="grid"
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onWheel={handleWheel}
          style={{
            opacity: (isGridReady && initialCenterApplied) ? 1 : 0,
            transition: 'opacity 0.3s ease-in',
            cursor: isMouseDownRef.current ? 'grabbing' : 'pointer',
            width: '100%',
            height: '100%',
          }}
        ></canvas>
        {(!isGridReady || !initialCenterApplied) && (
            <ProgressBar progress={loadingProgress} />
        )}

        {selectedData && isGridReady && (
          <div
            className="absolute bg-white border border-gray-300 rounded-lg shadow-md px-3 py-2 text-xs pointer-events-none z-10 flex items-center justify-between"
            style={{
              left: metadataPos.left,
              top: metadataPos.top,
              transform: `translate(-50%, calc(-100% - ${CELL_SIZE * 8 + 10}px))`,
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
                </span >
              </div>
            </div>
            <div className="ml-2 text-2xl">
              {SOUND_TYPE_STYLES[selectedData.sound_type]?.emoji || "🎧"}
            </div>
          </div>
        )}
      </div>

      {selectedData && isGridReady && (<div>
        <div className="fixed top-6 right-6 z-20">
        <IconButton handleClick={handleClickAbout}>
          ?
        </IconButton>
        </div>

        <div className="fixed bottom-6 right-6 z-20 flex flex-col items-center space-y-4">
          <IconButton
            onMouseDown={handleZoomInStart}
            onMouseUp={stopZoom}
            onMouseLeave={stopZoom}
            disabled={transform.scale >= MAX_SCALE}
          >
            +
          </IconButton>
          <IconButton
            onMouseDown={handleZoomOutStart}
            onMouseUp={stopZoom}
            onMouseLeave={stopZoom}
            disabled={isPerfectlyCentered}
          >
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
      </div>)}
    </div>
  );
}