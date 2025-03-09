import { Outlet, createRootRoute, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

export const Route = createRootRoute({
	component: () => (
		<>
			<nav className="bg-gray-800 text-white p-4 shadow-md">
				<div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between">
					<div className="flex items-center">
						<span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">Evolution Simulations</span>
					</div>
					<div className="flex gap-6">
						<Link
							to="/"
							className="text-gray-300 hover:text-white transition-colors"
							activeProps={{ className: "text-white font-bold" }}
						>
							Selection
						</Link>
						<Link
							to="/biomorphs"
							className="text-gray-300 hover:text-white transition-colors"
							activeProps={{ className: "text-white font-bold" }}
						>
							Biomorphs
						</Link>
					</div>
				</div>
			</nav>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
});
