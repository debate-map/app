import React from "react";
import {store} from "Store/index.js";
import {GetHashForString_cyrb53, RNG_Mulberry32} from "ui-debug-kit";
import {GetPercentFromXToY} from "web-vcore/.yalc/js-vextensions";
import {Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {GetLifetimesInMap, Mtx, MtxLifetime} from "../Requests.js";

class LifetimeGroup {
	constructor(data?: Partial<LifetimeGroup>) {
		this.VSet(data);
	}
	path: string;
	lifetimes: MtxLifetime[] = [];
}

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

		return (
			<Column style={{position: "relative", height: (lifetimeGroups.size * 3) + 1, border: "solid rgba(0,0,0,.1)", borderWidth: "1px 0 0 0"}}>
				{[...lifetimeGroups.values()].map((group, index)=>{
					return <LifetimeGroupUI key={index} group={group} index={index}/>;
				})}
			</Column>
		);
	}
}

export class LifetimeGroupUI extends BaseComponent<{group: LifetimeGroup, index: number}, {}> {
	render() {
		const {group, index} = this.props;
		return (
			<div
				style={{
					position: "relative", height: 3,
				}}
				title={`GroupPath:${group.path}`}
			>
				{group.lifetimes.map((lifetime, lifetimeIndex)=>{
					return <LifetimeUI key={lifetimeIndex} lifetime={lifetime} index={lifetimeIndex}/>;
				})}
			</div>
		);
	}
}

export class LifetimeUI extends BaseComponent<{lifetime: MtxLifetime, index: number}, {}> {
	render() {
		const {lifetime, index} = this.props;
		const uiState = store.main.database.requests;
		const start_asPercentage = GetPercentFromXToY(uiState.showRange_end - uiState.showRange_duration, uiState.showRange_end, lifetime.startTime, true);
		const end_asPercentage = GetPercentFromXToY(uiState.showRange_end - uiState.showRange_duration, uiState.showRange_end, lifetime.startTime + lifetime.duration, true);
		const prng = new RNG_Mulberry32(GetHashForString_cyrb53(lifetime.path));
		const colorForPath = `rgba(${prng.GetNextFloat() * 255},${prng.GetNextFloat() * 255},${prng.GetNextFloat() * 255},1)`;

		/*const debugTextUIs = (
			<Row>
				<Text>Path:{lifetime.path}</Text>
				<Text ml={5}>StartTime:{new Date(lifetime.startTime).toLocaleString("sv")}</Text>
				<Text ml={5}>Duration:{lifetime.duration}ms</Text>
			</Row>
		)*/

		return (
			<div
				style={{
					position: "absolute",
					left: start_asPercentage.ToPercentStr(),
					right: (1 - end_asPercentage).ToPercentStr(),
					//width: (end_asPercentage - start_asPercentage).KeepAtLeast(.01).ToPercentStr(),
					minWidth: 1,
					top: 0, height: 3,
					backgroundColor: colorForPath,
				}}
				title={`
					Path:${lifetime.path}
					StartTime:${new Date(lifetime.startTime).toLocaleString("sv")}.${new Date(lifetime.startTime).getMilliseconds().toString().padStart(3, "0")}
					Duration:${lifetime.duration}ms
				`.AsMultiline(0)}/>
		);
	}
}