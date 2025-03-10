# Evolution by Selection - Interactive Visualization

An interactive visualization demonstrating the power of cumulative selection vs. single-step selection in evolution. Based on Richard Dawkins' concepts from his book "The Blind Watchmaker."

**Live Demo**: [https://evo.bagerbach.com](https://evo.bagerbach.com)

## What is this?

This project contains two interactive visualizations:

### 1. Evolution by Selection
This visualization demonstrates two types of selection processes:

- **Single-step selection:** Entities are randomly generated and then selected based on their fitness. Each attempt starts from scratch.

- **Cumulative selection:** Results from one selection round become the starting point for the next, with small mutations introduced. Beneficial mutations are preserved, allowing improvement over generations.

The visualization shows these concepts using a text-matching exercise where the goal is to reach a target phrase. With single-step selection, each attempt starts with a random string. With cumulative selection, each generation builds on the previous one, preserving progress.

### 2. Biomorphs
An implementation of Dawkins' "Biomorphs" that demonstrates how complex structures can evolve through cumulative selection. Create digital creatures with different characteristics by selecting variations that appeal to you, or let the simulation auto-evolve based on fitness criteria.

## Features

### Evolution by Selection
- Interactive side-by-side comparison of both selection methods
- Customizable settings:
  - Target sentence
  - Mutation rates for correct and incorrect characters
  - Population size
  - Simulation speed
- Real-time progress tracking with visual feedback
- Fitness history graphs

### Biomorphs
- Digital creatures with 9 genetic parameters that determine their appearance
- Select variations to breed new generations
- Auto-evolution mode that selects based on fitness criteria
- Customizable evolution speed
- Mobile-responsive design

## Getting Started

To run this application locally:

```bash
bun install
bun start
```

## Building For Production

To build this application for production:

```bash
bun run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
bun run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

## Linting & Formatting
This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:

```bash
bun run lint
bun run format
bun run check # runs both lint and format together
```

## Technology

- React 19
- TypeScript
- TanStack Router for routing
- Vite for building and development
- Tailwind CSS for styling
- Biome for linting and formatting

## License

MIT

## Author

Christian Bager Bach Houmann