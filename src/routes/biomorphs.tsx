import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";

// Define the Biomorph interface with 9 genes
interface Biomorph {
  id: string;
  genes: number[];  // 9 numerical genes
  generation: number;
  parent?: string;
  fitness?: number;
  timestamp?: number;
}

// Genes influence:
// 0: Branch angle (in degrees)
// 1: Branch length multiplier
// 2: Branch width 
// 3: Recursion depth (max levels)
// 4: Branch decay rate (how quickly branches get shorter)
// 5: Branch asymmetry
// 6: Color hue
// 7: Branch curvature
// 8: Branch splitting factor (how many branches at each split)

export const Route = createFileRoute("/biomorphs")({
  component: BiomorphsSimulation,
});

function BiomorphsSimulation() {
  // Main biomorph state
  const [biomorphs, setBiomorphs] = useState<Biomorph[]>([]);
  const [selectedBiomorph, setSelectedBiomorph] = useState<Biomorph | null>(null);
  const [generations, setGenerations] = useState<number>(0);
  
  // Biomorph history for navigation and lineage tracking
  const [history, setHistory] = useState<Biomorph[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [showLineage, setShowLineage] = useState(false);
  const [lineage, setLineage] = useState<Biomorph[]>([]);
  
  // Gene editing state
  const [editingGenes, setEditingGenes] = useState(false);
  const [geneEditValues, setGeneEditValues] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  
  // Auto-evolution state
  const [autoEvolving, setAutoEvolving] = useState(false);
  const [evolutionSpeed, setEvolutionSpeed] = useState(1000); // ms between generations
  const [fitnessFunction, setFitnessFunction] = useState<string>("balanced"); // balanced, complex, symmetric
  const [autoEvolutionGeneration, setAutoEvolutionGeneration] = useState(0);
  
  // Comparison mode for visual comparison
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonBiomorphs, setComparisonBiomorphs] = useState<Biomorph[]>([]);
  
  // Canvas and visualization settings
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const canvasSize = 200;
  const zoomRef = useRef<HTMLDivElement>(null);
  const [zoomedBiomorph, setZoomedBiomorph] = useState<Biomorph | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAnimation] = useState(true);

  // Initialize with a random biomorph
  useEffect(() => {
    const initialBiomorph = createRandomBiomorph();
    setBiomorphs([initialBiomorph]);
    setSelectedBiomorph(initialBiomorph);
    setHistory([initialBiomorph]);
  }, []);

  // Function declarations for drawing functions
  
  // Optimized, non-recursive drawing for shallower depths to improve performance
  const drawOptimizedBiomorph = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    params: any
  ) => {
    // Pre-calculate all branch positions and paths
    const branches: Array<[number, number, number, number, number, string, number]> = []; // [startX, startY, endX, endY, depth, color, width]
    
    // Start with the trunk
    const queue: Array<[number, number, number, number, number]> = [];
    queue.push([startX, startY, -90, params.length, params.depth]); // [x, y, angle, length, depth]
    
    // Process queue to calculate all branch positions
    while (queue.length > 0) {
      const [x, y, angle, length, depth] = queue.shift()!;
      if (depth <= 0) continue;
      
      // Calculate endpoint
      const radians = (angle * Math.PI) / 180;
      const endX = x + length * Math.cos(radians);
      const endY = y + length * Math.sin(radians);
      
      // Store this branch for drawing
      const color = `hsl(${params.hue + depth * 10}, 70%, ${30 + depth * 5}%)`;
      const width = params.width * (depth / 5);
      branches.push([x, y, endX, endY, depth, color, width]);
      
      // Add child branches to queue
      const actualSplits = Math.max(2, Math.min(params.splits, 4));
      for (let i = 0; i < actualSplits; i++) {
        let branchOffset = (i / (actualSplits - 1) - 0.5) * 2 * params.angle;
        
        // Apply asymmetry
        if (i % 2 === 0) {
          branchOffset += params.asymmetry * params.angle;
        } else {
          branchOffset -= params.asymmetry * params.angle;
        }
        
        const newAngle = angle + branchOffset + params.curvature * (depth/8);
        const newLength = length * params.decay;
        
        queue.push([endX, endY, newAngle, newLength, depth - 1]);
      }
    }
    
    // Draw all branches in a single pass, from back to front
    branches.sort((a, b) => a[4] - b[4]); // Sort by depth
    
    for (const [x1, y1, x2, y2, _, color, width] of branches) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };
  
  // Recursive function to draw branches - used for complex cases
  const drawBranch = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    angle: number,
    depth: number,
    branchAngle: number,
    decay: number,
    asymmetry: number,
    hue: number,
    curvature: number,
    splits: number,
    width: number
  ) => {
    if (depth <= 0) return;
    
    // Calculate endpoint using angle in radians
    const radians = (angle * Math.PI) / 180;
    const endX = x + length * Math.cos(radians);
    const endY = y + length * Math.sin(radians);
    
    // Draw this branch
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    
    // Update color based on depth
    ctx.strokeStyle = `hsl(${hue + depth * 10}, 70%, ${30 + depth * 5}%)`;
    ctx.lineWidth = width * (depth / 5);
    ctx.stroke();
    
    // Base angle for the branches
    const baseAngle = angle;
    
    // Calculate how many branches to draw
    const actualSplits = Math.max(2, Math.min(splits, 4));
    
    // Draw branches
    for (let i = 0; i < actualSplits; i++) {
      // Calculate the angle for this branch
      let branchOffset = (i / (actualSplits - 1) - 0.5) * 2 * branchAngle;
      
      // Apply asymmetry
      if (i % 2 === 0) {
        branchOffset += asymmetry * branchAngle;
      } else {
        branchOffset -= asymmetry * branchAngle;
      }
      
      // Create the next branch recursively
      drawBranch(
        ctx,
        endX,
        endY,
        length * decay,
        baseAngle + branchOffset + curvature * (depth/8),
        depth - 1,
        branchAngle,
        decay,
        asymmetry,
        hue,
        curvature,
        splits,
        width
      );
    }
  };
  
  // Cache for storing pre-calculated drawing parameters
  const drawingParamsCache = useRef<Map<string, any>>(new Map());
  
  // Draw a biomorph on a canvas based on its genes - optimized
  const drawBiomorph = (biomorph: Biomorph, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if we've already calculated parameters for this gene set
    const cacheKey = biomorph.genes.join(',');
    let drawingParams;
    
    if (drawingParamsCache.current.has(cacheKey)) {
      // Use cached parameters
      drawingParams = drawingParamsCache.current.get(cacheKey);
    } else {
      // Extract gene values
      const [
        branchAngle, 
        branchLength, 
        branchWidth, 
        recursionDepth, 
        branchDecay,
        branchAsymmetry,
        colorHue,
        branchCurvature,
        branchSplits
      ] = biomorph.genes;
      
      // Map genes to actual drawing parameters
      drawingParams = {
        angle: mapValue(branchAngle, -10, 10, 10, 60), // Between 10° and 60°
        length: mapValue(branchLength, -10, 10, 5, 40), // Between 5px and 40px
        width: mapValue(branchWidth, -10, 10, 0.5, 5), // Between 0.5px and 5px
        depth: Math.max(1, Math.floor(mapValue(recursionDepth, -10, 10, 1, 8))), // Between 1 and 8 levels
        decay: mapValue(branchDecay, -10, 10, 0.5, 0.9), // Length multiplier between 0.5 and 0.9
        asymmetry: mapValue(branchAsymmetry, -10, 10, -0.5, 0.5), // Between -0.5 and 0.5
        hue: mapValue(colorHue, -10, 10, 0, 360), // Between 0 and 360 degrees
        curvature: mapValue(branchCurvature, -10, 10, -30, 30), // Between -30 and 30 degrees
        splits: Math.max(2, Math.floor(mapValue(branchSplits, -10, 10, 2, 4))), // Between 2 and 4 branches
      };
      
      // Cache the parameters
      drawingParamsCache.current.set(cacheKey, drawingParams);
      
      // Limit cache size to prevent memory issues
      if (drawingParamsCache.current.size > 500) {
        // Remove oldest entries when cache gets too large
        const keys = Array.from(drawingParamsCache.current.keys());
        for (let i = 0; i < 100; i++) {
          drawingParamsCache.current.delete(keys[i]);
        }
      }
    }
    
    // Center starting point
    const startX = canvas.width / 2;
    const startY = canvas.height - 10;
    
    // Set initial color and line properties
    ctx.strokeStyle = `hsl(${drawingParams.hue}, 70%, 50%)`;
    ctx.lineWidth = drawingParams.width;
    ctx.lineCap = 'round';
    
    // Use a flattened, optimized version of the drawing algorithm for common depths
    if (drawingParams.depth <= 4) {
      drawOptimizedBiomorph(ctx, startX, startY, drawingParams);
    } else {
      // Draw the recursive structure for more complex cases
      drawBranch(
        ctx, 
        startX, 
        startY, 
        drawingParams.length, 
        -90, // Start growing upward
        drawingParams.depth, 
        drawingParams.angle,
        drawingParams.decay,
        drawingParams.asymmetry,
        drawingParams.hue,
        drawingParams.curvature,
        drawingParams.splits,
        drawingParams.width
      );
    }
    
    // Highlight selected biomorph
    if (selectedBiomorph && biomorph.id === selectedBiomorph.id) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Draw biomorphs - optimized for performance
  const drawBiomorphRef = useRef(drawBiomorph);
  drawBiomorphRef.current = drawBiomorph;
  
  // Draw biomorphs that are visible in the current view
  const drawVisibleBiomorphs = useCallback(() => {
    // Draw regular biomorphs
    biomorphs.forEach(biomorph => {
      const canvas = canvasRefs.current.get(biomorph.id);
      if (canvas) {
        drawBiomorphRef.current(biomorph, canvas);
      }
    });
    
    // Draw selected biomorph
    if (selectedBiomorph) {
      const selectedCanvas = canvasRefs.current.get(`selected-${selectedBiomorph.id}`);
      if (selectedCanvas) {
        drawBiomorphRef.current(selectedBiomorph, selectedCanvas);
      }
    }
    
    // Only draw these if they're currently visible to save performance
    if (comparisonMode && comparisonBiomorphs.length > 0) {
      comparisonBiomorphs.forEach(biomorph => {
        const canvas = canvasRefs.current.get(`comparison-${biomorph.id}`);
        if (canvas) {
          drawBiomorphRef.current(biomorph, canvas);
        }
      });
    }
    
    if (showLineage && lineage.length > 0) {
      lineage.forEach(biomorph => {
        const canvas = canvasRefs.current.get(`lineage-${biomorph.id}`);
        if (canvas) {
          drawBiomorphRef.current(biomorph, canvas);
        }
      });
    }
    
    if (zoomedBiomorph) {
      const canvas = canvasRefs.current.get(`zoom-${zoomedBiomorph.id}`);
      if (canvas) {
        drawBiomorphRef.current(zoomedBiomorph, canvas);
      }
    }
  }, [biomorphs, selectedBiomorph, zoomedBiomorph, comparisonMode, comparisonBiomorphs, showLineage, lineage]);
  
  // Draw biomorphs when they change, with debounced rendering for performance
  useEffect(() => {
    // Use requestAnimationFrame for better performance
    const frameId = requestAnimationFrame(drawVisibleBiomorphs);
    return () => cancelAnimationFrame(frameId);
  }, [drawVisibleBiomorphs]);
  
  // Calculate biomorph fitness based on different criteria
  const calculateFitness = (genes: number[], fitnessType: string = "balanced"): number => {
    // Extract genes for readability
    const [branchAngle, branchLength, _, recursionDepth, 
           branchDecay, branchAsymmetry, __, branchCurvature, branchSplits] = genes;
    
    let fitness = 0;
    
    switch(fitnessType) {
      case "complex":
        // Reward complexity - high recursion depth, more splits, moderate branch length
        fitness = (
          recursionDepth * 2 + 
          branchSplits * 1.5 + 
          (10 - Math.abs(branchLength - 5)) + 
          (10 - Math.abs(branchDecay - 5))
        );
        break;
      
      case "symmetric":
        // Reward symmetry - low asymmetry, balanced angles
        fitness = (
          (10 - Math.abs(branchAsymmetry)) * 2 + 
          (10 - Math.abs(branchCurvature)) * 1.5 +
          (10 - Math.abs(branchAngle - 5)) 
        );
        break;
      
      case "balanced":
      default:
        // Balanced fitness function
        fitness = (
          Math.abs(recursionDepth) + 
          Math.abs(branchLength) / 2 + 
          (10 - Math.abs(branchAsymmetry)) + 
          Math.abs(branchSplits) / 2
        );
        break;
    }
    
    return Math.max(0, fitness);
  };

  // Create a new random biomorph
  const createRandomBiomorph = (): Biomorph => {
    // Generate 9 random genes with values between -10 and 10
    const genes = Array.from({ length: 9 }, () => Math.floor(Math.random() * 21) - 10);
    
    // Calculate fitness
    const fitness = calculateFitness(genes, fitnessFunction);
    
    return {
      id: crypto.randomUUID(),
      genes,
      generation: 0,
      fitness,
      timestamp: Date.now()
    };
  };
  
  // Create a biomorph with specific genes
  const createCustomBiomorph = (customGenes: number[]): Biomorph => {
    // Ensure genes are within valid range
    const genes = customGenes.map(g => Math.max(-10, Math.min(10, g)));
    
    // Calculate fitness
    const fitness = calculateFitness(genes, fitnessFunction);
    
    return {
      id: crypto.randomUUID(),
      genes,
      generation: selectedBiomorph ? selectedBiomorph.generation + 1 : 0,
      parent: selectedBiomorph?.id,
      fitness,
      timestamp: Date.now()
    };
  };
  
  // Create mutated offspring from a parent biomorph
  const createOffspring = (parent: Biomorph): Biomorph[] => {
    const offspring: Biomorph[] = [];
    
    // Create 18 offspring (9 genes × 2 directions)
    for (let geneIndex = 0; geneIndex < 9; geneIndex++) {
      // Create +1 mutation (capped at 10)
      const mutationUp = [...parent.genes];
      if (mutationUp[geneIndex] < 10) {
        mutationUp[geneIndex] += 1;
      }
      
      // Calculate fitness
      const fitnessUp = calculateFitness(mutationUp, fitnessFunction);
      
      // Create -1 mutation (capped at -10)
      const mutationDown = [...parent.genes];
      if (mutationDown[geneIndex] > -10) {
        mutationDown[geneIndex] -= 1;
      }
      
      // Calculate fitness
      const fitnessDown = calculateFitness(mutationDown, fitnessFunction);
      
      // Add both mutated offspring
      offspring.push({
        id: crypto.randomUUID(),
        genes: mutationUp,
        generation: parent.generation + 1,
        parent: parent.id,
        fitness: fitnessUp,
        timestamp: Date.now()
      });
      
      offspring.push({
        id: crypto.randomUUID(),
        genes: mutationDown,
        generation: parent.generation + 1,
        parent: parent.id,
        fitness: fitnessDown,
        timestamp: Date.now()
      });
    }
    
    return offspring;
  };
  
  // Helper function to map a value from one range to another
  const mapValue = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number => {
    return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
  };
  
  // Calculate genetic distance between two biomorphs
  const geneticDistance = (a: Biomorph, b: Biomorph): number => {
    let distance = 0;
    
    for (let i = 0; i < 9; i++) {
      distance += Math.abs(a.genes[i] - b.genes[i]);
    }
    
    return distance;
  };
  
  // Find lineage of a biomorph (path back to original ancestor)
  const findLineage = useCallback((biomorph: Biomorph): Biomorph[] => {
    if (!biomorph.parent) {
      return [biomorph];
    }
    
    // Find parent in history
    const parent = history.find(b => b.id === biomorph.parent);
    if (!parent) {
      return [biomorph];
    }
    
    // Recursively find ancestors
    const ancestors = findLineage(parent);
    return [...ancestors, biomorph];
  }, [history]);
  
  // Select a biomorph and breed offspring
  const selectBiomorph = (biomorph: Biomorph) => {
    // Add to history
    setHistory(prev => [...prev, biomorph]);
    
    // Generate offspring
    const offspring = createOffspring(biomorph);
    
    // Update state
    setSelectedBiomorph(biomorph);
    setBiomorphs(offspring);
    setGenerations(biomorph.generation + 1);
    setViewingHistory(false);
    
    // Generate lineage
    setLineage(findLineage(biomorph));
    
    // If in comparison mode, add to comparison set
    if (comparisonMode) {
      if (comparisonBiomorphs.length >= 2) {
        setComparisonBiomorphs([comparisonBiomorphs[1], biomorph]);
      } else {
        setComparisonBiomorphs([...comparisonBiomorphs, biomorph]);
      }
    }
    
    // If in gene editing mode, initialize editor with this biomorph's genes
    if (editingGenes) {
      setGeneEditValues([...biomorph.genes]);
      setEditingGenes(false);
    }
  };
  
  // Go back in history
  const viewHistory = () => {
    setViewingHistory(true);
    setBiomorphs(history);
    setComparisonMode(false);
    setAutoEvolving(false);
  };
  
  // Reset simulation
  const resetSimulation = () => {
    const initialBiomorph = createRandomBiomorph();
    setBiomorphs([initialBiomorph]);
    setSelectedBiomorph(initialBiomorph);
    setHistory([initialBiomorph]);
    setGenerations(0);
    setViewingHistory(false);
    setComparisonMode(false);
    setComparisonBiomorphs([]);
    setLineage([initialBiomorph]);
    setEditingGenes(false);
    setAutoEvolving(false);
    setShowLineage(false);
  };
  
  // Toggle gene editing mode
  const toggleGeneEditor = () => {
    if (editingGenes) {
      // Apply the edited genes
      if (selectedBiomorph) {
        const newBiomorph = createCustomBiomorph(geneEditValues);
        setHistory(prev => [...prev, newBiomorph]);
        setSelectedBiomorph(newBiomorph);
        setBiomorphs(createOffspring(newBiomorph));
        setGenerations(newBiomorph.generation);
      }
    } else {
      // Initialize with current biomorph genes
      if (selectedBiomorph) {
        setGeneEditValues([...selectedBiomorph.genes]);
      }
    }
    
    setEditingGenes(!editingGenes);
  };
  
  // Handle gene value changes in the editor
  const handleGeneValueChange = (index: number, value: number) => {
    const newValues = [...geneEditValues];
    newValues[index] = Math.max(-10, Math.min(10, value));
    setGeneEditValues(newValues);
  };
  
  // Toggle comparison mode
  const toggleComparisonMode = () => {
    if (!comparisonMode && selectedBiomorph) {
      // Start comparison with current biomorph
      setComparisonBiomorphs([selectedBiomorph]);
    } else {
      // End comparison
      setComparisonBiomorphs([]);
    }
    
    setComparisonMode(!comparisonMode);
  };
  
  // Zoom into a biomorph
  const zoomBiomorph = (biomorph: Biomorph) => {
    setZoomedBiomorph(biomorph);
  };
  
  // Close zoomed view
  const closeZoom = () => {
    setZoomedBiomorph(null);
    setZoomLevel(1);
  };
  
  // Toggle showing lineage
  const toggleLineage = () => {
    setShowLineage(!showLineage);
    
    if (!showLineage && selectedBiomorph) {
      setLineage(findLineage(selectedBiomorph));
    }
  };
  
  // Auto-evolution functions
  
  // Toggle auto-evolution mode
  const toggleAutoEvolution = () => {
    if (autoEvolving) {
      setAutoEvolving(false);
    } else {
      setAutoEvolving(true);
      setAutoEvolutionGeneration(0);
      
      // If no biomorph is selected, start with a random one
      if (!selectedBiomorph) {
        const randomBiomorph = createRandomBiomorph();
        setSelectedBiomorph(randomBiomorph);
        setHistory([randomBiomorph]);
        setBiomorphs(createOffspring(randomBiomorph));
      }
    }
  };
  
  // Previous fitness for optimization
  const prevFitnessRef = useRef<number>(0);
  
  // Run one step of auto-evolution - optimized
  const runAutoEvolutionStep = useCallback(() => {
    if (!autoEvolving || !selectedBiomorph) return;
    
    // Skip updating history and lineage if fitness hasn't improved significantly
    const currentFitness = selectedBiomorph.fitness || 0;
    const fitnessImproved = currentFitness > prevFitnessRef.current + 0.5;
    
    // Generate offspring - with optimization to avoid re-rendering too frequently
    const offspring = createOffspring(selectedBiomorph);
    
    // Select the fittest offspring based on the fitness function
    const fittestOffspring = [...offspring].sort((a, b) => 
      (b.fitness || 0) - (a.fitness || 0)
    )[0];
    
    // Only update history and lineage periodically or when fitness improves
    if (fitnessImproved || autoEvolutionGeneration % 5 === 0) {
      // Update history (with limit to prevent memory issues)
      setHistory(prev => {
        const newHistory = [...prev, fittestOffspring];
        // Keep max 1000 items in history to prevent slowdowns
        return newHistory.length > 1000 ? newHistory.slice(-1000) : newHistory;
      });
      
      // Update lineage if visible
      if (showLineage) {
        setLineage(findLineage(fittestOffspring));
      }
      
      // Store current fitness for future comparison
      prevFitnessRef.current = fittestOffspring.fitness || 0;
    }
    
    // Always update selected biomorph and offspring
    setSelectedBiomorph(fittestOffspring);
    setBiomorphs(createOffspring(fittestOffspring));
    
    // Update generation count
    setGenerations(fittestOffspring.generation);
    setAutoEvolutionGeneration(prev => prev + 1);
  }, [autoEvolving, selectedBiomorph, createOffspring, findLineage, autoEvolutionGeneration, showLineage]);
  
  // Track active state to prevent overlapping auto-evolution steps
  const isRunningRef = useRef(false);

  // Auto-evolution timer effect - optimized
  useEffect(() => {
    if (!autoEvolving) {
      isRunningRef.current = false;
      return;
    }
    
    // Prevent multiple simultaneous auto-evolution steps
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    
    const timer = setTimeout(() => {
      runAutoEvolutionStep();
      isRunningRef.current = false;
    }, evolutionSpeed);
    
    return () => {
      clearTimeout(timer);
      isRunningRef.current = false;
    };
  }, [autoEvolving, evolutionSpeed, runAutoEvolutionStep, autoEvolutionGeneration]);
  
  // Change the fitness function
  const changeFitnessFunction = (newFunction: string) => {
    setFitnessFunction(newFunction);
    
    // Recalculate fitness for all biomorphs
    if (selectedBiomorph) {
      const updatedSelected = {
        ...selectedBiomorph,
        fitness: calculateFitness(selectedBiomorph.genes, newFunction)
      };
      setSelectedBiomorph(updatedSelected);
      
      // Update offspring
      const updatedOffspring = biomorphs.map(biomorph => ({
        ...biomorph,
        fitness: calculateFitness(biomorph.genes, newFunction)
      }));
      setBiomorphs(updatedOffspring);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-0">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Biomorphs Evolution
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Based on Richard Dawkins' model from "The Blind Watchmaker"
        </p>
        
        {/* Control Panel */}
        <div className="bg-gray-800 rounded-xl p-4 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-lg font-semibold">
                <span className="mr-4">Generation: {generations}</span>
                <span className="mr-4">History: {history.length} biomorphs</span>
                {selectedBiomorph?.fitness !== undefined && (
                  <span>Current Fitness: {selectedBiomorph.fitness.toFixed(2)}</span>
                )}
              </div>
              
              {autoEvolving && (
                <div className="text-sm text-green-400 mt-1">
                  Auto-evolving using {fitnessFunction} fitness criteria...
                  <span className="animate-pulse ml-1">●</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={resetSimulation}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Reset
              </button>
              
              <button 
                onClick={viewHistory}
                disabled={history.length <= 1}
                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                View History
              </button>
              
              <button
                onClick={toggleLineage}
                disabled={!selectedBiomorph || selectedBiomorph.generation <= 0}
                className={`${showLineage ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'} px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {showLineage ? 'Hide Lineage' : 'Show Lineage'}
              </button>
              
              <button
                onClick={toggleComparisonMode}
                className={`${comparisonMode ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} px-4 py-2 rounded-lg font-medium transition-colors`}
              >
                {comparisonMode ? 'Exit Comparison' : 'Compare Biomorphs'}
              </button>
              
              <button
                onClick={toggleGeneEditor}
                disabled={!selectedBiomorph}
                className={`${editingGenes ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'} px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
              >
                {editingGenes ? 'Apply Changes' : 'Edit Genes'}
              </button>
              
              <button
                onClick={toggleAutoEvolution}
                className={`${autoEvolving ? 'bg-pink-700' : 'bg-pink-600 hover:bg-pink-700'} px-4 py-2 rounded-lg font-medium transition-colors`}
              >
                {autoEvolving ? 'Stop Evolution' : 'Auto-Evolve'}
              </button>
            </div>
          </div>
          
          {/* Additional controls when in specific modes */}
          {viewingHistory && selectedBiomorph && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span>Viewing evolutionary history</span>
                
                <button 
                  onClick={() => {
                    if (selectedBiomorph) {
                      const offspring = createOffspring(selectedBiomorph);
                      setBiomorphs(offspring);
                      setViewingHistory(false);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Continue from Selected
                </button>
              </div>
            </div>
          )}
          
          {autoEvolving && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Evolution Speed</label>
                  <select 
                    value={evolutionSpeed}
                    onChange={(e) => setEvolutionSpeed(Number(e.target.value))}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-1"
                  >
                    <option value="100">Fast (100ms)</option>
                    <option value="500">Medium (500ms)</option>
                    <option value="1000">Slow (1000ms)</option>
                    <option value="2000">Very Slow (2000ms)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Fitness Criteria</label>
                  <select 
                    value={fitnessFunction}
                    onChange={(e) => changeFitnessFunction(e.target.value)}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-1"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="complex">Complexity</option>
                    <option value="symmetric">Symmetry</option>
                  </select>
                </div>
                
                <div className="ml-auto">
                  <button
                    onClick={runAutoEvolutionStep}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Step Forward
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Gene editing controls */}
          {editingGenes && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Gene Editor</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {geneEditValues.map((value, index) => (
                  <div key={`gene-${index}`} className="flex flex-col">
                    <label className="text-sm text-gray-400 mb-1">
                      {index === 0 && 'Branch Angle'}
                      {index === 1 && 'Branch Length'}
                      {index === 2 && 'Branch Width'}
                      {index === 3 && 'Recursion Depth'}
                      {index === 4 && 'Branch Decay'}
                      {index === 5 && 'Branch Asymmetry'}
                      {index === 6 && 'Color Hue'}
                      {index === 7 && 'Branch Curvature'}
                      {index === 8 && 'Branch Splits'}
                    </label>
                    
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="1"
                        value={value}
                        onChange={(e) => handleGeneValueChange(index, Number(e.target.value))}
                        className="flex-1 mr-2"
                      />
                      <span className="w-8 text-center">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    // Create a preview biomorph with these genes
                    const previewBiomorph = createCustomBiomorph(geneEditValues);
                    setZoomedBiomorph(previewBiomorph);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors mr-3"
                >
                  Preview
                </button>
                
                <button
                  onClick={() => setEditingGenes(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors mr-3"
                >
                  Cancel
                </button>
                
                <button
                  onClick={toggleGeneEditor}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          )}
          
          {/* Comparison mode controls */}
          {comparisonMode && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex flex-wrap items-center justify-between">
                <div>
                  <span className="text-lg">
                    Comparison Mode: Select biomorphs to compare
                  </span>
                  <div className="text-sm text-gray-400">
                    {comparisonBiomorphs.length === 0 && 'No biomorphs selected'}
                    {comparisonBiomorphs.length === 1 && 'One biomorph selected - select another to compare'}
                    {comparisonBiomorphs.length === 2 && (
                      <span>
                        Comparing two biomorphs - 
                        Genetic distance: {geneticDistance(comparisonBiomorphs[0], comparisonBiomorphs[1])}
                      </span>
                    )}
                  </div>
                </div>
                
                {comparisonBiomorphs.length > 0 && (
                  <button
                    onClick={() => setComparisonBiomorphs([])}
                    className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Selected Biomorph Display */}
        {selectedBiomorph && (
          <div className="bg-gray-800 rounded-xl p-4 mb-8">
            <h2 className="text-xl font-bold mb-4">Selected Biomorph</h2>
            
            <div className="flex flex-wrap gap-8">
              <div className="w-48 h-48 bg-gray-900 rounded-lg relative group">
                <canvas 
                  ref={(canvas) => {
                    if (canvas) {
                      canvasRefs.current.set(`selected-${selectedBiomorph.id}`, canvas);
                    }
                  }} 
                  width={canvasSize} 
                  height={canvasSize}
                  className="w-full h-full cursor-pointer"
                  onClick={() => zoomBiomorph(selectedBiomorph)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                  <span className="bg-gray-800 bg-opacity-80 text-white px-2 py-1 rounded text-sm">
                    Click to zoom
                  </span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Genetic Information</h3>
                  {selectedBiomorph.fitness !== undefined && (
                    <div className="bg-blue-900 px-3 py-1 rounded-full text-sm">
                      Fitness: {selectedBiomorph.fitness.toFixed(2)}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Angle</div>
                    <div className="font-mono">{selectedBiomorph.genes[0]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Length</div>
                    <div className="font-mono">{selectedBiomorph.genes[1]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Width</div>
                    <div className="font-mono">{selectedBiomorph.genes[2]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Recursion Depth</div>
                    <div className="font-mono">{selectedBiomorph.genes[3]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Decay</div>
                    <div className="font-mono">{selectedBiomorph.genes[4]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Asymmetry</div>
                    <div className="font-mono">{selectedBiomorph.genes[5]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Color Hue</div>
                    <div className="font-mono">{selectedBiomorph.genes[6]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Curvature</div>
                    <div className="font-mono">{selectedBiomorph.genes[7]}</div>
                  </div>
                  <div className="bg-gray-900 p-2 rounded">
                    <div className="text-gray-500">Branch Splits</div>
                    <div className="font-mono">{selectedBiomorph.genes[8]}</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-gray-900 p-2 rounded">
                      <div className="text-gray-500">Generation</div>
                      <div>{selectedBiomorph.generation}</div>
                    </div>
                    {selectedBiomorph.timestamp && (
                      <div className="bg-gray-900 p-2 rounded">
                        <div className="text-gray-500">Created</div>
                        <div>{new Date(selectedBiomorph.timestamp).toLocaleTimeString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Lineage View - Carousel */}
        {showLineage && lineage.length > 1 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Evolutionary Lineage</h2>
              <div className="text-sm text-gray-400">
                Generation {lineage[0]?.generation} to {lineage[lineage.length - 1]?.generation}
              </div>
            </div>
            
            <div className="relative">
              {/* Horizontal scrolling container */}
              <div className="flex items-center">
                {/* Left scroll button */}
                <button 
                  className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full mr-2 flex-shrink-0"
                  onClick={() => {
                    const container = document.getElementById('lineage-carousel');
                    if (container) {
                      container.scrollBy({ left: -200, behavior: 'smooth' });
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Carousel container */}
                <div 
                  id="lineage-carousel"
                  className="flex items-center gap-4 overflow-x-auto pb-4 flex-grow"
                >
                  {/* Connection line */}
                  <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-gray-600 -translate-y-1/2 z-0"></div>
                  
                  {/* Biomorphs */}
                  {lineage.map((ancestor, index) => (
                    <div 
                      key={ancestor.id} 
                      className={`flex flex-col items-center flex-shrink-0 relative ${
                        index === lineage.length - 1 ? 'text-emerald-400' : ''
                      }`}
                    >
                      <div className="w-20 h-20 md:w-28 md:h-28 bg-gray-900 rounded-lg mb-2 flex-shrink-0 relative z-10">
                        <canvas 
                          ref={(canvas) => {
                            if (canvas) {
                              canvasRefs.current.set(`lineage-${ancestor.id}`, canvas);
                            }
                          }} 
                          width={canvasSize} 
                          height={canvasSize}
                          className="w-full h-full cursor-pointer rounded-lg"
                          onClick={() => selectBiomorph(ancestor)}
                        />
                        
                        {/* Generation label */}
                        <div className="absolute top-0 right-0 bg-gray-800 text-xs px-1 rounded-bl">
                          G{ancestor.generation}
                        </div>
                        
                        {/* Highlight current biomorph */}
                        {index === lineage.length - 1 && (
                          <div className="absolute inset-0 ring-2 ring-emerald-400 rounded-lg pointer-events-none"></div>
                        )}
                      </div>
                      
                      {/* Arrows between generations */}
                      {index < lineage.length - 1 && (
                        <div className="absolute left-full top-10 translate-x-1 z-10">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                            <path d="M13 5l7 7-7 7M5 12h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                      
                      <div className="text-xs mt-1 z-10">
                        {index === 0 && "First"}
                        {index === lineage.length - 1 && "Current"}
                        {index !== 0 && index !== lineage.length - 1 && `Gen ${ancestor.generation}`}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Right scroll button */}
                <button 
                  className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full ml-2 flex-shrink-0"
                  onClick={() => {
                    const container = document.getElementById('lineage-carousel');
                    if (container) {
                      container.scrollBy({ left: 200, behavior: 'smooth' });
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-400">
                This lineage shows the evolutionary path from the first ancestor to the current biomorph.
                <br />
                Click on any biomorph to select it and continue evolution from there.
              </div>
            </div>
          </div>
        )}
        
        {/* Comparison View */}
        {comparisonMode && comparisonBiomorphs.length === 2 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-8">
            <h2 className="text-xl font-bold mb-4">Biomorph Comparison</h2>
            
            <div className="flex flex-col md:flex-row justify-between gap-8">
              {comparisonBiomorphs.map((biomorph, index) => (
                <div key={biomorph.id} className="flex-1">
                  <h3 className="text-lg font-semibold mb-3 text-center">
                    Biomorph {index + 1} (Gen {biomorph.generation})
                  </h3>
                  
                  <div className="w-full h-48 bg-gray-900 rounded-lg mb-4 mx-auto">
                    <canvas 
                      ref={(canvas) => {
                        if (canvas) {
                          canvasRefs.current.set(`comparison-${biomorph.id}`, canvas);
                        }
                      }} 
                      width={canvasSize} 
                      height={canvasSize}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-gray-900 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Gene Comparison</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => {
                  const gene1 = comparisonBiomorphs[0].genes[index];
                  const gene2 = comparisonBiomorphs[1].genes[index];
                  const difference = Math.abs(gene1 - gene2);
                  
                  return (
                    <div key={`gene-${index}`} className="bg-gray-800 p-3 rounded">
                      <div className="text-sm text-gray-400 mb-1">
                        {index === 0 && 'Branch Angle'}
                        {index === 1 && 'Branch Length'}
                        {index === 2 && 'Branch Width'}
                        {index === 3 && 'Recursion Depth'}
                        {index === 4 && 'Branch Decay'}
                        {index === 5 && 'Branch Asymmetry'}
                        {index === 6 && 'Color Hue'}
                        {index === 7 && 'Branch Curvature'}
                        {index === 8 && 'Branch Splits'}
                      </div>
                      
                      <div className="flex justify-between">
                        <div className="font-mono">{gene1}</div>
                        <div className={`${difference > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {difference > 0 ? `Δ${difference}` : 'same'}
                        </div>
                        <div className="font-mono">{gene2}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-lg">
                  Genetic Distance: <span className="font-bold">{geneticDistance(comparisonBiomorphs[0], comparisonBiomorphs[1])}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  (Sum of absolute differences across all genes)
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Biomorph Grid */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-xl font-bold mb-4">
            {viewingHistory ? "Biomorph History" : "Select a Biomorph to Breed"}
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Render a limited number of biomorphs to improve performance */}
            {biomorphs.slice(0, autoEvolving ? 12 : biomorphs.length).map(biomorph => {
              // Calculate additional information for display - only when needed
              const isFittest = biomorph.fitness !== undefined && 
                // Only check current item against the max fitness rather than iterating all biomorphs
                (autoEvolving ? 
                  biomorph.fitness >= (biomorphs[0]?.fitness || 0) : 
                  biomorphs.every(b => (b.fitness || 0) <= (biomorph.fitness || 0)));
              
              // Calculate genetic distance from selected biomorph if in comparison mode
              const distanceFromSelected = comparisonMode && comparisonBiomorphs.length === 1 && 
                comparisonBiomorphs[0] ? geneticDistance(biomorph, comparisonBiomorphs[0]) : null;
              
              // Optimized class calculation - avoid string template for better performance
              let classes = "w-full bg-gray-900 rounded-lg p-2 cursor-pointer transition-all hover:scale-105";
              
              if (selectedBiomorph && selectedBiomorph.id === biomorph.id) {
                classes += " ring-2 ring-white";
              } else if (comparisonBiomorphs.some(b => b.id === biomorph.id)) {
                classes += " ring-2 ring-blue-400";
              }
              
              if (showAnimation && !viewingHistory && !autoEvolving) {
                classes += " animate-fadeIn";
              }
              
              return (
                <div 
                  key={biomorph.id}
                  className={classes}
                  onClick={() => selectBiomorph(biomorph)}
                >
                  <div className="relative">
                    <canvas 
                      ref={(canvas) => {
                        if (canvas) {
                          canvasRefs.current.set(biomorph.id, canvas);
                        }
                      }} 
                      width={canvasSize} 
                      height={canvasSize}
                      className="w-full aspect-square"
                    />
                    
                    {/* Fitness indicator for auto-evolution - only show if needed */}
                    {biomorph.fitness !== undefined && (autoEvolving || comparisonMode) && (
                      <div className={`absolute top-1 right-1 rounded-full px-1.5 py-0.5 text-xs 
                        ${isFittest ? 'bg-green-600' : 'bg-blue-800'}`}>
                        {biomorph.fitness.toFixed(1)}
                      </div>
                    )}
                    
                    {/* Comparison distance indicator - only show in comparison mode */}
                    {distanceFromSelected !== null && comparisonMode && (
                      <div className="absolute bottom-1 right-1 bg-gray-800 rounded-full px-1.5 py-0.5 text-xs">
                        Δ{distanceFromSelected}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-1 text-xs">
                    {viewingHistory ? (
                      <span>Generation {biomorph.generation}</span>
                    ) : autoEvolving ? (
                      <span>Fitness: {(biomorph.fitness || 0).toFixed(1)}</span>
                    ) : (
                      <span>Mutation {biomorphs.indexOf(biomorph) + 1}</span>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        zoomBiomorph(biomorph);
                      }}
                      className="text-gray-400 hover:text-white ml-1"
                      title="Zoom"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Show count indicator when limiting displayed biomorphs */}
            {autoEvolving && biomorphs.length > 12 && (
              <div className="col-span-full text-center text-sm text-gray-400 mt-4">
                Showing 12 of {biomorphs.length} biomorphs for better performance.
              </div>
            )}
          </div>
        </div>
        
        {/* Zoom Modal */}
        {zoomedBiomorph && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto" ref={zoomRef}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Zoomed Biomorph</h3>
                
                <div className="flex gap-3">
                  <div className="flex items-center">
                    <button
                      onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
                      className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
                      disabled={zoomLevel <= 0.5}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <span className="mx-2">{zoomLevel.toFixed(1)}x</span>
                    
                    <button
                      onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
                      className="bg-gray-700 hover:bg-gray-600 p-1 rounded"
                      disabled={zoomLevel >= 3}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  
                  <button
                    onClick={closeZoom}
                    className="bg-red-600 hover:bg-red-700 p-1 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* Zoomed canvas */}
                <div 
                  className="bg-gray-900 rounded-lg overflow-hidden"
                  style={{ 
                    width: `${Math.round(canvasSize * zoomLevel)}px`, 
                    height: `${Math.round(canvasSize * zoomLevel)}px` 
                  }}
                >
                  <canvas 
                    ref={(canvas) => {
                      if (canvas) {
                        canvasRefs.current.set(`zoom-${zoomedBiomorph.id}`, canvas);
                      }
                    }} 
                    width={canvasSize} 
                    height={canvasSize}
                    className="w-full h-full transform"
                    style={{ 
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left'
                    }}
                  />
                </div>
                
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-3">Genetic Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-900 p-3 rounded">
                      <div className="text-gray-500 text-sm">Generation</div>
                      <div className="font-bold">{zoomedBiomorph.generation}</div>
                    </div>
                    
                    {zoomedBiomorph.fitness !== undefined && (
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-gray-500 text-sm">Fitness</div>
                        <div className="font-bold">{zoomedBiomorph.fitness.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                  
                  <h4 className="text-lg font-semibold mb-2">Gene Values</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {zoomedBiomorph.genes.map((value, index) => (
                      <div key={`zoom-gene-${index}`} className="bg-gray-900 p-2 rounded">
                        <div className="text-gray-500 text-sm">
                          {index === 0 && 'Branch Angle'}
                          {index === 1 && 'Branch Length'}
                          {index === 2 && 'Branch Width'}
                          {index === 3 && 'Recursion Depth'}
                          {index === 4 && 'Branch Decay'}
                          {index === 5 && 'Branch Asymmetry'}
                          {index === 6 && 'Color Hue'}
                          {index === 7 && 'Branch Curvature'}
                          {index === 8 && 'Branch Splits'}
                        </div>
                        <div className="font-mono">{value}</div>
                      </div>
                    ))}
                  </div>
                  
                  {!editingGenes && (
                    <div className="mt-4 flex gap-3">
                      {!comparisonMode && (
                        <button
                          onClick={() => {
                            selectBiomorph(zoomedBiomorph);
                            closeZoom();
                          }}
                          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Select & Breed
                        </button>
                      )}
                      
                      {comparisonMode && (
                        <button
                          onClick={() => {
                            // Add to comparison
                            if (comparisonBiomorphs.length >= 2) {
                              setComparisonBiomorphs([comparisonBiomorphs[1], zoomedBiomorph]);
                            } else {
                              setComparisonBiomorphs([...comparisonBiomorphs, zoomedBiomorph]);
                            }
                            closeZoom();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Add to Comparison
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Explanation */}
        <div className="mt-8 mb-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            How This Works
          </h3>
          <p className="mb-4">
            This simulation demonstrates Dawkins' Biomorphs - a model of evolution through recursive development and selection:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>
              <span className="text-blue-400 font-bold">Development:</span>{" "}
              Each biomorph's appearance is determined by 9 "genes" that control branching patterns.
            </li>
            <li>
              <span className="text-emerald-400 font-bold">Reproduction:</span>{" "}
              When you select a biomorph, it produces 18 offspring (each gene can mutate up or down).
            </li>
            <li>
              <span className="text-purple-400 font-bold">Selection:</span>{" "}
              You act as the selecting force, choosing which biomorphs survive to reproduce.
            </li>
          </ul>
          <p>
            Over generations, you can evolve complex and beautiful structures by selecting the biomorphs 
            that appeal to you. This mirrors how artificial selection works in breeding plants and animals,
            and serves as a simplified model of natural selection.
          </p>
        </div>
        
        {/* Footer with attribution */}
        <div className="py-3 text-center text-gray-500 text-xs">
          Biomorphs Evolution Simulator • Built by <a href="https://bagerbach.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 underline">Christian Bager Bach Houmann</a>
        </div>
        
        {/* CSS animation keyframes */}
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
            
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
          `}
        </style>
      </div>
    </div>
  );
}