import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";

// Define the Biomorph interface with 9 genes
interface Biomorph {
  id: string;
  genes: number[];  // 9 numerical genes
  generation: number;
  parent?: string;
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
  
  // Biomorph history for navigation
  const [history, setHistory] = useState<Biomorph[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  
  // Canvas settings
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const canvasSize = 200;

  // Initialize with a random biomorph
  useEffect(() => {
    const initialBiomorph = createRandomBiomorph();
    setBiomorphs([initialBiomorph]);
    setSelectedBiomorph(initialBiomorph);
    setHistory([initialBiomorph]);
  }, []);

  // Draw biomorphs when they change
  useEffect(() => {
    biomorphs.forEach(biomorph => {
      const canvas = canvasRefs.current.get(biomorph.id);
      if (canvas) {
        drawBiomorph(biomorph, canvas);
      }
    });
  }, [biomorphs]);
  
  // Create a new random biomorph
  const createRandomBiomorph = (): Biomorph => {
    // Generate 9 random genes with values between -10 and 10
    const genes = Array.from({ length: 9 }, () => Math.floor(Math.random() * 21) - 10);
    
    return {
      id: crypto.randomUUID(),
      genes,
      generation: 0
    };
  };
  
  // Create mutated offspring from a parent biomorph
  const createOffspring = (parent: Biomorph): Biomorph[] => {
    const offspring: Biomorph[] = [];
    
    // Create 18 offspring (9 genes × 2 directions)
    for (let geneIndex = 0; geneIndex < 9; geneIndex++) {
      // Create +1 mutation
      const mutationUp = [...parent.genes];
      mutationUp[geneIndex] += 1;
      
      // Create -1 mutation
      const mutationDown = [...parent.genes];
      mutationDown[geneIndex] -= 1;
      
      // Add both mutated offspring
      offspring.push({
        id: crypto.randomUUID(),
        genes: mutationUp,
        generation: parent.generation + 1,
        parent: parent.id
      });
      
      offspring.push({
        id: crypto.randomUUID(),
        genes: mutationDown,
        generation: parent.generation + 1,
        parent: parent.id
      });
    }
    
    return offspring;
  };
  
  // DEVELOPMENT: Draw a biomorph on a canvas based on its genes
  const drawBiomorph = (biomorph: Biomorph, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
    const angle = mapValue(branchAngle, -10, 10, 10, 60); // Between 10° and 60°
    const length = mapValue(branchLength, -10, 10, 5, 40); // Between 5px and 40px
    const width = mapValue(branchWidth, -10, 10, 0.5, 5); // Between 0.5px and 5px
    const depth = Math.max(1, Math.floor(mapValue(recursionDepth, -10, 10, 1, 8))); // Between 1 and 8 levels
    const decay = mapValue(branchDecay, -10, 10, 0.5, 0.9); // Length multiplier between 0.5 and 0.9
    const asymmetry = mapValue(branchAsymmetry, -10, 10, -0.5, 0.5); // Between -0.5 and 0.5
    const hue = mapValue(colorHue, -10, 10, 0, 360); // Between 0 and 360 degrees
    const curvature = mapValue(branchCurvature, -10, 10, -30, 30); // Between -30 and 30 degrees
    const splits = Math.max(2, Math.floor(mapValue(branchSplits, -10, 10, 2, 4))); // Between 2 and 4 branches
    
    // Center starting point
    const startX = canvas.width / 2;
    const startY = canvas.height - 10;
    
    // Set initial color and line properties
    ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    
    // Draw the recursive structure
    drawBranch(
      ctx, 
      startX, 
      startY, 
      length, 
      -90, // Start growing upward
      depth, 
      angle,
      decay,
      asymmetry,
      hue,
      curvature,
      splits,
      width
    );
    
    // Highlight selected biomorph
    if (selectedBiomorph && biomorph.id === selectedBiomorph.id) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  // Recursive function to draw branches
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
    
    // Apply curvature if needed
    if (Math.abs(curvature) > 0.1) {
      const controlX = x + length * 0.5 * Math.cos(radians) + 
                       length * 0.2 * Math.cos(radians + Math.PI/2) * (curvature/30);
      const controlY = y + length * 0.5 * Math.sin(radians) + 
                       length * 0.2 * Math.sin(radians + Math.PI/2) * (curvature/30);
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    } else {
      ctx.lineTo(endX, endY);
    }
    
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
  
  // Helper function to map a value from one range to another
  const mapValue = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number => {
    return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
  };
  
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
  };
  
  // Go back in history
  const viewHistory = () => {
    setViewingHistory(true);
    setBiomorphs(history);
  };
  
  // Reset simulation
  const resetSimulation = () => {
    const initialBiomorph = createRandomBiomorph();
    setBiomorphs([initialBiomorph]);
    setSelectedBiomorph(initialBiomorph);
    setHistory([initialBiomorph]);
    setGenerations(0);
    setViewingHistory(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Biomorphs Evolution
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Based on Richard Dawkins' model from "The Blind Watchmaker"
        </p>
        
        {/* Control Panel */}
        <div className="bg-gray-800 rounded-xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="mr-4">Generation: {generations}</span>
            <span>History: {history.length} biomorphs</span>
          </div>
          
          <div className="flex gap-3">
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
            
            {viewingHistory && (
              <button 
                onClick={() => {
                  if (selectedBiomorph) {
                    const offspring = createOffspring(selectedBiomorph);
                    setBiomorphs(offspring);
                    setViewingHistory(false);
                  }
                }}
                disabled={!selectedBiomorph}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Continue from Selected
              </button>
            )}
          </div>
        </div>
        
        {/* Selected Biomorph Display */}
        {selectedBiomorph && (
          <div className="bg-gray-800 rounded-xl p-4 mb-8">
            <h2 className="text-xl font-bold mb-4">Selected Biomorph</h2>
            
            <div className="flex flex-wrap gap-8">
              <div className="w-48 h-48 bg-gray-900 rounded-lg relative">
                <canvas 
                  ref={(canvas) => {
                    if (canvas) {
                      canvasRefs.current.set(`selected-${selectedBiomorph.id}`, canvas);
                    }
                  }} 
                  width={canvasSize} 
                  height={canvasSize}
                  className="w-full h-full"
                />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Genetic Information</h3>
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
                  <h3 className="text-lg font-semibold mb-2">Generation Information</h3>
                  <p>Generation: {selectedBiomorph.generation}</p>
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
            {biomorphs.map(biomorph => (
              <div 
                key={biomorph.id}
                className={`w-full bg-gray-900 rounded-lg p-2 cursor-pointer transition-transform hover:scale-105 ${
                  selectedBiomorph && selectedBiomorph.id === biomorph.id ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => selectBiomorph(biomorph)}
              >
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
                <div className="text-center text-xs mt-1">
                  {viewingHistory ? `Gen ${biomorph.generation}` : `Mutation ${biomorphs.indexOf(biomorph) + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Explanation */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
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
      </div>
    </div>
  );
}