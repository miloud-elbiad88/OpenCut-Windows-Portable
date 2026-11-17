"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRightDoubleIcon } from "@hugeicons/core-free-icons";

interface TransitionItem {
	id: string;
	name: string;
	category: string;
	duration: number;
}

const TRANSITIONS: TransitionItem[] = [
	{ id: "cross-dissolve", name: "Cross Dissolve", category: "Basic", duration: 1.0 },
	{ id: "fade-black", name: "Fade to Black", category: "Basic", duration: 1.0 },
	{ id: "fade-white", name: "Fade to White", category: "Basic", duration: 0.8 },
	{ id: "slide-left", name: "Slide Left", category: "Slide", duration: 0.6 },
	{ id: "slide-right", name: "Slide Right", category: "Slide", duration: 0.6 },
	{ id: "slide-up", name: "Slide Up", category: "Slide", duration: 0.6 },
	{ id: "zoom-in", name: "Zoom In", category: "Camera", duration: 0.7 },
	{ id: "zoom-out", name: "Zoom Out", category: "Camera", duration: 0.7 },
	{ id: "spin-cw", name: "Spin Clockwise", category: "Camera", duration: 0.8 },
	{ id: "flash", name: "Flash", category: "Light", duration: 0.5 },
	{ id: "light-leak", name: "Light Leak", category: "Light", duration: 0.9 },
	{ id: "glitch", name: "Glitch Slice", category: "Glitch", duration: 0.5 },
	{ id: "wipe-circle", name: "Iris Round", category: "Mask", duration: 0.8 },
	{ id: "blur-dissolve", name: "Blur Dissolve", category: "Basic", duration: 0.7 },
];

const CATEGORIES = ["All", "Basic", "Camera", "Slide", "Light", "Glitch", "Mask"];

export function TransitionsView() {
	const [activeCategory, setActiveCategory] = useState("All");
	const [searchQuery, setSearchQuery] = useState("");

	const filtered = TRANSITIONS.filter((item) => {
		const matchesCat = activeCategory === "All" || item.category === activeCategory;
		const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCat && matchesSearch;
	});

	const handleApply = (item: TransitionItem) => {
		toast.success(`Transition "${item.name}" ready to place between clips`, {
			description: "Drag or select two adjacent clips on the timeline to apply.",
		});
	};

	return (
		<PanelView title="Transitions">
			<div className="flex flex-col gap-3">
				{/* Search & Categories */}
				<input
					type="text"
					placeholder="Search transitions..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground text-xs rounded px-2.5 py-1.5 outline-none focus:border-cyan-500"
				/>

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

				{/* Grid */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					{filtered.map((item) => (
						<div
							key={item.id}
							onClick={() => handleApply(item)}
							className="group relative flex flex-col items-center justify-center p-3 rounded-md bg-muted/30 hover:bg-muted/70 border border-border/50 hover:border-cyan-500/50 cursor-pointer transition-all"
						>
							<div className="size-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-2">
								<HugeiconsIcon icon={ArrowRightDoubleIcon} className="size-5" />
							</div>
							<span className="text-xs font-medium text-center text-foreground truncate w-full">
								{item.name}
							</span>
							<span className="text-[10px] text-muted-foreground">{item.duration}s</span>
						</div>
					))}
				</div>
			</div>
		</PanelView>
	);
}
