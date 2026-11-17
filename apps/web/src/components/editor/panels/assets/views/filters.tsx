"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ColorsIcon } from "@hugeicons/core-free-icons";

interface FilterItem {
	id: string;
	name: string;
	category: string;
	gradient: string;
}

const FILTERS: FilterItem[] = [
	{ id: "teal-orange", name: "Teal & Orange", category: "Cinema", gradient: "from-cyan-600 to-amber-600" },
	{ id: "golden-hour", name: "Golden Hour", category: "Cinema", gradient: "from-amber-500 to-yellow-600" },
	{ id: "moody-dark", name: "Moody Dark", category: "Cinema", gradient: "from-slate-800 to-indigo-950" },
	{ id: "noir", name: "Film Noir", category: "Retro", gradient: "from-zinc-900 to-zinc-400" },
	{ id: "vhs-95", name: "VHS 1995", category: "Retro", gradient: "from-purple-600 to-emerald-600" },
	{ id: "sepia", name: "Warm Sepia", category: "Retro", gradient: "from-amber-700 to-stone-500" },
	{ id: "cyberpunk", name: "Cyberpunk", category: "Style", gradient: "from-pink-600 to-cyan-500" },
	{ id: "vivid-pop", name: "Vivid Pop", category: "Style", gradient: "from-rose-500 to-blue-500" },
	{ id: "pastel", name: "Pastel Dream", category: "Style", gradient: "from-pink-300 to-sky-300" },
	{ id: "monochrome", name: "High B&W", category: "B&W", gradient: "from-black to-white" },
];

const CATEGORIES = ["All", "Cinema", "Retro", "Style", "B&W"];

export function FiltersView() {
	const [activeCategory, setActiveCategory] = useState("All");

	const filtered = FILTERS.filter(
		(f) => activeCategory === "All" || f.category === activeCategory
	);

	const handleApply = (filter: FilterItem) => {
		toast.success(`Filter "${filter.name}" applied`, {
			description: "Adjust intensity in the Properties panel on the right.",
		});
	};

	return (
		<PanelView title="Filters">
			<div className="flex flex-col gap-3">
				<div className="flex gap-1 overflow-x-auto scrollbar-hidden pb-1">
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							onClick={() => setActiveCategory(cat)}
							className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
								activeCategory === cat
									? "bg-cyan-500/20 text-cyan-400 font-medium border border-cyan-500/40"
									: "bg-muted/40 text-muted-foreground hover:bg-muted"
							}`}
						>
							{cat}
						</button>
					))}
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
					{filtered.map((filter) => (
						<div
							key={filter.id}
							onClick={() => handleApply(filter)}
							className="group flex flex-col rounded-md overflow-hidden bg-muted/30 border border-border/50 hover:border-cyan-500/50 cursor-pointer transition-all"
						>
							<div
								className={`h-20 w-full bg-linear-to-br ${filter.gradient} flex items-end p-2 transition-transform group-hover:scale-105`}
							>
								<span className="text-[10px] font-semibold text-white/90 drop-shadow-sm">
									{filter.category}
								</span>
							</div>
							<div className="p-2 flex items-center justify-between">
								<span className="text-xs font-medium text-foreground truncate">
									{filter.name}
								</span>
								<HugeiconsIcon icon={ColorsIcon} className="size-3.5 text-muted-foreground" />
							</div>
						</div>
					))}
				</div>
			</div>
		</PanelView>
	);
}
