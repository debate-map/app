import React, {useState} from "react";
import {store} from "Store/index.js";
import {GetHashForString_cyrb53, RNG_Mulberry32} from "ui-debug-kit";
import {Chroma, ES, Observer} from "web-vcore";
import {GetPercentFromXToY} from "web-vcore/.yalc/js-vextensions";
import {Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {GetLifetimesInMap, Mtx, MtxLifetime_Plus} from "../Requests.js";

class LifetimeGroup {
	constructor(data?: Partial<LifetimeGroup>) {
		this.VSet(data);
	}
	path: string;
	lifetimes: MtxLifetime_Plus[] = [];
}

@Observer
export class MtxResultUI extends BaseComponent<{mtx: Mtx}, {}> {
	render() {
		const {mtx} = this.props;
		const uiState = store.main.database.requests;
		const lifetimes = GetLifetimesInMap(mtx.sectionLifetimes)
			.filter(lifetime=>{
				if (!uiState.pathFilter_enabled) return true;
				if (uiState.pathFilter_str.startsWith("/") && uiState.pathFilter_str.endsWith("/")) {
					return lifetime.path.match(uiState.pathFilter_str.slice(1, -1)) != null;
				}
				return lifetime.path.includes(uiState.pathFilter_str);
			});

		const lifetimeGroups = new Map<string, LifetimeGroup>();
		for (const lifetime of lifetimes) {
			const groupPath = `${lifetime.path.slice(0, lifetime.path.lastIndexOf("/"))}/*`;
			if (!lifetimeGroups.has(groupPath)) {
				lifetimeGroups.set(groupPath, new LifetimeGroup({path: groupPath}));
			}
			lifetimeGroups.get(groupPath)!.lifetimes.push(lifetime);
		}

		const [expanded, setExpanded] = useState(false);

		return (
			<Column
				style={{
					position: "relative",
					//height: 1 + (lifetimeGroups.size * 3) + (expanded ? lifetimeGroups.size * 20 : 0),
					height: 1 + (lifetimeGroups.size * 3) + (expanded ? lifetimes.length * 18 : 0),
				}}
			>
				<Column style={{border: "solid rgba(0,0,0,.1)", borderWidth: "1px 0 0 0", cursor: "pointer"}} onClick={()=>setExpanded(!expanded)}>
					{[...lifetimeGroups.values()].map((group, index)=>{
						return <LifetimeGroupUI key={index} group={group} index={index}/>;
					})}
				</Column>
				{/*expanded &&
				[...lifetimeGroups.values()].map((group, index)=>{
					return <LifetimeGroupUI_Expanded key={index} group={group} index={index}/>;
				})*/}
				{expanded &&
				<Column style={{background: "rgba(0,0,0,.1)"}}>
					{lifetimes.map((lifetime, lifetimeIndex)=>{
						return <LifetimeUI_Expanded key={lifetimeIndex} lifetime={lifetime} index={lifetimeIndex} lifetimes={lifetimes}/>;
					})}
				</Column>}
			</Column>
		);
	}
}

export class LifetimeGroupUI extends BaseComponent<{group: LifetimeGroup, index: number}, {}> {
	render() {
		const {group, index} = this.props;
		return (
			<div style={{position: "relative", height: 3}} title={`GroupPath:${group.path}`}>
				{group.lifetimes.map((lifetime, lifetimeIndex)=>{
					return <LifetimeUI key={lifetimeIndex} lifetime={lifetime} index={lifetimeIndex}/>;
				})}
			</div>
		);
	}
}
/*export class LifetimeGroupUI_Expanded extends BaseComponent<{group: LifetimeGroup, index: number}, {}> {
	render() {
		const {group, index} = this.props;
		return (
			<Row style={{position: "relative", height: 20}} title={`GroupPath:${group.path}`}>
				{group.lifetimes.map((lifetime, lifetimeIndex)=>{
					return <LifetimeUI_Expanded key={lifetimeIndex} lifetime={lifetime} index={lifetimeIndex}/>;
				})}
			</Row>
		);
	}
}*/

@Observer
export class LifetimeUI extends BaseComponent<{lifetime: MtxLifetime_Plus, index: number}, {}> {
	render() {
		const {lifetime, index} = this.props;
		const uiState = store.main.database.requests;
		const start_asPercentage = GetPercentFromXToY(uiState.showRange_end - uiState.showRange_duration, uiState.showRange_end, lifetime.startTime, true);
		const end_asPercentage = GetPercentFromXToY(uiState.showRange_end - uiState.showRange_duration, uiState.showRange_end, lifetime.startTime + lifetime.duration, true);

		return (
			<div
				style={{
					position: "absolute",
					left: start_asPercentage.ToPercentStr(),
					right: (1 - end_asPercentage).ToPercentStr(),
					//width: (end_asPercentage - start_asPercentage).KeepAtLeast(.01).ToPercentStr(),
					minWidth: 1,
					top: 0, height: 3,
					backgroundColor: GetColorForPath(lifetime.path).css(),
				}}
				title={`
					Path:${lifetime.path}
					StartTime:${new Date(lifetime.startTime).toLocaleString("sv")}.${new Date(lifetime.startTime).getMilliseconds().toString().padStart(3, "0")}
					Duration:${lifetime.duration}ms
					${lifetime.extraInfo != null ? `MtxExtraInfo:${lifetime.extraInfo}` : ""}
				`.AsMultiline(0).trim()}/>
		);
	}
}
@Observer
export class LifetimeUI_Expanded extends BaseComponent<{lifetime: MtxLifetime_Plus, index: number, lifetimes: MtxLifetime_Plus[]}, {}> {
	render() {
		const {lifetime, index, lifetimes} = this.props;
		const uiState = store.main.database.requests;

		const subpath = lifetime.path.split("/").slice(-2).join("/");
		const childLifetimes = lifetimes.filter(a=>a.path.startsWith(`${lifetime.path}/`) && a.path.split("/").length == lifetime.path.split("/").length + 2);
		const selfTime = lifetime.duration - (childLifetimes.length ? childLifetimes.map(a=>a.duration).Sum() : 0);
		const backgroundColor = GetColorForPath(lifetime.path);
		//const bkgHsl = backgroundColor.hsl();
		//const foregroundColor = Chroma([bkgHsl[0], bkgHsl[1], bkgHsl[2] >= .5 ? 0 : 1], "hsl");
		//const foregroundColor = Chroma(backgroundColor.hsl()[2] >= .5 ? "black" : "white");
		//const foregroundColor = Chroma("black");
		const foregroundColor = Chroma("white");

		return (
			<Row sel ml={lifetime.path.split("/").length * 10} style={{fontSize: 11, height: 18}}>
				<Text style={{background: backgroundColor.css(), color: foregroundColor.css()}}>Subpath:</Text>
				<Text style={ES(
					{background: backgroundColor.css(), color: foregroundColor.css()},
					//lifetime.duration < uiState.significantDurationThreshold && {background: "transparent", color: "black"},
					//lifetime.duration < uiState.significantDurationThreshold && {background: "black"},
					//lifetime.duration < uiState.significantDurationThreshold && {fontStyle: "italic"},
				)}>{subpath}</Text>
				<Row style={ES(
					//lifetime.duration < uiState.significantDurationThreshold && {opacity: .7},
					lifetime.duration >= uiState.significantDurationThreshold && {background: "white"},
				)}>
					<Text ml={5}>StartTime:{new Date(lifetime.startTime).toLocaleString("sv")}.{new Date(lifetime.startTime).getMilliseconds().toString().padStart(3, "0")}</Text>
					<Text ml={5}>TotalTime:</Text>
					<Text>{lifetime.duration.toFixed(3)}ms</Text>
					<Text ml={5}>SelfTime:</Text>
					<Text style={ES(selfTime >= uiState.significantDurationThreshold && {color: "red"})}>{selfTime.toFixed(3)}ms</Text>
					{lifetime.extraInfo != null &&
					<Text ml={5} style={{fontWeight: "bold"}}>ExtraInfo:{lifetime.extraInfo}</Text>}
				</Row>
			</Row>
		);
	}
}
function GetColorForPath(path: string) {
	const prng = new RNG_Mulberry32(GetHashForString_cyrb53(path));
	let colorForPath = Chroma(`rgba(${prng.GetNextFloat() * 255},${prng.GetNextFloat() * 255},${prng.GetNextFloat() * 255},1)`);
	//const colorForPath = `hsla(${prng.GetNextFloat() * 360},100%,50%,1)`;
	//const colorForPath = `hsla(${prng.GetNextFloat() * 360},${50 + (prng.GetNextFloat() * 50)}%,50%,1)`;
	const hsl = colorForPath.hsl();
	// keep the generated colors from getting too light; we don't want it hard to see against the basically-white background (and we want it to contrast with the white text)
	if (hsl[2] > .5) {
		colorForPath = Chroma([hsl[0], hsl[1], .5], "hsl");
	}
	return colorForPath;
}