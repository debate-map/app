import {Log} from "../../../../Frame/General/Logging";
import {BaseComponent, RenderSource, SimpleShouldUpdate} from "../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {Range} from "../../../../Frame/General/Globals";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

const data = [
  {rating: 1, count: 0},
  {rating: 25, count: 12},
  {rating: 30, count: 16},
  {rating: 40, count: 1},
  {rating: 45, count: 3},
  {rating: 50, count: 9},
  {rating: 70, count: 18},
  {rating: 75, count: 1},
  {rating: 90, count: 5},
  {rating: 92, count: 12},
  {rating: 94, count: 6},
  {rating: 96, count: 8},
  {rating: 98, count: 4},
  {rating: 99, count: 15},
];

export let ratingTypes = ["significance",  "probability", "adjustment"];
export type RatingType = "significance" | "probability" | "adjustment";
interface RatingTypeInfo {
	description: string;
	options: number[];
	ticks: number[];
}

let ratingTypeInfos = {
	significance: {
		description: "TODO",
		options: Range(1, 99),
		ticks: Range(0, 100, 5),
	},
	probability: {
		description: "Probability that the statement, as presented, is true.",
		//options: [1, 2, 4, 6, 8].concat(Range(10, 90, 5)).concat([92, 94, 96, 98, 99]),
		//options: [1].concat(Range(2, 98, 2)).concat([99]),
		/*options: Range(1, 99),
		ticks: [1].concat(Range(5, 95, 5)).concat([99]),*/
		options: Range(0, 100),
		ticks: Range(0, 100, 5),
	},
	adjustment: {
		description: "What intensity the statement should be strengthened/weakened to, to reach its ideal state. (making substantial claims while maintaining accuracy)",
		/*options: [1, 2, 4, 6, 8].concat(Range(10, 200, 5)),
		ticks: [1].concat(Range(20, 200, 20)),*/
		options: Range(0, 200),
		ticks: Range(0, 200, 10),
	},
} as {[key: string]: RatingTypeInfo};
let ratingTypeDescriptions = {
	significance: "",
	probability: "Probability that the statement, as presented, is true.",
	adjustment: "What intensity the statement should be strengthened/weakened to, to reach its ideal state. (making substantial claims while maintaining accuracy)",
}

@SimpleShouldUpdate
export default class RatingsUI extends BaseComponent<{ratingType: RatingType}, {size: Vector2i}> {
	render() {
		let {ratingType} = this.props;
		let {size} = this.state;

		let ratingTypeInfo = ratingTypeInfos[ratingType];
		
		/*let dataFinal = [...data];
		for (let [index, rating] of ratingOptions.entries()) {
			if (!dataFinal.Any(a=>a.rating == rating))
				dataFinal.splice(rating - 1, 0, {rating: rating, count: 0});
		}*/
		let dataFinal = ratingTypeInfo.options.Select(a=>({rating: a, count: 0}));
		for (let entry of data) {
			let placeholderIndex = dataFinal.findIndex(a=>a.rating == entry.rating);
			dataFinal.splice(placeholderIndex, 1, entry);
		}

		return (
			<div ref="root" className="area-chart-wrapper" style={{minWidth: 496}}>
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{ratingTypeInfo.description}
				</div>
				<div>
					TODO
				</div>
				{this.lastRender_source == RenderSource.SetState &&
					<AreaChart width={size.x} height={250} data={dataFinal}
							margin={{top: 10, right: 10, bottom: 10, left: 10}}>
						<XAxis dataKey="rating" ticks={ratingTypeInfo.ticks} type="number" domain={[1, 99]} minTickGap={0}/>
						{/*<YAxis tickCount={7} hasTick width={50}/>*/}
						<YAxis orientation="left" x={20} width={20} height={250} viewBox={{x: 0, y: 0, width: 500, height: 500}} tickCount={10}/>
						<Tooltip content={<CustomTooltip external={dataFinal}/>}/>
						<CartesianGrid stroke="#f5f5f5"/>
						<Area type="monotone" dataKey="count" stroke="#ff7300" fill="#ff7300" fillOpacity={0.9}/>
					</AreaChart>}
			</div>
		);
	}
	PostRender() {
		if (this.lastRender_source == RenderSource.SetState) return;

		let dom = this.refs.root;
		let size = new Vector2i(dom.clientWidth, dom.clientHeight);
		//if (!size.Equals(this.state.size))
		this.SetState({size});
	}
}

class CustomTooltip extends BaseComponent<{active?, payload?, external?, label?}, {}> {
	render() {
		const {active, payload, external, label} = this.props;
    	if (!active) return null;

		const style = {
			padding: 6,
			backgroundColor: '#fff',
			border: '1px solid #ccc',
			color: "black",
		};

		const currData = external.filter(entry=>entry.rating === label)[0];
		return (
			<div className="area-chart-tooltip" style={style}>
				<p className="ignoreBaseCSS">Rating: <em className="ignoreBaseCSS">{currData.rating}%</em></p>
				<p className="ignoreBaseCSS">Count: <em className="ignoreBaseCSS">{currData.count}</em></p>
			</div>
		);
	}
}