import {BaseComponent} from "../../../../Frame/UI/ReactGlobals";
/*import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
  ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer} from "recharts";*/

const data = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400, time: 1 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210, time: 3 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290, time: 9 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000, time: 10 },
  { name: 'Page E', uv: 2500, pv: 4800, amt: 2181, time: 12 },
  { name: 'Page F', uv: 1220, pv: 3800, amt: 2500, time: 16 },
  { name: 'Page G', uv: 2300, pv: 4300, amt: 2100, time: 18 },
];

export let ratingTypes = ["significance",  "probability", "adjustment"];
export type RatingType = "significance" | "probability" | "adjustment";
let ratingTypeDescriptions = {
	significance: "",
	probability: "Probability that the statement, as presented, is true.",
	adjustment: "What intensity the statement should be strengthened/weakened to, to reach its ideal state. (making substantial claims while maintaining accuracy)",
}
export default class RatingsUI extends BaseComponent<{ratingType: RatingType}, {}> {
	render() {
		let {ratingType} = this.props;

		let ratingTypeDescription = ratingTypeDescriptions[ratingType];
		
		return (
			<div className="area-chart-wrapper">
				<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
					{ratingTypeDescription}
				</div>
				{/*<AreaChart width={900} height={250} data={data}
					margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
					<XAxis dataKey="name" hasTick />
					<YAxis tickCount={7} hasTick />
					<Tooltip content={<CustomTooltip external={data}/>}/>
					<CartesianGrid stroke="#f5f5f5" />
					<ReferenceArea x1="Page A" x2="Page E" />
					<ReferenceLine y={7500} stroke="#387908"/>
					<ReferenceDot x="Page C" y={1398} r={10} fill="#387908" isFront/>
					<Area type="monotone"
					dataKey="pv"
					stroke="#ff7300"
					fill="#ff7300"
					fillOpacity={0.9}
					/>
				</AreaChart>*/}
			</div>
		);
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
		};

		const currData = external.filter(entry => (entry.name === label))[0];
		return (
			<div className="area-chart-tooltip" style={style}>
				<p>{payload[0].name + ' : '}<em>{payload[0].value}</em></p>
				<p>{'uv : '}<em>{currData.uv}</em></p>
			</div>
		);
	}
}