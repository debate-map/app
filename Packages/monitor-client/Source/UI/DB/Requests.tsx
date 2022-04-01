import gql from "graphql-tag";
import React from "react";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {hourInMS, minuteInMS, Observer, observer_simple, RunInAction_Set, secondInMS} from "web-vcore";
import {useMutation, useQuery} from "web-vcore/nm/@apollo/client.js";
import {Button, Column, Row, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {useForceUpdate} from "tree-grapher";
import {MtxResultUI} from "./Requests/MtxResultUI";

export class Mtx {
	sectionLifetimes: MtxSectionLifetimeMap;
}
export type MtxSectionLifetimeMap = {
	[key: string]: [number, number]
};

// synthesized from the above, for easier processing
export class MtxLifetime {
	path: string;
	startTime: number;
	duration: number;
}
export function GetLifetimesInMap(map: MtxSectionLifetimeMap) {
	return Object.entries(map).map(entry=>{
		return new MtxLifetime().VSet({
			path: entry[0],
			startTime: entry[1][0],
			duration: entry[1][1],
		});
	});
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
	const mtxResults: Mtx[] = data?.mtxResults ?? [];
	console.log("Got data:", mtxResults);

	const [clearMtxResults, info] = useMutation(CLEAR_MTX_RESULTS);

	return (
		<Column style={{flex: 1, height: "100%"}}>
			<Row>
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
				<TextInput type="time" {...{step: 1}} style={{marginLeft: 5}} value={TimeInMSToTimeInputStr(uiState.showRange_duration)} onChange={val=>uiState.showRange_duration = TimeInputStrToTimeInMS(val)}/>
				<Text ml={5}>End:</Text>
				<TextInput type="datetime-local" {...{step: 1}} style={{marginLeft: 5}}
					value={DateToDateTimeInputStr(new Date(uiState.showRange_end))} onChange={val=>RunInAction_Set(()=>uiState.showRange_end = new Date(val).valueOf())}/>
				<Button ml={5} text="Now" onClick={()=>RunInAction_Set(()=>uiState.showRange_end = Date.now())}/>
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