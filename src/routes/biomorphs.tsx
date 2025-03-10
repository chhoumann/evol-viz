import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

// Define the Biomorph interface with 9 genes
interface Biomorph {
	id: string;
	genes: number[]; // 9 numerical genes
	generation: number;
	parent?: string;
	fitness?: number;
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
	const [selectedBiomorph, setSelectedBiomorph] = useState<Biomorph | null>(
		null,
	);
	const [generations, setGenerations] = useState<number>(0);

	// Auto-evolution state
	const [autoEvolving, setAutoEvolving] = useState(false);
	const [evolutionSpeed, setEvolutionSpeed] = useState(500); // ms between generations

	// Canvas references and settings
	const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
	const canvasSize = 200;

	// History for tracking lineage
	const [_, setHistory] = useState<Biomorph[]>([]);

	// Simple help state
	const [showHelp, setShowHelp] = useState(false);

	// Initialize with a random biomorph
	useEffect(() => {
		const initialBiomorph = createRandomBiomorph();
		setBiomorphs(createOffspring(initialBiomorph));
		setSelectedBiomorph(initialBiomorph);
		setHistory([initialBiomorph]);
	}, []);

	// Optimized, non-recursive drawing for biomorphs
	const drawOptimizedBiomorph = (
		ctx: CanvasRenderingContext2D,
		startX: number,
		startY: number,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		params: any,
	) => {
		// Pre-calculate all branch positions and paths
		const branches: Array<
			[number, number, number, number, number, string, number]
		> = []; // [startX, startY, endX, endY, depth, color, width]

		// Start with the trunk
		const queue: Array<[number, number, number, number, number]> = [];
		queue.push([startX, startY, -90, params.length, params.depth]); // [x, y, angle, length, depth]

		// Process queue to calculate all branch positions
		while (queue.length > 0) {
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
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

				const newAngle = angle + branchOffset + params.curvature * (depth / 8);
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
		width: number,
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

		// Draw branches
		const actualSplits = Math.max(2, Math.min(splits, 4));
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
				angle + branchOffset + curvature * (depth / 8),
				depth - 1,
				branchAngle,
				decay,
				asymmetry,
				hue,
				curvature,
				splits,
				width,
			);
		}
	};

	// Cache for storing pre-calculated drawing parameters
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const drawingParamsCache = useRef<Map<string, any>>(new Map());

	// Draw a biomorph on a canvas based on its genes - optimized
	const drawBiomorph = (biomorph: Biomorph, canvas: HTMLCanvasElement) => {
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Check if we've already calculated parameters for this gene set
		const cacheKey = biomorph.genes.join(",");
		// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
		let drawingParams;

		if (drawingParamsCache.current.has(cacheKey)) {
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
				branchSplits,
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

			// Limit cache size
			if (drawingParamsCache.current.size > 200) {
				const keys = Array.from(drawingParamsCache.current.keys());
				for (let i = 0; i < 50; i++) {
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
		ctx.lineCap = "round";

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
				drawingParams.width,
			);
		}

		// Highlight selected biomorph
		if (selectedBiomorph && biomorph.id === selectedBiomorph.id) {
			ctx.strokeStyle = "white";
			ctx.lineWidth = 3;
			ctx.strokeRect(0, 0, canvas.width, canvas.height);
		}
	};

	// Draw biomorphs - optimized for performance
	const drawBiomorphRef = useRef(drawBiomorph);
	drawBiomorphRef.current = drawBiomorph;

	// Draw all visible biomorphs
	const drawVisibleBiomorphs = useCallback(() => {
		// Draw offspring biomorphs
		for (const biomorph of biomorphs) {
			const canvas = canvasRefs.current.get(biomorph.id);
			if (canvas) {
				drawBiomorphRef.current(biomorph, canvas);
			}
		}

		// Draw selected biomorph
		if (selectedBiomorph) {
			const selectedCanvas = canvasRefs.current.get(
				`selected-${selectedBiomorph.id}`,
			);
			if (selectedCanvas) {
				drawBiomorphRef.current(selectedBiomorph, selectedCanvas);
			}
		}
	}, [biomorphs, selectedBiomorph]);

	// Draw biomorphs when they change
	useEffect(() => {
		const frameId = requestAnimationFrame(drawVisibleBiomorphs);
		return () => cancelAnimationFrame(frameId);
	}, [drawVisibleBiomorphs]);

	// Auto-evolution reference
	const toggleAutoEvolutionRef = useRef<() => void>(() => {});

	// Keyboard shortcuts for navigation and selection
	useEffect(() => {
		// Update the ref when dependencies change
		toggleAutoEvolutionRef.current = () => {
			if (autoEvolving) {
				setAutoEvolving(false);
			} else {
				setAutoEvolving(true);

				// If no biomorph is selected, start with a random one
				if (!selectedBiomorph) {
					const randomBiomorph = createRandomBiomorph();
					setSelectedBiomorph(randomBiomorph);
					setHistory((prev) => [...prev, randomBiomorph]);
					setBiomorphs(createOffspring(randomBiomorph));
					setGenerations(0);
				}
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case "1":
				case "2":
				case "3":
				case "4":
				case "5":
				case "6":
				case "7":
				case "8":
				case "9":
					// Select biomorph by number
					// biome-ignore lint/correctness/noSwitchDeclarations: <explanation>
					const index = Number.parseInt(e.key) - 1;
					if (biomorphs[index]) {
						selectBiomorph(biomorphs[index]);
					}
					break;
				case "r":
					// Random new style
					if (!e.ctrlKey && !e.metaKey) {
						// Avoid collision with browser refresh
						const newBiomorph = createRandomBiomorph();
						setBiomorphs(createOffspring(newBiomorph));
						setSelectedBiomorph(newBiomorph);
						setHistory((prev) => [...prev, newBiomorph]);
						setGenerations(0);
					}
					break;
				case "a":
					// Toggle auto-evolution
					toggleAutoEvolutionRef.current();
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [biomorphs, autoEvolving, selectedBiomorph]);

	// Calculate biomorph fitness
	const calculateFitness = (genes: number[]): number => {
		// Extract genes for readability
		const [
			_, // branchAngle
			branchLength, // branchLength
			__, // branchWidth
			recursionDepth, // recursionDepth
			___, // branchDecay
			branchAsymmetry, // branchAsymmetry
			____, // colorHue
			_____, // branchCurvature
			branchSplits, // branchSplits
		] = genes;

		// Balanced fitness function
		const fitness =
			Math.abs(recursionDepth) +
			Math.abs(branchLength) / 2 +
			(10 - Math.abs(branchAsymmetry)) +
			Math.abs(branchSplits) / 2;

		return Math.max(0, fitness);
	};

	// Create a new random biomorph
	const createRandomBiomorph = (): Biomorph => {
		// Generate 9 random genes with values between -10 and 10,
		// but with constraints to ensure good visibility
		const genes = Array.from({ length: 9 }, (_, index) => {
			// Apply constraints to specific genes to avoid "bad starts"
			switch (index) {
				case 1: // Branch length - ensure reasonable minimum length
					return Math.floor(Math.random() * 15) - 5; // Range from -5 to 9 (bias toward longer branches)
				case 2: // Branch width - ensure reasonable minimum width
					return Math.floor(Math.random() * 15) - 5; // Range from -5 to 9 (bias toward thicker branches)
				case 3: // Recursion depth - ensure enough complexity
					return Math.floor(Math.random() * 10); // Range from 0 to 9 (bias toward deeper structures)
				case 4: // Branch decay - bias toward less decay for visibility
					return Math.floor(Math.random() * 15) - 5; // Range from -5 to 9 (bias toward slower decay)
				default:
					return Math.floor(Math.random() * 21) - 10; // Standard range from -10 to 10
			}
		});

		// Calculate fitness
		const fitness = calculateFitness(genes);

		return {
			id: crypto.randomUUID(),
			genes,
			generation: 0,
			fitness,
		};
	};

	// Create mutated offspring from a parent biomorph
	const createOffspring = (parent: Biomorph): Biomorph[] => {
		// For mobile, we'll create only 8 offspring instead of 18
		// This is a key simplification to make the display less cluttered
		const offspring: Biomorph[] = [];
		const mutations = [0, 1, 2, 3]; // Focus on the most visible genes

		// Create variations of the most important genes
		for (let i = 0; i < mutations.length; i++) {
			const geneIndex = mutations[i];

			// Create +1 mutation (capped at 10)
			const mutationUp = [...parent.genes];
			if (mutationUp[geneIndex] < 10) {
				mutationUp[geneIndex] += 1;
			}

			// Calculate fitness
			const fitnessUp = calculateFitness(mutationUp);

			// Create -1 mutation (capped at -10)
			const mutationDown = [...parent.genes];
			if (mutationDown[geneIndex] > -10) {
				mutationDown[geneIndex] -= 1;
			}

			// Calculate fitness
			const fitnessDown = calculateFitness(mutationDown);

			// Add both mutated offspring
			offspring.push({
				id: crypto.randomUUID(),
				genes: mutationUp,
				generation: parent.generation + 1,
				parent: parent.id,
				fitness: fitnessUp,
			});

			offspring.push({
				id: crypto.randomUUID(),
				genes: mutationDown,
				generation: parent.generation + 1,
				parent: parent.id,
				fitness: fitnessDown,
			});
		}

		return offspring;
	};

	// Helper function to map a value from one range to another
	const mapValue = (
		value: number,
		fromMin: number,
		fromMax: number,
		toMin: number,
		toMax: number,
	): number => {
		return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
	};

	// Select a biomorph and breed offspring
	const selectBiomorph = (biomorph: Biomorph) => {
		// Add to history
		setHistory((prev) => [...prev, biomorph]);

		// Generate offspring
		const offspring = createOffspring(biomorph);

		// Update state
		setSelectedBiomorph(biomorph);
		setBiomorphs(offspring);
		setGenerations(biomorph.generation + 1);
	};

	// Reset simulation
	const resetSimulation = () => {
		const initialBiomorph = createRandomBiomorph();
		setBiomorphs(createOffspring(initialBiomorph));
		setSelectedBiomorph(initialBiomorph);
		setHistory([initialBiomorph]);
		setGenerations(0);
		setAutoEvolving(false);
	};

	// Auto-evolution functions
	const toggleAutoEvolution = useCallback(() => {
		toggleAutoEvolutionRef.current();
	}, []);

	// Previous fitness for optimization
	const prevFitnessRef = useRef<number>(0);

	// Run one step of auto-evolution
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const runAutoEvolutionStep = useCallback(() => {
		if (!autoEvolving || !selectedBiomorph) return;

		// Generate offspring
		const offspring = createOffspring(selectedBiomorph);

		// Select the fittest offspring based on the fitness function
		const fittestOffspring = [...offspring].sort(
			(a, b) => (b.fitness || 0) - (a.fitness || 0),
		)[0];

		// Track significant improvements
		const currentFitness = selectedBiomorph.fitness || 0;
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const fitnessImproved = fittestOffspring.fitness! > currentFitness + 0.5;

		// Only update history when fitness improves significantly
		if (fitnessImproved) {
			setHistory((prev) => {
				const newHistory = [...prev, fittestOffspring];
				// Keep max 100 items to prevent memory issues
				return newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
			});
			prevFitnessRef.current = fittestOffspring.fitness || 0;
		}

		// Update state
		setSelectedBiomorph(fittestOffspring);
		setBiomorphs(createOffspring(fittestOffspring));
		setGenerations(fittestOffspring.generation);
	}, [autoEvolving, selectedBiomorph]);

	// Track active state to prevent overlapping auto-evolution steps
	const isRunningRef = useRef(false);

	// Auto-evolution timer effect
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
	}, [autoEvolving, evolutionSpeed, runAutoEvolutionStep]);

	return (
		<div className="min-h-screen bg-gray-900 text-white p-4">
			<div className="max-w-md mx-auto">
				<div className="flex flex-col items-center mb-6">
					<h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
						Biomorphs
					</h1>
					<p className="text-center text-gray-400 text-sm">
						Digital evolution in action
					</p>
				</div>

				{/* Selected Biomorph Display */}
				{selectedBiomorph && (
					<div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg font-bold">Selected Biomorph</h2>
							<div className="bg-blue-900 px-2 py-1 rounded-full text-xs">
								Generation {generations}
							</div>
						</div>

						<div className="flex flex-col items-center">
							<div className="w-64 h-64 bg-gray-900 rounded-lg mb-4">
								<canvas
									ref={(canvas) => {
										if (canvas) {
											canvasRefs.current.set(
												`selected-${selectedBiomorph.id}`,
												canvas,
											);
										}
									}}
									width={canvasSize}
									height={canvasSize}
									className="w-full h-full"
								/>
							</div>

							{/* Gene indicators (simplified visual representation) */}
							<div className="grid grid-cols-3 gap-2 w-full mb-2">
								{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
									const value = selectedBiomorph.genes[index];
									const normalizedValue = (value + 10) / 20; // Convert -10,10 to 0,1

									return (
										<div
											key={`gene-${index}`}
											className="flex flex-col items-center"
										>
											<div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
												<div
													className="h-full bg-blue-500 rounded-full"
													style={{ width: `${normalizedValue * 100}%` }}
												/>
											</div>
											<div className="text-xs text-gray-400 mt-1">
												{index === 0 && "Angle"}
												{index === 1 && "Length"}
												{index === 2 && "Width"}
												{index === 3 && "Depth"}
												{index === 4 && "Decay"}
												{index === 5 && "Asym"}
												{index === 6 && "Color"}
												{index === 7 && "Curve"}
												{index === 8 && "Splits"}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				)}

				{/* Main Controls */}
				<div className="grid grid-cols-3 gap-2 mb-6">
					<button
						type="button"
						onClick={() => {
							const newBiomorph = createRandomBiomorph();
							setBiomorphs(createOffspring(newBiomorph));
							setSelectedBiomorph(newBiomorph);
							setHistory((prev) => [...prev, newBiomorph]);
							setGenerations(0);
						}}
						className="bg-amber-600 hover:bg-amber-700 px-4 py-3 rounded-lg font-medium transition-colors text-center"
					>
						New Random
					</button>

					<button
						type="button"
						onClick={resetSimulation}
						className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg font-medium transition-colors text-center"
					>
						Reset
					</button>

					<button
						type="button"
						onClick={toggleAutoEvolution}
						className={`${autoEvolving ? "bg-pink-700" : "bg-pink-600 hover:bg-pink-700"} px-4 py-3 rounded-lg font-medium transition-colors text-center`}
					>
						{autoEvolving ? "Stop Auto" : "Auto-Evolve"}
					</button>
				</div>

				{/* Auto-evolution Speed Control */}
				{autoEvolving && (
					<div className="bg-gray-800 rounded-lg p-3 mb-6">
						<div className="flex items-center justify-between text-sm mb-1">
							<span>Evolution Speed</span>
							<span className="text-gray-400">
								{evolutionSpeed === 100
									? "Fast"
									: evolutionSpeed === 300
										? "Medium"
										: "Slow"}
							</span>
						</div>
						<input
							type="range"
							min="100"
							max="1000"
							step="100"
							value={evolutionSpeed}
							onChange={(e) => setEvolutionSpeed(Number(e.target.value))}
							className="w-full"
						/>
					</div>
				)}

				{/* Offspring Grid */}
				<div className="bg-gray-800 rounded-xl p-4 shadow-lg">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-bold">Select to Breed</h2>
						{autoEvolving && (
							<div className="text-xs text-emerald-400 flex items-center">
								Auto-evolving <span className="animate-pulse ml-1">●</span>
							</div>
						)}
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{biomorphs.map((biomorph, index) => {
							return (
								// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
								<div
									key={biomorph.id}
									className="bg-gray-900 rounded-lg p-2 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-action-manipulation"
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
									<div className="text-center text-xs mt-2">
										Variant {index + 1}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Help & Info Button */}
				<div className="mt-6 flex justify-center">
					<button
						type="button"
						onClick={() => setShowHelp(!showHelp)}
						className="text-gray-400 hover:text-white text-sm"
					>
						{showHelp ? "Hide Info" : "How it Works"}
					</button>
				</div>

				{/* Mobile-friendly Help Content */}
				{showHelp && (
					<div className="mt-4 bg-gray-800 rounded-xl p-4 text-sm">
						<h3 className="text-lg font-bold mb-3">How This Works</h3>
						<ul className="space-y-3">
							<li>
								<span className="text-blue-400 font-bold">Select:</span> Tap on
								any biomorph to breed it.
							</li>
							<li>
								<span className="text-emerald-400 font-bold">Evolve:</span> Each
								selection creates variations with small genetic changes.
							</li>
							<li>
								<span className="text-pink-400 font-bold">Auto-Evolve:</span>{" "}
								Let the simulation automatically select the most interesting
								forms.
							</li>
							<li>
								<span className="text-amber-400 font-bold">New Random:</span>{" "}
								Start with a completely new random biomorph.
							</li>
						</ul>
						<p className="mt-3">
							Based on Richard Dawkins' "Biomorphs" from "The Blind Watchmaker"
							- demonstrating how complex structures can evolve through
							selection.
						</p>
					</div>
				)}

				{/* Footer */}
				<div className="py-4 mt-6 text-center text-gray-500 text-xs">
					Biomorphs Evolution •{" "}
					<a
						href="https://bagerbach.com"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-gray-300 underline"
					>
						Christian Bager Bach Houmann
					</a>
				</div>

				{/* CSS animation keyframes */}
				<style>
					{`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            
            .animate-fadeIn {
              animation: fadeIn 0.3s ease-out;
            }
            
            /* Add touch-friendly styles */
            .touch-action-manipulation {
              touch-action: manipulation;
            }
          `}
				</style>
			</div>
		</div>
	);
}
