import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

// Default values
const DEFAULT_TARGET = "METHINKS IT IS LIKE A WEASEL";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const DEFAULT_MUTATION_RATE = 0.1;
const DEFAULT_INCORRECT_MUTATION_RATE = 0.7;
const DEFAULT_POPULATION_SIZE = 10;
const DEFAULT_UPDATE_SPEED = 50; // milliseconds

export const Route = createFileRoute("/")({
	component: SelectionVisualization,
});

function SelectionVisualization() {
	// User configurable settings
	const [settings, setSettings] = useState({
		targetSentence: DEFAULT_TARGET,
		mutationRate: DEFAULT_MUTATION_RATE,
		incorrectMutationRate: DEFAULT_INCORRECT_MUTATION_RATE,
		populationSize: DEFAULT_POPULATION_SIZE,
		updateSpeed: DEFAULT_UPDATE_SPEED,
		showSettings: false,
		showExplanation: true,
		isPaused: false,
	});

	// Simulation state
	const [singleStep, setSingleStep] = useState({
		currentAttempt: "",
		attempts: 0,
		matchCount: 0,
		running: false,
		complete: false,
		bestMatch: 0,
		fitnessHistory: [0],
		startTime: 0,
		completionTime: 0,
	});

	const [cumulative, setCumulative] = useState({
		currentAttempt: "",
		attempts: 0,
		matchCount: 0,
		running: false,
		complete: false, 
		bestMatch: 0,
		fitnessHistory: [0],
		startTime: 0,
		completionTime: 0,
	});

	// Generate a random string of the same length as the target
	const generateRandomString = () => {
		return Array(settings.targetSentence.length)
			.fill(0)
			.map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
			.join("");
	};

	// Count how many characters match the target
	const countMatches = (str: string) => {
		return [...str].filter((char, i) => char === settings.targetSentence[i]).length;
	};
	
	// Toggle settings panel
	const toggleSettings = () => {
		setSettings(prev => ({
			...prev,
			showSettings: !prev.showSettings
		}));
	};
	
	// Toggle explanation section
	const toggleExplanation = () => {
		setSettings(prev => ({
			...prev,
			showExplanation: !prev.showExplanation
		}));
	};
	
	// Toggle pause/resume
	const togglePause = () => {
		setSettings(prev => ({
			...prev,
			isPaused: !prev.isPaused
		}));
	};
	
	// Handle settings input changes
	const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value, type } = e.target;
		setSettings(prev => ({
			...prev,
			[name]: type === 'number' ? Number(value) : value
		}));
	};

	// Single-step selection
	useEffect(() => {
		if (!singleStep.running || singleStep.complete || settings.isPaused) return;

		const timer = setTimeout(() => {
			const randomString = generateRandomString();
			const matches = countMatches(randomString);
			const isComplete = randomString === settings.targetSentence;
			
			// Record completion time when complete
			const completionTime = isComplete && !singleStep.complete 
				? performance.now() - singleStep.startTime 
				: singleStep.completionTime;

			setSingleStep((prev) => {
				// Update best match if current is better
				const bestMatch = Math.max(prev.bestMatch, matches);
				
				// Add current fitness to history (for graphing)
				const fitnessHistory = [...prev.fitnessHistory];
				if (fitnessHistory.length <= prev.attempts + 1) {
					fitnessHistory.push(matches);
				}
				
				return {
					...prev,
					currentAttempt: randomString,
					attempts: prev.attempts + 1,
					matchCount: matches,
					bestMatch,
					fitnessHistory,
					complete: isComplete,
					completionTime,
				};
			});
		}, settings.updateSpeed);

		return () => clearTimeout(timer);
	}, [
		singleStep.running, 
		singleStep.attempts, 
		singleStep.complete, 
		settings.targetSentence, 
		settings.updateSpeed,
		settings.isPaused
	]);

	// Cumulative selection
	useEffect(() => {
		if (!cumulative.running || cumulative.complete || settings.isPaused) return;

		const timer = setTimeout(() => {
			let currentString = cumulative.currentAttempt || generateRandomString();
			
			// Generate multiple mutations and select the best one
			let bestString = currentString;
			let bestMatches = countMatches(currentString);
			
			// Try variations based on population size setting and keep the best one
			for (let i = 0; i < settings.populationSize; i++) {
				// Mutate the string
				const mutatedString = [...currentString]
					.map((char, idx) => {
						// Almost never change correct characters (strongly preserve gains)
						if (char === settings.targetSentence[idx]) {
							return Math.random() < settings.mutationRate ? CHARS[Math.floor(Math.random() * CHARS.length)] : char;
						}
						// Change incorrect characters with high probability
						return Math.random() < settings.incorrectMutationRate ? CHARS[Math.floor(Math.random() * CHARS.length)] : char;
					})
					.join("");
				
				const mutatedMatches = countMatches(mutatedString);
				
				// Keep the mutation if it's better or equal to what we had
				if (mutatedMatches >= bestMatches) {
					bestString = mutatedString;
					bestMatches = mutatedMatches;
				}
			}
			
			const isComplete = bestString === settings.targetSentence;
			// Record completion time when complete
			const completionTime = isComplete && !cumulative.complete 
				? performance.now() - cumulative.startTime 
				: cumulative.completionTime;

			setCumulative((prev) => {
				// Update best match if current is better
				const bestMatch = Math.max(prev.bestMatch, bestMatches);
				
				// Add current fitness to history (for graphing)
				const fitnessHistory = [...prev.fitnessHistory];
				if (fitnessHistory.length <= prev.attempts + 1) {
					fitnessHistory.push(bestMatches);
				}
				
				return {
					...prev,
					currentAttempt: bestString,
					attempts: prev.attempts + 1,
					matchCount: bestMatches,
					bestMatch,
					fitnessHistory,
					complete: isComplete,
					completionTime,
				};
			});
		}, settings.updateSpeed);

		return () => clearTimeout(timer);
	}, [
		cumulative.running, 
		cumulative.attempts, 
		cumulative.currentAttempt, 
		cumulative.complete, 
		settings.targetSentence, 
		settings.mutationRate, 
		settings.incorrectMutationRate, 
		settings.populationSize,
		settings.updateSpeed,
		settings.isPaused
	]);

	const startSimulation = () => {
		const now = performance.now();
		
		// Reset pause state when starting
		setSettings(prev => ({
			...prev,
			isPaused: false
		}));
		
		setSingleStep({
			currentAttempt: generateRandomString(),
			attempts: 0,
			matchCount: 0,
			bestMatch: 0,
			fitnessHistory: [0],
			running: true,
			complete: false,
			startTime: now,
			completionTime: 0,
		});

		setCumulative({
			currentAttempt: generateRandomString(),
			attempts: 0,
			matchCount: 0,
			bestMatch: 0,
			fitnessHistory: [0],
			running: true,
			complete: false,
			startTime: now,
			completionTime: 0,
		});
	};

	const resetSimulation = () => {
		setSingleStep({
			currentAttempt: "",
			attempts: 0,
			matchCount: 0,
			bestMatch: 0,
			fitnessHistory: [0],
			running: false,
			complete: false,
			startTime: 0,
			completionTime: 0,
		});

		setCumulative({
			currentAttempt: "",
			attempts: 0,
			matchCount: 0,
			bestMatch: 0,
			fitnessHistory: [0],
			running: false,
			complete: false,
			startTime: 0,
			completionTime: 0,
		});
	};

	// Highlight matching characters
	const renderHighlightedText = (text: string) => {
		return [...text].map((char, idx) => (
			<span
				key={idx}
				className={
					char === settings.targetSentence[idx]
						? "text-emerald-400 font-bold animate-pulse"
						: "text-red-400"
				}
			>
				{char}
			</span>
		));
	};
	
	// Format time in a readable way
	const formatTime = (timeMs: number): string => {
		if (timeMs === 0) return "N/A";
		if (timeMs < 1000) return `${timeMs.toFixed(0)}ms`;
		return `${(timeMs / 1000).toFixed(1)}s`;
	};
	
	// Render simple fitness history line graph
	const renderFitnessGraph = (fitnessHistory: number[], color: string, height: number = 60) => {
		if (fitnessHistory.length <= 1) return null;
		
		const maxFitness = settings.targetSentence.length;
		const points = fitnessHistory.map((fitness, index) => {
			// Scale to fit the graph space
			const x = (index / (fitnessHistory.length - 1)) * 100;
			const y = ((maxFitness - fitness) / maxFitness) * height;
			return `${x},${y}`;
		}).join(' ');
		
		return (
			<div className="relative w-full" style={{ height: `${height}px` }}>
				<svg className="absolute inset-0 w-full h-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
					<polyline
						points={points}
						fill="none"
						stroke={color}
						strokeWidth="2"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				
				{/* Target line */}
				<div 
					className="absolute border-t border-gray-600 w-full border-dashed"
					style={{ top: "0px" }}
				></div>
				
				{/* Zero line */}
				<div 
					className="absolute border-t border-gray-600 w-full"
					style={{ bottom: "0px" }}
				></div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-gray-900 text-white p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
					Evolution by Selection
				</h1>
				<h2 className="text-xl text-center text-gray-400 mb-10">
					Single-Step vs. Cumulative Selection
				</h2>

				<div className="flex flex-wrap justify-center gap-4 mb-6">
					<button
						onClick={startSimulation}
						disabled={(singleStep.running || cumulative.running) && !settings.isPaused}
						className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors duration-300"
					>
						{(singleStep.running || cumulative.running) && settings.isPaused ? "Resume" : "Start Simulation"}
					</button>
					
					{(singleStep.running || cumulative.running) && (
						<button
							onClick={togglePause}
							className="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded-lg font-medium transition-colors duration-300"
						>
							{settings.isPaused ? "Resume" : "Pause"}
						</button>
					)}
					
					<button
						onClick={resetSimulation}
						className="bg-gray-700 hover:bg-gray-800 px-6 py-2 rounded-lg font-medium transition-colors duration-300"
					>
						Reset
					</button>
					
					<button
						onClick={toggleSettings}
						className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors duration-300"
					>
						{settings.showSettings ? "Hide Settings" : "Show Settings"}
					</button>
					
					<button
						onClick={toggleExplanation}
						className="bg-teal-600 hover:bg-teal-700 px-6 py-2 rounded-lg font-medium transition-colors duration-300"
					>
						{settings.showExplanation ? "Hide Explanation" : "Show Explanation"}
					</button>
				</div>

				{/* Settings Panel */}
				{settings.showSettings && (
					<div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg mb-8">
						<h3 className="text-xl font-bold mb-4 text-blue-400">Simulation Settings</h3>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-gray-400 mb-2">Target Sentence</label>
								<input
									type="text"
									name="targetSentence"
									value={settings.targetSentence}
									onChange={handleSettingChange}
									className="w-full bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
									disabled={singleStep.running || cumulative.running}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Use capital letters and spaces only
								</p>
							</div>
							
							<div>
								<label className="block text-gray-400 mb-2">Update Speed (ms)</label>
								<input
									type="number"
									name="updateSpeed"
									min="10"
									max="1000"
									step="10"
									value={settings.updateSpeed}
									onChange={handleSettingChange}
									className="w-full bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Lower values = faster simulation (10-1000ms)
								</p>
							</div>
							
							<div>
								<label className="block text-gray-400 mb-2">
									Correct Character Mutation Rate
								</label>
								<input
									type="range"
									name="mutationRate"
									min="0.001"
									max="0.5"
									step="0.001"
									value={settings.mutationRate}
									onChange={handleSettingChange}
									className="w-full"
									disabled={singleStep.running || cumulative.running}
								/>
								<div className="flex justify-between text-xs text-gray-500">
									<span>Low: {settings.mutationRate.toFixed(3)}</span>
									<span>More stable</span>
								</div>
							</div>
							
							<div>
								<label className="block text-gray-400 mb-2">
									Incorrect Character Mutation Rate
								</label>
								<input
									type="range"
									name="incorrectMutationRate"
									min="0.1"
									max="1"
									step="0.01"
									value={settings.incorrectMutationRate}
									onChange={handleSettingChange}
									className="w-full"
									disabled={singleStep.running || cumulative.running}
								/>
								<div className="flex justify-between text-xs text-gray-500">
									<span>Low: {settings.incorrectMutationRate.toFixed(2)}</span>
									<span>High</span>
								</div>
							</div>
							
							<div>
								<label className="block text-gray-400 mb-2">
									Population Size
								</label>
								<input
									type="number"
									name="populationSize"
									min="1"
									max="100"
									value={settings.populationSize}
									onChange={handleSettingChange}
									className="w-full bg-gray-700 text-white px-3 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
									disabled={singleStep.running || cumulative.running}
								/>
								<p className="text-xs text-gray-500 mt-1">
									More variations tested per generation (1-100)
								</p>
							</div>
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{/* Single-step selection */}
					<div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
						<h3 className="text-2xl font-bold mb-2 text-purple-400">
							Single-Step Selection
						</h3>
						<p className="text-gray-400 mb-4">
							Each attempt is independent. We start from scratch every time.
						</p>

						<div className="h-24 flex items-center justify-center mb-4">
							<p className="text-xl font-mono">
								{singleStep.currentAttempt ? (
									renderHighlightedText(singleStep.currentAttempt)
								) : (
									<span className="text-gray-500">Press Start</span>
								)}
							</p>
						</div>

						{/* Stats Grid */}
						<div className="grid grid-cols-2 gap-2 mb-4 text-sm">
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Best Match</div>
								<div className="font-bold">
									{singleStep.bestMatch}/{settings.targetSentence.length} ({Math.round((singleStep.bestMatch / settings.targetSentence.length) * 100)}%)
								</div>
							</div>
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Attempts</div>
								<div className="font-bold">{singleStep.attempts.toLocaleString()}</div>
							</div>
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Current Match</div>
								<div className="font-bold">
									{singleStep.matchCount}/{settings.targetSentence.length} ({Math.round((singleStep.matchCount / settings.targetSentence.length) * 100)}%)
								</div>
							</div>
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Completion Time</div>
								<div className="font-bold">{formatTime(singleStep.completionTime)}</div>
							</div>
						</div>

						{/* Progress bar */}
						<div className="bg-gray-900 rounded-lg p-4 mb-4">
							<div className="flex justify-between mb-2">
								<span>Progress:</span>
								<span>
									{singleStep.matchCount}/{settings.targetSentence.length} characters
								</span>
							</div>
							<div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
								<div
									className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
									style={{
										width: `${(singleStep.matchCount / settings.targetSentence.length) * 100}%`,
									}}
								></div>
							</div>
							<div className="flex justify-between text-sm">
								<span>Attempts: {singleStep.attempts}</span>
								<span>
									{singleStep.complete ? (
										<span className="text-emerald-400">Complete!</span>
									) : settings.isPaused ? (
										<span className="text-amber-400">Paused</span>
									) : singleStep.running ? (
										<span>In progress...</span>
									) : (
										<span>Ready</span>
									)}
								</span>
							</div>
						</div>
						
						{/* Fitness history graph */}
						{singleStep.fitnessHistory.length > 1 && (
							<div className="bg-gray-900 rounded-lg p-4">
								<div className="text-sm font-medium mb-2">Fitness Over Time</div>
								{renderFitnessGraph(singleStep.fitnessHistory, "#9f7aea")}
								<div className="flex justify-between text-xs text-gray-500 mt-1">
									<span>Start</span>
									<span>Attempts</span>
								</div>
							</div>
						)}
					</div>

					{/* Cumulative selection */}
					<div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
						<h3 className="text-2xl font-bold mb-2 text-emerald-400">
							Cumulative Selection
						</h3>
						<p className="text-gray-400 mb-4">
							Each generation builds upon the previous one, preserving progress.
						</p>

						<div className="h-24 flex items-center justify-center mb-4">
							<p className="text-xl font-mono">
								{cumulative.currentAttempt ? (
									renderHighlightedText(cumulative.currentAttempt)
								) : (
									<span className="text-gray-500">Press Start</span>
								)}
							</p>
						</div>

						{/* Stats Grid */}
						<div className="grid grid-cols-2 gap-2 mb-4 text-sm">
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Best Match</div>
								<div className="font-bold">
									{cumulative.bestMatch}/{settings.targetSentence.length} ({Math.round((cumulative.bestMatch / settings.targetSentence.length) * 100)}%)
								</div>
							</div>
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Attempts</div>
								<div className="font-bold">{cumulative.attempts.toLocaleString()}</div>
							</div>
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Current Match</div>
								<div className="font-bold">
									{cumulative.matchCount}/{settings.targetSentence.length} ({Math.round((cumulative.matchCount / settings.targetSentence.length) * 100)}%)
								</div>
							</div>
							<div className="bg-gray-900 p-2 rounded">
								<div className="text-gray-500">Completion Time</div>
								<div className="font-bold">{formatTime(cumulative.completionTime)}</div>
							</div>
						</div>

						{/* Progress bar */}
						<div className="bg-gray-900 rounded-lg p-4 mb-4">
							<div className="flex justify-between mb-2">
								<span>Progress:</span>
								<span>
									{cumulative.matchCount}/{settings.targetSentence.length} characters
								</span>
							</div>
							<div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
								<div
									className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
									style={{
										width: `${(cumulative.matchCount / settings.targetSentence.length) * 100}%`,
									}}
								></div>
							</div>
							<div className="flex justify-between text-sm">
								<span>Attempts: {cumulative.attempts}</span>
								<span>
									{cumulative.complete ? (
										<span className="text-emerald-400">Complete!</span>
									) : settings.isPaused ? (
										<span className="text-amber-400">Paused</span>
									) : cumulative.running ? (
										<span>In progress...</span>
									) : (
										<span>Ready</span>
									)}
								</span>
							</div>
						</div>
						
						{/* Fitness history graph */}
						{cumulative.fitnessHistory.length > 1 && (
							<div className="bg-gray-900 rounded-lg p-4">
								<div className="text-sm font-medium mb-2">Fitness Over Time</div>
								{renderFitnessGraph(cumulative.fitnessHistory, "#10b981")}
								<div className="flex justify-between text-xs text-gray-500 mt-1">
									<span>Start</span>
									<span>Attempts</span>
								</div>
							</div>
						)}
					</div>
				</div>

				{settings.showExplanation && (
					<div className="mt-16 bg-gray-800 rounded-xl p-6 border border-gray-700">
						<h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
							Why This Matters
						</h3>
						<p className="mb-4">
							This visualization demonstrates a concept central to evolutionary biology,
						first explained by Richard Dawkins in "The Blind Watchmaker":
					</p>
					<ul className="list-disc pl-5 space-y-2 mb-4">
						<li>
							<span className="text-purple-400 font-bold">Single-step selection</span>{" "}
							is like shuffling letters randomly and hoping to get a sentence by
							chance alone. The odds are astronomically against success.
						</li>
						<li>
							<span className="text-emerald-400 font-bold">
								Cumulative selection
							</span>{" "}
							preserves successful variations from generation to generation. Small
							advantages accumulate over time, making the improbable not just
							possible, but inevitable.
						</li>
					</ul>
					<p>
						Natural selection works the same way - beneficial mutations are preserved
						through reproduction, accumulating over millions of generations to produce
						the complexity we see in living organisms.
					</p>
				</div>
			)}
			
			{/* Footer with attribution */}
			<div className="py-3 mt-8 text-center text-gray-500 text-xs">
				Selection Simulator • Built by <a href="https://bagerbach.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 underline">Christian Bager Bach Houmann</a>
			</div>
			</div>
		</div>
	);
}
