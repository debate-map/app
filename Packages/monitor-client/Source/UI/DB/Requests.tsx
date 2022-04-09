import gql from "graphql-tag";
import React from "react";
import {store} from "Store";
import {hourInMS, InfoButton, minuteInMS, RunInAction_Set, secondInMS} from "web-vcore";
import {useMutation, useQuery} from "web-vcore/nm/@apollo/client.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row, Spinner, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {MtxResultUI} from "./Requests/MtxResultUI.js";

export class Mtx_Raw {
	//id: string;
	sectionLifetimes: MtxSectionMap_Raw;
}
export type MtxSectionMap_Raw = {
	[key: string]: MtxSection_Raw
};
export class MtxSection_Raw {
	path: string;
	extra_info?: string;
	start_time: number;
	duration?: number;
}

// synthesized from the above, for easier processing
export class Mtx {
	static FromMtxRaw(raw: Mtx_Raw, sort = true) {
		const result = new Mtx();
		for (const [key, value] of Object.entries(raw.sectionLifetimes)) {
			result.sectionLifetimes.push(MtxSection.FromRaw(value));
		}
		// fsr, the entries are not sorted at this point, despite (seemingly) being sorted when serialized for sending from backend
		if (sort) result.sectionLifetimes = result.sectionLifetimes.OrderBy(a=>a.path);
		return result;
	}
	sectionLifetimes: MtxSection[] = [];
}
export class MtxSection {
	static FromRaw(raw: MtxSection_Raw) {
		return new MtxSection().VSet({
			path: raw.path,
			extraInfo: raw.extra_info,
			startTime: raw.start_time,
			duration: raw.duration,
		});
	}

	path: string;
	extraInfo?: string;
	startTime: number;
	duration?: number;

	get Duration_Safe() {
		return this.duration ?? (Date.now() - this.startTime);
	}
}

export const MTX_RESULTS_QUERY = gql`
query($adminKey: String!, $startTime: Float!, $endTime: Float!) {
	mtxResults(adminKey: $adminKey, startTime: $startTime, endTime: $endTime) {
		sectionLifetimes
	}
}
`;

const CLEAR_MTX_RESULTS = gql`
mutation($adminKey: String!) {
	clearMtxResults(adminKey: $adminKey) {
		message
	}
}
`;

// todo: investigate why this decorator approach doesn't work for this case
/*@Observer
export const RequestsUI extends BaseComponent<{}, {}> {
	render() {*/

export const RequestsUI = observer(()=>{
	const adminKey = store.main.adminKey;
	const uiState = store.main.database.requests;

	//const forceUpdate = useForceUpdate();
	const {data, loading, refetch} = useQuery(MTX_RESULTS_QUERY, {
		variables: {adminKey, startTime: uiState.showRange_end - uiState.showRange_duration, endTime: uiState.showRange_end},
	});
	const mtxResults_raw: Mtx_Raw[] = data?.mtxResults ?? [];
	let mtxResults = mtxResults_raw.map(a=>Mtx.FromMtxRaw(a))
		.filter(mtx=>{
			if (!uiState.filter_enabled) return true;
			return mtx.sectionLifetimes.Any(lifetime=>{
				if (uiState.filter_str.startsWith("/") && uiState.filter_str.endsWith("/")) {
					if (lifetime.path.match(new RegExp(uiState.filter_str.slice(1, -1))) != null) return true;
					if (lifetime.extraInfo?.match(new RegExp(uiState.filter_str.slice(1, -1))) != null) return true;
				} else {
					if (lifetime.path.includes(uiState.filter_str)) return true;
					if (lifetime.extraInfo?.includes(uiState.filter_str)) return true;
				}
				return false;
			});
		});
	// app-server-rs sends the entries "ordered" by end-time (since that's when it knows it can send it), but we want the entries sorted by start-time
	mtxResults = mtxResults.OrderBy(mtx=>{
		const earliestLifetimeStart = Object.values(mtx.sectionLifetimes).map(a=>a.startTime).Min();
		return earliestLifetimeStart;
	});
	console.log("Got data:", mtxResults);
	const [clearMtxResults, info] = useMutation(CLEAR_MTX_RESULTS);

	return (
		<Column style={{flex: 1, height: "100%"}}>
			<Row center>
				<Text>Actions:</Text>
				<Button ml={5} text="Refresh" onClick={async()=>{
					await refetch();
					//forceUpdate(); // fsr, this is currently necessary
				}}/>
				<Button ml={5} text="Clear (on app-server-rs)" onClick={async()=>{
					const {message} = (await clearMtxResults({
						variables: {adminKey},
					})).data;
					await refetch();
				}}/>
				<Text ml={5}>Range to show, duration:</Text>
				<TextInput ml={5} type="time" {...{step: 1}} value={TimeInMSToTimeInputStr(uiState.showRange_duration)} onChange={val=>uiState.showRange_duration = TimeInputStrToTimeInMS(val)}/>
				<Text ml={5}>End:</Text>
				<TextInput ml={5} type="datetime-local" {...{step: 1}}
					value={DateToDateTimeInputStr(new Date(uiState.showRange_end))} onChange={val=>RunInAction_Set(()=>uiState.showRange_end = new Date(val).valueOf())}/>
				<Button ml={5} text="Now" onClick={()=>RunInAction_Set(()=>uiState.showRange_end = Date.now())}/>
				<CheckBox ml={5} text="Filter:" value={uiState.filter_enabled} onChange={val=>RunInAction_Set(()=>uiState.filter_enabled = val)}/>
				<TextInput ml={5} style={{flex: 1}} value={uiState.filter_str} onChange={val=>uiState.filter_str = val}/>
				<InfoButton ml={5} text={`
					Filters out mtx-results lacking a lifetime whose path, or extra-info string, matches the given pattern.
					You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
				`.AsMultiline(0)}/>
				<DropDown>
					<DropDownTrigger><Button ml={5} style={{height: "100%"}} text="Others"/></DropDownTrigger>
					<DropDownContent style={{zIndex: 1, position: "fixed", right: 0, width: 500, borderRadius: "0 0 0 5px"}}><Column>
						<Row>
							<Text>Significant duration threshold:</Text>
							<Spinner ml={5} value={uiState.significantDurationThreshold} onChange={val=>RunInAction_Set(()=>uiState.significantDurationThreshold = val)}/>
							<Text>ms</Text>
						</Row>
					</Column></DropDownContent>
				</DropDown>
			</Row>
			<Row>Mtx results ({mtxResults.length})</Row>
			<ScrollView>
				{mtxResults.map((mtx, index)=>{
					return <MtxResultUI key={index} mtx={mtx}/>;
				})}
			</ScrollView>
		</Column>
	);
});
function DateToDateTimeInputStr(date: Date) {
	date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
	//return date.toISOString().slice(0, 16);
	return date.toISOString().replace(/\.\d\d\dZ/, "");
}
function TimeInMSToTimeInputStr(timeInMS: number) {
	const hours = Math.floor(timeInMS / hourInMS).toString().padStart(2, "0");
	const minutes = Math.floor((timeInMS % hourInMS) / minuteInMS).toString().padStart(2, "0");
	const seconds = Math.floor((timeInMS % minuteInMS) / secondInMS).toString().padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
}
function TimeInputStrToTimeInMS(timeStr: string) {
	const parts = timeStr.split(":").map(a=>Number(a));
	return (parts[0] * hourInMS) + (parts[1] * minuteInMS) + (parts[2] * secondInMS);
}