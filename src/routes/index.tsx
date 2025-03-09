import { useState, useEffect, useRef } from "react";
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
	});

	// Simulation state
	const [singleStep, setSingleStep] = useState({
		currentAttempt: "",
		attempts: 0,
		matchCount: 0,
		running: false,
		complete: false,
	});

	const [cumulative, setCumulative] = useState({
		currentAttempt: "",
		attempts: 0,
		matchCount: 0,
		running: false,
		complete: false,
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
		if (!singleStep.running || singleStep.complete) return;

		const timer = setTimeout(() => {
			const randomString = generateRandomString();
			const matches = countMatches(randomString);

			setSingleStep((prev) => ({
				...prev,
				currentAttempt: randomString,
				attempts: prev.attempts + 1,
				matchCount: matches,
				complete: randomString === settings.targetSentence,
			}));
		}, settings.updateSpeed);

		return () => clearTimeout(timer);
	}, [singleStep.running, singleStep.attempts, singleStep.complete, settings.targetSentence, settings.updateSpeed]);

	// Cumulative selection
	useEffect(() => {
		if (!cumulative.running || cumulative.complete) return;

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

			setCumulative((prev) => ({
				...prev,
				currentAttempt: bestString,
				attempts: prev.attempts + 1,
				matchCount: bestMatches,
				complete: bestString === settings.targetSentence,
			}));
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
		settings.updateSpeed
	]);

	const startSimulation = () => {
		setSingleStep({
			currentAttempt: generateRandomString(),
			attempts: 0,
			matchCount: 0,
			running: true,
			complete: false,
		});

		setCumulative({
			currentAttempt: generateRandomString(),
			attempts: 0,
			matchCount: 0,
			running: true,
			complete: false,
		});
	};

	const resetSimulation = () => {
		setSingleStep({
			currentAttempt: "",
			attempts: 0,
			matchCount: 0,
			running: false,
			complete: false,
		});

		setCumulative({
			currentAttempt: "",
			attempts: 0,
			matchCount: 0,
			running: false,
			complete: false,
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

	return (
		<div className="min-h-screen bg-gray-900 text-white p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
					Evolution by Selection
				</h1>
				<h2 className="text-xl text-center text-gray-400 mb-10">
					Single-Step vs. Cumulative Selection
				</h2>

				<div className="flex justify-center gap-4 mb-6">
					<button
						onClick={startSimulation}
						disabled={singleStep.running || cumulative.running}
						className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors duration-300"
					>
						Start Simulation
					</button>
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
						<p className="text-gray-400 mb-6">
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
									) : (
										<span>In progress...</span>
									)}
								</span>
							</div>
						</div>
					</div>

					{/* Cumulative selection */}
					<div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
						<h3 className="text-2xl font-bold mb-2 text-emerald-400">
							Cumulative Selection
						</h3>
						<p className="text-gray-400 mb-6">
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
									) : (
										<span>In progress...</span>
									)}
								</span>
							</div>
						</div>
					</div>
				</div>

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
			</div>
		</div>
	);
}
