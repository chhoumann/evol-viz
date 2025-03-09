# CLAUDE.md - Commands & Guidelines for evol project

## Commands
- **Start development server**: `bun start` (runs on port 3000)
- **Build project**: `bun run build` (builds with Vite and TypeScript)
- **Run tests**: `bun test` (uses Vitest)
- **Run single test**: `bun vitest run path/to/test.spec.ts`
- **Format code**: `bun run format` (uses Biome)
- **Lint code**: `bun run lint` (uses Biome)
- **Check code**: `bun run check` (Biome formatter + linter)

## Code Guidelines
- **Framework**: React 19 with TanStack Router
- **Formatting**: Use tabs for indentation, double quotes for strings
- **Types**: Strict TypeScript mode enabled; avoid `any` types
- **Imports**: Organize imports automatically with Biome
- **File Naming**: Component files use PascalCase, utility files use camelCase
- **Error Handling**: Prefer explicit error handling; avoid swallowing errors
- **Styling**: Uses Tailwind CSS for styling components
- **Testing**: Vitest with React Testing Library in jsdom environment

Always run format and lint checks before submitting code changes.