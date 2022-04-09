import React, {useState} from "react";
import {store} from "Store/index.js";
import {GetHashForString_cyrb53, RNG_Mulberry32} from "ui-debug-kit";
import {Chroma, ES, Observer} from "web-vcore";
import {GetPercentFromXToY} from "web-vcore/.yalc/js-vextensions";
import {Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {Mtx, MtxSection} from "../Requests.js";

class LifetimeGroup {
	constructor(data?: Partial<LifetimeGroup>) {
		this.VSet(data);
	}
	path: string;
	sections: MtxSection[] = [];
}

@Observer
export class MtxResultUI extends BaseComponent<{mtx: Mtx}, {}> {
	render() {
		const {mtx} = this.props;
		const uiState = store.main.database.requests;
		const sections = mtx.sectionLifetimes;

		const lifetimeGroups = new Map<string, LifetimeGroup>();
		for (const lifetime of sections) {
			const groupPath = `${lifetime.path.slice(0, lifetime.path.lastIndexOf("/"))}/*`;
			if (!lifetimeGroups.has(groupPath)) {
				lifetimeGroups.set(groupPath, new LifetimeGroup({path: groupPath}));
			}
			lifetimeGroups.get(groupPath)!.sections.push(lifetime);
		}

		const [expanded, setExpanded] = useState(false);

		return (
			<Column
				style={{
					position: "relative",
					//height: 1 + (lifetimeGroups.size * 3) + (expanded ? lifetimeGroups.size * 20 : 0),
					height: 1 + (lifetimeGroups.size * 3) + (expanded ? sections.length * 18 : 0),
				}}
			>
				<Column style={{border: "solid rgba(0,0,0,.1)", borderWidth: "1px 0 0 0", cursor: "pointer"}} onClick={()=>setExpanded(!expanded)}>
					{[...lifetimeGroups.values()].map((group, index)=>{
						return <SectionGroupUI key={index} group={group} index={index}/>;
					})}
				</Column>
				{/*expanded &&
				[...lifetimeGroups.values()].map((group, index)=>{
					return <LifetimeGroupUI_Expanded key={index} group={group} index={index}/>;
				})*/}
				{expanded &&
				<Column style={{background: "rgba(0,0,0,.1)"}}>
					{sections.map((section, sectionIndex)=>{
						return <SectionUI_Expanded key={sectionIndex} section={section} index={sectionIndex} sections={sections}/>;
					})}
				</Column>}
			</Column>
		);
	}
}

export class SectionGroupUI extends BaseComponent<{group: LifetimeGroup, index: number}, {}> {
	render() {
		const {group, index} = this.props;
		return (
			<div style={{position: "relative", height: 3}} title={`GroupPath:${group.path}`}>
				{group.sections.map((lifetime, lifetimeIndex)=>{
					return <SectionUI key={lifetimeIndex} lifetime={lifetime} index={lifetimeIndex}/>;
				})}
			</div>
		);
	}
}
/*export class SectionGroupUI_Expanded extends BaseComponent<{group: LifetimeGroup, index: number}, {}> {
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
export class SectionUI extends BaseComponent<{lifetime: MtxSection, index: number}, {}> {
	render() {
		const {lifetime, index} = this.props;
		const uiState = store.main.database.requests;
		const start_asPercentage = GetPercentFromXToY(uiState.showRange_end - uiState.showRange_duration, uiState.showRange_end, lifetime.startTime, true);
		const end_asPercentage = GetPercentFromXToY(uiState.showRange_end - uiState.showRange_duration, uiState.showRange_end, lifetime.startTime + lifetime.Duration_Safe, true);

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
export class SectionUI_Expanded extends BaseComponent<{section: MtxSection, index: number, sections: MtxSection[]}, {}> {
	render() {
		const {section, index, sections} = this.props;
		const uiState = store.main.database.requests;

		const subpath = section.path.split("/").slice(-2).join("/");
		const childSections = sections.filter(a=>a.path.startsWith(`${section.path}/`) && a.path.split("/").length == section.path.split("/").length + 2);
		const selfTime = section.Duration_Safe - (childSections.length ? childSections.map(a=>a.Duration_Safe).Sum() : 0);
		const backgroundColor = GetColorForPath(section.path);
		//const bkgHsl = backgroundColor.hsl();
		//const foregroundColor = Chroma([bkgHsl[0], bkgHsl[1], bkgHsl[2] >= .5 ? 0 : 1], "hsl");
		//const foregroundColor = Chroma(backgroundColor.hsl()[2] >= .5 ? "black" : "white");
		//const foregroundColor = Chroma("black");
		const foregroundColor = Chroma("white");

		return (
			<Row sel ml={section.path.split("/").length * 10} style={{fontSize: 11, height: 18}}>
				<Text style={{background: backgroundColor.css(), color: foregroundColor.css()}}>Subpath:</Text>
				<Text style={ES(
					{background: backgroundColor.css(), color: foregroundColor.css()},
					//lifetime.duration < uiState.significantDurationThreshold && {background: "transparent", color: "black"},
					//lifetime.duration < uiState.significantDurationThreshold && {background: "black"},
					//lifetime.duration < uiState.significantDurationThreshold && {fontStyle: "italic"},
				)}>{subpath}</Text>
				<Row style={ES(
					//lifetime.duration < uiState.significantDurationThreshold && {opacity: .7},
					section.Duration_Safe >= uiState.significantDurationThreshold && {background: "white"},
				)}>
					<Text ml={5}>StartTime:{new Date(section.startTime).toLocaleString("sv")}.{new Date(section.startTime).getMilliseconds().toString().padStart(3, "0")}</Text>
					<Text ml={5}>TotalTime:</Text>
					<Text>{section.Duration_Safe.toFixed(3)}ms</Text>
					<Text ml={5}>SelfTime:</Text>
					<Text style={ES(selfTime >= uiState.significantDurationThreshold && {color: "red"})}>{selfTime.toFixed(3)}ms</Text>
					{section.extraInfo != null &&
					<Text ml={5} style={{fontWeight: "bold"}}>ExtraInfo:{section.extraInfo}</Text>}
				</Row>
			</Row>
		);
	}
}
function GetColorForPath(path: string) {
	// for color-generation, only consider the last func-name and section-name of the path
	// (this way, a [func/section]'s color is stable regardless of upper call-stack, which enables global scanning)
	const subpath = path.split("/").slice(-2).join("/");
	const prng = new RNG_Mulberry32(GetHashForString_cyrb53(subpath));
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