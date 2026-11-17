"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, RotateLeft01Icon } from "@hugeicons/core-free-icons";

interface AdjustmentValue {
	name: string;
	key: string;
	min: number;
	max: number;
	default: number;
	unit?: string;
}

const ADJUSTMENTS: AdjustmentValue[] = [
	{ name: "Brightness", key: "brightness", min: -100, max: 100, default: 0 },
	{ name: "Contrast", key: "contrast", min: -100, max: 100, default: 0 },
	{ name: "Saturation", key: "saturation", min: -100, max: 100, default: 0 },
	{ name: "Exposure", key: "exposure", min: -100, max: 100, default: 0 },
	{ name: "Temperature", key: "temperature", min: -100, max: 100, default: 0 },
	{ name: "Tint", key: "tint", min: -100, max: 100, default: 0 },
	{ name: "Vignette", key: "vignette", min: 0, max: 100, default: 0 },
	{ name: "Sharpen", key: "sharpen", min: 0, max: 100, default: 0 },
];

export function AdjustmentView() {
	const [values, setValues] = useState<Record<string, number>>(() =>
		Object.fromEntries(ADJUSTMENTS.map((a) => [a.key, a.default]))
	);

	const handleChange = (key: string, val: number) => {
		setValues((prev) => ({ ...prev, [key]: val }));
	};

	const handleReset = () => {
		setValues(Object.fromEntries(ADJUSTMENTS.map((a) => [a.key, a.default])));
		toast.info("Adjustments reset to defaults");
	};

	const handleAddAdjustmentLayer = () => {
		toast.success("Adjustment layer added to timeline", {
			description: "Effects applied will affect all underlying tracks.",
		});
	};

	return (
		<PanelView
			title="Adjustment"
			actions={
				<Button
					size="icon"
					variant="ghost"
					onClick={handleReset}
					title="Reset adjustments"
					className="h-7 w-7 text-muted-foreground hover:text-foreground"
				>
					<HugeiconsIcon icon={RotateLeft01Icon} className="size-3.5" />
				</Button>
			}
		>
			<div className="flex flex-col gap-4">
				<Button
					onClick={handleAddAdjustmentLayer}
					className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs py-2 gap-1.5 shadow-sm"
				>
					<HugeiconsIcon icon={Add01Icon} className="size-4" />
					Add Adjustment Layer
				</Button>

				<div className="flex flex-col gap-3.5 pt-1">
					{ADJUSTMENTS.map((adj) => (
						<div key={adj.key} className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground font-medium">{adj.name}</span>
								<span className="tabular-nums font-mono text-[11px] text-foreground">
									{values[adj.key] > 0 ? `+${values[adj.key]}` : values[adj.key]}
								</span>
							</div>
							<Slider
								value={[values[adj.key]]}
								min={adj.min}
								max={adj.max}
								step={1}
								onValueChange={(val) => handleChange(adj.key, val[0])}
								className="cursor-pointer"
							/>
						</div>
					))}
				</div>
			</div>
		</PanelView>
	);
}
