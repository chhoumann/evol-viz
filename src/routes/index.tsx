import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

const TARGET_SENTENCE = "METHINKS IT IS LIKE A WEASEL";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const MUTATION_RATE = 0.05;

export const Route = createFileRoute("/")({
	component: SelectionVisualization,
});

function SelectionVisualization() {
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
		return Array(TARGET_SENTENCE.length)
			.fill(0)
			.map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
			.join("");
	};

	// Count how many characters match the target
	const countMatches = (str: string) => {
		return [...str].filter((char, i) => char === TARGET_SENTENCE[i]).length;
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
				complete: randomString === TARGET_SENTENCE,
			}));
		}, 50);

		return () => clearTimeout(timer);
	}, [singleStep.running, singleStep.attempts, singleStep.complete]);

	// Cumulative selection
	useEffect(() => {
		if (!cumulative.running || cumulative.complete) return;

		const timer = setTimeout(() => {
			let currentString = cumulative.currentAttempt || generateRandomString();
			
			// Mutate the string
			currentString = [...currentString]
				.map((char, idx) => {
					// Keep correct characters with higher probability
					if (char === TARGET_SENTENCE[idx]) {
						return Math.random() < MUTATION_RATE ? CHARS[Math.floor(Math.random() * CHARS.length)] : char;
					}
					// Change incorrect characters with higher probability
					return Math.random() < 0.5 ? CHARS[Math.floor(Math.random() * CHARS.length)] : char;
				})
				.join("");

			const matches = countMatches(currentString);

			setCumulative((prev) => ({
				...prev,
				currentAttempt: currentString,
				attempts: prev.attempts + 1,
				matchCount: matches,
				complete: currentString === TARGET_SENTENCE,
			}));
		}, 50);

		return () => clearTimeout(timer);
	}, [cumulative.running, cumulative.attempts, cumulative.currentAttempt, cumulative.complete]);

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
					char === TARGET_SENTENCE[idx]
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

				<div className="flex justify-center gap-4 mb-12">
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
				</div>

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
									{singleStep.matchCount}/{TARGET_SENTENCE.length} characters
								</span>
							</div>
							<div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
								<div
									className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
									style={{
										width: `${(singleStep.matchCount / TARGET_SENTENCE.length) * 100}%`,
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
									{cumulative.matchCount}/{TARGET_SENTENCE.length} characters
								</span>
							</div>
							<div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
								<div
									className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
									style={{
										width: `${(cumulative.matchCount / TARGET_SENTENCE.length) * 100}%`,
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
