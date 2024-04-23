import uPlot from "uplot";

const axis_gridStyle = {
	stroke: "rgba(255,255,255,.12)",
	width: 1,
};
const axis_tickStyle = {
	stroke: "#eee",
	width: 2,
	size: 10,
};
const axis_props_base = {
	gap: 5,
	//size: 30,
	stroke: "white",
	grid: axis_gridStyle,
	ticks: axis_tickStyle,
	// label styling (requires label prop to be used)
	labelSize: 15,
	labelGap: 0,
	labelFont: "bold 12px Arial",
	font: "12px Arial",
} as uPlot.Axis;
export const uplotDefaults = {
	axis_props_base,
	axis_props_horizontal: {
		...axis_props_base,
		size: 30,
	},
	axis_props_vertical: {
		...axis_props_base,
		size: 40,
	},
	axis_gridStyle,
	axis_tickStyle,
};