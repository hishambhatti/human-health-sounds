import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import dataJson from "/Users/hishambhatti/Desktop/Projects/human-health-sounds/ca-cough-ony/vocalsound_processed_grid_index_p50.json"
import SearchBar from "./SearchBar";
import ProgressBar from "./ProgressBar";
import AboutButton from "./AboutButton";
import ZoomButton from "./ZoomButton";
import * as C from "../visualization-config";

const IMAGE_LOAD_PATH = "sparse_spectrograms";
const CANVAS_DRAW_SIZE = C.GRID_SIZE * (C.CELL_SIZE + C.CELL_GAP);

const checkFilters = (data, filters) => {
  const activeFilters = filters.filter(f => f.active).map(f => f.name);
  if (activeFilters.length === 0) return true;
  if (!data) return false;

  return activeFilters.every((f) => {
    if (f === data.gender || f.toLowerCase() === data.sound_type.toLowerCase()) return true;

    const ageLabel = f.replace("Age: ", "");
    const range = C.AGE_RANGES.find((r) => r.label === ageLabel);
    if (range) {
      const ageNum = Number(data.age);
      return ageNum >= range.min && ageNum <= range.max;
    }
    return false;
  });
};

// --- NEW COMPONENT ---
export default function FastVisualization({ handleClickAbout }) {
  const initialCenterIndex = Math.floor(C.GRID_SIZE / 2);
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

  const [colorMode, setColorMode] = useState("None"); // "None", "Age", "Gender", "Sound Type"

  const trailHighlightsRef = useRef([]);

  const PAN_EDGE_THRESHOLD = 100;   // px from edge to start panning
  const PAN_SPEED = 0.04;         // smaller = slower pan (tune)
  const panDirectionRef = useRef({ dx: 0, dy: 0 });
  const isPanningRef = useRef(false);

  function getPanVector(clientX, clientY, rect) {
    const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from center
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      const mag = Math.sqrt(dx*dx + dy*dy);
      if (mag === 0) return { vx: 0, vy: 0 };

      // Normalize
      return { vx: dx / mag, vy: dy / mag };
  }

  const lastMousePos = useRef({ x: 0, y: 0 });

  const [transform, setTransform] = useState({
    scale: C.MIN_SCALE,
    translateX: 0,
    translateY: 0,
  });

  // --- Centering Helper (Finds the translation for a cell to be centered on screen) ---
  const calculateCenterTransform = useCallback((scale, targetX, targetY) => {
    if (!canvasRef.current) return { translateX: 0, translateY: 0 };

    const screenCenterX = canvasRef.current.clientWidth / 2;
    const screenCenterY = canvasRef.current.clientHeight / 2;

    const cellCenterX = (targetX * (C.CELL_SIZE + C.CELL_GAP)) + C.CELL_SIZE / 2;
    const cellCenterY = (targetY * (C.CELL_SIZE + C.CELL_GAP)) + C.CELL_SIZE / 2;

    const newTranslateX = screenCenterX - (cellCenterX * scale);
    const newTranslateY = screenCenterY - (cellCenterY * scale);

    return { translateX: newTranslateX, translateY: newTranslateY };
  }, []);

  function darkenColor(hex, amount = 0.25) {
    const num = parseInt(hex.replace("#", ""), 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.max(0, Math.min(255, r * (1 - amount)));
    g = Math.max(0, Math.min(255, g * (1 - amount)));
    b = Math.max(0, Math.min(255, b * (1 - amount)));

    return `rgb(${r}, ${g}, ${b})`;
  }

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

        const centerCellIndex = C.GRID_SIZE / 2;

        const { translateX, translateY } = calculateCenterTransform(C.INITIAL_SCALE, centerCellIndex, centerCellIndex);

        setTransform({
            scale: C.INITIAL_SCALE,
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
      const y = C.GRID_SIZE - 1 - flippedY;

      const matches = checkFilters(data, currentFilters, C.AGE_RANGES);
      const fileName = data.file_name;
      const image = images[fileName];

      const drawX = x * (C.CELL_SIZE + C.CELL_GAP);
      const drawY = y * (C.CELL_SIZE + C.CELL_GAP);

      if (matches && image) {
        context.drawImage(image, drawX, drawY, C.CELL_SIZE, C.CELL_SIZE);

        // === NEW COLOR OVERLAY SECTION ===
        let overlayColor = null;
        if (colorMode === "Age") overlayColor = C.AGE_COLORS(data.age);
        else if (colorMode === "Gender") overlayColor = C.GENDER_COLORS[data.gender];
        else if (colorMode === "Sound Type")
          overlayColor = C.SOUND_TYPE_STYLES[data.sound_type]?.color;

        if (overlayColor) {
          context.fillStyle = overlayColor + "33"; // add transparency (hex 88 = ~53% alpha)
          context.fillRect(drawX, drawY, C.CELL_SIZE, C.CELL_SIZE);

          const borderColor = darkenColor(overlayColor, 0.3);
          context.strokeStyle = borderColor;
          context.lineWidth = 0.25;
          context.strokeRect(drawX + 0.125, drawY + 0.125, C.CELL_SIZE - 0.25, C.CELL_SIZE - 0.25);
        }
      } else {
        context.fillStyle = "#f4f3ef";
        context.fillRect(drawX, drawY, C.CELL_SIZE, C.CELL_SIZE);
      }
    });

    preRenderedGridRef.current = offscreenCanvas;
    setIsGridReady(true);
  }, [images, colorMode]);

  useEffect(() => {
    if (Object.keys(images).length > 0) {
      setIsGridReady(false);
      compositeGrid(filters);
    }
  }, [colorMode, filters, images, compositeGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const preRenderedGrid = preRenderedGridRef.current;
    if (!canvas || !preRenderedGrid || !isGridReady) return;

    const context = canvas.getContext("2d");
    const { scale, translateX, translateY } = transform;
    const { x: selX, y: selY } = selected;

    const viewWidth = canvas.clientWidth;
    const viewHeight = canvas.clientHeight
    let animationFrameId;

    // params: image, highlightDrawX, highlightDrawY, highlightSize, highlightSize
    function drawDarkened(image, x, y, size, gamma) {
      // create a temporary canvas same size as the area you want to draw
      const tmp = document.createElement('canvas');
      tmp.width = size;
      tmp.height = size;
      const tctx = tmp.getContext('2d');

      // draw the image (scaled) onto the temp canvas
      tctx.drawImage(image, 0, 0, size, size);

      // read pixels for the area
      const imgData = tctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      // apply gamma to luminance and scale channels proportionally
      // gamma > 1 darkens midtones (try 1.6 - 2.4 depending on how dark you want)
      const invGamma = 1 / gamma; // we will use pow(br/255, gamma) below

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // compute brightness (luminance)
        const br = 0.299 * r + 0.587 * g + 0.114 * b; // 0..255

        if (br === 0) { // black stays black
          continue;
        }

        // new brightness after gamma: values near 255 remain near 255, mid grays become darker
        const newBr = 255 * Math.pow(br / 255, gamma);

        // ratio to scale RGB while preserving color/tone
        const scale = newBr / br;

        data[i]     = Math.max(0, Math.min(255, data[i] * scale));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * scale));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * scale));
        // alpha (data[i+3]) unchanged
      }

      // put adjusted pixels back and draw onto main canvas
      tctx.putImageData(imgData, 0, 0);
      context.drawImage(tmp, x, y);
    }

    const draw = () => {
      canvas.width = viewWidth;
      canvas.height = viewHeight;

      context.fillStyle = "#f4f3ef"; // Outside of grid is colored beige
      context.fillRect(0, 0, viewWidth, viewHeight);

      context.save();
      context.translate(translateX, translateY);
      context.scale(scale, scale);
      context.drawImage(preRenderedGrid, 0, 0);
      context.restore();

      const now = Date.now();
      let shouldContinueAnimating = false;

      const trails = trailHighlightsRef.current.filter(
      t => now - t.timestamp < C.TRAIL_FADE_MS
    );
      trailHighlightsRef.current = trails; // cleanup expired

      // --- 2. Draw Trail Highlights (NEW) ---
      // Draw trails FIRST (below selection)
    trails.forEach(item => {
      const timePassed = now - item.timestamp;
      const alpha = 1 - (timePassed / C.TRAIL_FADE_MS);
      const cellDrawX = item.x * (C.CELL_SIZE + C.CELL_GAP);
      const cellDrawY = item.y * (C.CELL_SIZE + C.CELL_GAP);
      const screenX = cellDrawX * transform.scale + transform.translateX;
      const screenY = cellDrawY * transform.scale + transform.translateY;
      const size = C.CELL_SIZE * transform.scale;
      context.strokeStyle = `rgba(93, 173, 226, ${alpha})`;
      context.lineWidth = 1.5;
      context.strokeRect(screenX, screenY, size, size);
    });

      // Draw the Selection Highlight
      const key = `${selX}_${C.GRID_SIZE - 1 - selY}`;
      const selectedData = dataJson[key];
      const fileName = selectedData?.file_name;
      const image = images[fileName];

      if (image) {
        const cellDrawX = selX * (C.CELL_SIZE + C.CELL_GAP);
        const cellDrawY = selY * (C.CELL_SIZE + C.CELL_GAP);

        const screenX = cellDrawX * scale + translateX;
        const screenY = cellDrawY * scale + translateY;

        const highlightSize = C.CELL_SIZE * 8;

        const highlightOffset = (highlightSize - C.CELL_SIZE * scale) / 2;

        let highlightDrawX = screenX - highlightOffset;

        // Note: C.CELL_SIZE * C.CELL_SIZE is a constant to make the metadata the right height above the selection
        let highlightDrawY = screenY - highlightOffset + C.CELL_SIZE * C.CELL_SIZE;

        setMetadataPos({ left: screenX + (C.CELL_SIZE * scale) / 2, top: highlightDrawY});

        if (screenX + highlightSize > 0 && screenY + highlightSize > 0 &&
            screenX < viewWidth && screenY < viewHeight) {

          const highlightOffset = (highlightSize - C.CELL_SIZE * scale) / 2;

          highlightDrawX = screenX - highlightOffset;
          highlightDrawY = screenY - highlightOffset;

          context.fillStyle = "#d7ecff";
          context.strokeStyle = "#5dade2";

          context.lineWidth = 3.5;

          let overlayColor = null;
          if (colorMode === "Age") overlayColor = C.AGE_COLORS(selectedData.age);
          else if (colorMode === "Gender") overlayColor = C.GENDER_COLORS[selectedData.gender];
          else if (colorMode === "Sound Type")
            overlayColor = C.SOUND_TYPE_STYLES[selectedData.sound_type]?.color;

          if (overlayColor) {
            const borderColor = darkenColor(overlayColor, 0.3);
            context.strokeStyle = borderColor;
            context.strokeRect(highlightDrawX, highlightDrawY, highlightSize, highlightSize);
          } else {
            context.strokeStyle = "#5dade2";
            context.strokeRect(highlightDrawX, highlightDrawY, highlightSize, highlightSize);
          }

          drawDarkened(image, highlightDrawX, highlightDrawY, highlightSize, 4.0);
          //context.drawImage(image, highlightDrawX, highlightDrawY, highlightSize, highlightSize);

          context.fillStyle = 'rgba(215, 236, 255, 0.4)';
          context.fillRect(highlightDrawX, highlightDrawY, highlightSize, highlightSize);
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    // First call to start the drawing/animation loop
    draw();

    // Cleanup function to stop the animation when component unmounts or deps change
    return () => cancelAnimationFrame(animationFrameId);

  }, [transform, selected, isGridReady, images, colorMode]);

  const getCellCoordinates = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const { scale, translateX, translateY } = transform;
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const gridX_pre_scale = (canvasX - translateX) / scale;
    const gridY_pre_scale = (canvasY - translateY) / scale;
    const x = Math.floor(gridX_pre_scale / (C.CELL_SIZE + C.CELL_GAP));
    const y = Math.floor(gridY_pre_scale / (C.CELL_SIZE + C.CELL_GAP));
    return { x, y };
  }, [transform]);

  // Add this helper function inside FastVisualization, near your other helper functions
  const findNearestValidCell = useCallback((startX, startY, currentFilters) => {
      // Check the start cell first
      const key = `${startX}_${C.GRID_SIZE - 1 - startY}`;
      const data = dataJson[key];
      if (data && checkFilters(data, currentFilters, C.AGE_RANGES)) {
          return { x: startX, y: startY };
      }

      // Spiral search outwards
      for (let r = 1; r < C.GRID_SIZE / 2; r++) { // r is the radius/distance
          // Check the boundary of the square defined by radius r
          for (let dx = -r; dx <= r; dx++) {
              for (let dy = -r; dy <= r; dy++) {
                  // Only check the cells on the square's perimeter for this radius
                  if (Math.abs(dx) === r || Math.abs(dy) === r) {
                      const x = startX + dx;
                      const y = startY + dy;

                      if (x >= 0 && x < C.GRID_SIZE && y >= 0 && y < C.GRID_SIZE) {
                          const cellKey = `${x}_${C.GRID_SIZE - 1 - y}`;
                          const cellData = dataJson[cellKey];

                          // Check if cell exists and passes filters
                          if (cellData && checkFilters(cellData, currentFilters, C.AGE_RANGES)) {
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
    if (x < 0 || x >= C.GRID_SIZE || y < 0 || y >= C.GRID_SIZE) return;

    // let clampedX = Math.max(0, Math.min(C.GRID_SIZE - 1, x));
    //let clampedY = Math.max(0, Math.min(C.GRID_SIZE - 1, y));

    // The logic requested: "if you select something more above the top of the grid,
    // you snap to the top element and the left right index corresponding to where you selected."
    // This is accomplished by the clamping above: if x < 0, it becomes 0. If x > max, it becomes max.

    // 2. Determine the target cell coordinates after clamping (potential snap)
    let targetX = x;
    let targetY = y;

    const flippedY = C.GRID_SIZE - 1 - y;
    const key = `${x}_${flippedY}`;
    const selectedData = dataJson[key];
    const isCursorCellValid = selectedData && checkFilters(selectedData, filters, C.AGE_RANGES);

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
    const targetFlippedY = C.GRID_SIZE - 1 - targetY;
    const targetKey = `${targetX}_${targetFlippedY}`;
    const finalSelectedData = dataJson[targetKey];

    // Safety check (should always pass if logic is correct)
    if (!finalSelectedData) return;

    // Prevent unnecessary state updates if we snapped to the current selection
    //if (targetX === selected.x && targetY === selected.y) return;

    // 4. Update the selection and play the audio
    setSelected({ x: targetX, y: targetY });
    const fileName = finalSelectedData.file_name;
    const audioPath = `audio_processed/${fileName}.wav`;
    //const audioPath = `audio_processed_mp3/${fileName}.mp3`;

    const now = Date.now();
    if (now - lastPlayTimeRef.current < C.MIN_PLAY_INTERVAL_MS) {
        return;
    }

    // Only add the *old* selection to the trail if the new audio *will* play.
    const oldKey = `${selected.x}_${C.GRID_SIZE - 1 - selected.y}`;
    if (dataJson[oldKey]) {
        trailHighlightsRef.current.push({
        x: selected.x,
        y: selected.y,
        timestamp: now
      });
    }

    lastPlayTimeRef.current = now; // Update the last play time
    const newAudio = new Audio(audioPath);
    newAudio.play().catch(() => {});
  }, [selected.x, selected.y, filters, findNearestValidCell]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isMouseDownRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // Only start panning if near the edge band
    const nearEdge =
      e.clientX < rect.left + PAN_EDGE_THRESHOLD ||
      e.clientX > rect.right - PAN_EDGE_THRESHOLD ||
      e.clientY < rect.top + PAN_EDGE_THRESHOLD ||
      e.clientY > rect.bottom - PAN_EDGE_THRESHOLD;

    if (isMouseDownRef.current && nearEdge) {
      const { vx, vy } = getPanVector(e.clientX, e.clientY, rect);
      panDirectionRef.current = { vx, vy };
      isPanningRef.current = true;
    } else {
      isPanningRef.current = false;
    }

    // still do your cell selection
    const { x, y } = getCellCoordinates(e);
    handleCellSelect(x, y);
  }, [getCellCoordinates, handleCellSelect]);

//   useEffect(() => {
//   let raf;

//   const loop = () => {
//     if (isMouseDownRef.current) {
//       const { dx, dy } = calculatePanAdjustments(transform, selected.x, selected.y);

//       if (dx !== 0 || dy !== 0) {
//         setTransform(prev => ({
//           ...prev,
//           translateX: prev.translateX - dx,  // subtract = world moves opposite direction
//           translateY: prev.translateY - dy
//         }));

//         // auto-select if we moved enough into new cell territory
//         handleCellSelect(selected.x, selected.y);
//       }
//     }

//     raf = requestAnimationFrame(loop);
//   };

//   raf = requestAnimationFrame(loop);
//   return () => cancelAnimationFrame(raf);
// }, [transform, selected, calculatePanAdjustments, handleCellSelect]);

  const handleMouseDown = useCallback((e) => {
    isMouseDownRef.current = true;
    handleCanvasMouseMove(e);
  }, [handleCanvasMouseMove]);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    isPanningRef.current = false;
  }, []);

  useEffect(() => {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  useEffect(() => {
  let rafId;

  const panLoop = () => {
    if (isPanningRef.current) {
      setTransform(prev => {
    const { vx, vy } = panDirectionRef.current;

    // Move in screen space, not grid-space
    const px = vx * PAN_SPEED * 100;
    const py = vy * PAN_SPEED * 100;

    return {
      ...prev,
      translateX: prev.translateX - px,
      translateY: prev.translateY - py
    };
  });

      // Now auto-select new cells as we move
      const fakeEvent = {
        clientX: lastMousePos.current.x,
        clientY: lastMousePos.current.y
      };
      handleCellSelect(...Object.values(getCellCoordinates(fakeEvent)));
    }

    rafId = requestAnimationFrame(panLoop);
  };

  rafId = requestAnimationFrame(panLoop);
  return () => cancelAnimationFrame(rafId);
}, [getCellCoordinates, handleCellSelect]);



  const animateToCenter = useCallback(() => {
    // Target is the grid center at C.MIN_SCALE
    const targetTransform = calculateCenterTransform(C.MIN_SCALE, C.GRID_SIZE / 2, C.GRID_SIZE / 2);

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

        const newTranslateX = translateX + diffX * C.CENTER_SMOOTHING_FACTOR;
        const newTranslateY = translateY + diffY * C.CENTER_SMOOTHING_FACTOR;

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
          if (oldScale <= C.MIN_SCALE) {
              // PHASE 2: Hit C.MIN_SCALE, start smooth center snap
              if (smoothCenterTimeoutRef.current === null) {
                  smoothCenterTimeoutRef.current = setTimeout(animateToCenter, 10);
              }
              return prevTransform;
          }
          // PHASE 1: Zoom out, keeping current cell fixed
          newScale = Math.max(oldScale / factor, C.MIN_SCALE);
      } else {
          // PHASE 1: Zoom in, keeping current cell fixed
          newScale = Math.min(oldScale * factor, C.MAX_SCALE);
      }

      if (newScale === oldScale) return prevTransform;

      // Calculate selected cell's center in grid space
      const cellCenterX = (selected.x * (C.CELL_SIZE + C.CELL_GAP)) + C.CELL_SIZE / 2;
      const cellCenterY = (selected.y * (C.CELL_SIZE + C.CELL_GAP)) + C.CELL_SIZE / 2;

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
          applyZoom(direction, C.ZOOM_FACTOR);
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
    applyZoom(direction, C.WHEEL_ZOOM_FACTOR);
  }, [isGridReady, applyZoom]);

  useEffect(() => {
    window.addEventListener('mouseup', stopZoom);
    return () => {
        window.removeEventListener('mouseup', stopZoom);
        if (smoothCenterTimeoutRef.current) clearTimeout(smoothCenterTimeoutRef.current);
    }
  }, [stopZoom]);

  const key = `${selected.x}_${C.GRID_SIZE - 1 - selected.y}`;
  const selectedData = dataJson[key];

  // This transform is used to determine if the zoom-out button should be disabled
  const fullCenterTransform = calculateCenterTransform(C.MIN_SCALE, C.GRID_SIZE / 2, C.GRID_SIZE / 2);
  const isPerfectlyCentered =
    transform.scale === C.MIN_SCALE &&
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
              transform: `translate(-50%, calc(-100% - ${C.CELL_SIZE * 8 + 10}px))`,
              minWidth: 130,
            }}
          >
            <div className="flex flex-col leading-tight">
              <div className="flex items-center space-x-2 text-base">
                <span className="font-bold text-black">{selectedData.id}</span>
                <span
                  style={{
                    color: C.SOUND_TYPE_STYLES[selectedData.sound_type]?.color || "#555",
                    fontWeight: 600,
                  }}
                >
                  {selectedData.sound_type}
                </span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <span
                  style={{
                    color: C.GENDER_COLORS[selectedData.gender] || "#555",
                    fontWeight: 600,
                  }}
                >
                  {selectedData.gender}
                </span>
                <span
                  style={{
                    color: C.AGE_COLORS(selectedData.age),
                    fontWeight: 600,
                  }}
                >
                  {selectedData.age}
                </span >
              </div>
            </div>
            <div className="ml-2 text-2xl">
              {C.SOUND_TYPE_STYLES[selectedData.sound_type]?.emoji || "🎧"}
            </div>
          </div>
        )}
      </div>

      {selectedData && isGridReady && (<div>
        <div className="fixed top-6 right-6 z-20">
        <AboutButton handleClick={handleClickAbout}>
          ?
        </AboutButton>
        </div>

        <div className="fixed bottom-6 right-6 z-20 flex flex-col items-center space-y-4">
          <ZoomButton
            onMouseDown={handleZoomInStart}
            onMouseUp={stopZoom}
            onMouseLeave={stopZoom}
            disabled={transform.scale >= C.MAX_SCALE}
          >
            +
          </ZoomButton>
          <ZoomButton
            onMouseDown={handleZoomOutStart}
            onMouseUp={stopZoom}
            onMouseLeave={stopZoom}
            disabled={isPerfectlyCentered}
          >
            &minus;
          </ZoomButton>
        </div>

        <div className="fixed top-6 left-6 z-20">
          <SearchBar
            filters={filters}
            setFilters={setFilters}
            SOUND_TYPE_STYLES={C.SOUND_TYPE_STYLES}
            GENDER_COLORS={C.GENDER_COLORS}
            AGE_RANGES={C.AGE_RANGES}
            AGE_COLORS={C.AGE_COLORS}
          />
        </div>

        <div className="fixed bottom-6 left-6 z-20 bg-white border border-gray-300 rounded-lg shadow-md p-2">
          <label className="text-sm font-semibold mr-2">Color by:</label>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="None">None</option>
            <option value="Age">Age</option>
            <option value="Gender">Gender</option>
            <option value="Sound Type">Sound Type</option>
          </select>
        </div>

        <div className="fixed bottom-6 left-6 z-20 bg-white border border-gray-300 rounded-lg shadow-md p-3">
          <label className="text-sm font-semibold mr-2">Color by:</label>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 mb-2"
          >
            <option value="None">None</option>
            <option value="Age">Age</option>
            <option value="Gender">Gender</option>
            <option value="Sound Type">Sound Type</option>
          </select>

          {/* Dynamic legend */}
          {colorMode !== "None" && (
            <div className="mt-2 space-y-1 text-xs">
              {colorMode === "Age" &&
                Object.entries(C.AGE_RANGE_TO_COLOR).map(([range, color]) => (
                  <div key={range} className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: color }}
                    ></span>
                    <span>{range}</span>
                  </div>
                ))}

              {colorMode === "Gender" &&
                Object.entries(C.GENDER_COLORS).map(([gender, color]) => (
                  <div key={gender} className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: color }}
                    ></span>
                    <span>{gender}</span>
                  </div>
                ))}

              {colorMode === "Sound Type" &&
                Object.entries(C.SOUND_TYPE_STYLES).map(([type, { color }]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: color }}
                    ></span>
                    <span>{type}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

      </div>)}
    </div>
  );
}