import gql from "graphql-tag";
import React from "react";
import {store} from "Store";
import {LogGroup} from "Store/main/logs/LogGroup";
import {hourInMS, InfoButton, minuteInMS, RunInAction, RunInAction_Set, secondInMS} from "web-vcore";
import {useMutation, useQuery} from "web-vcore/nm/@apollo/client.js";
import {Clone, GetPercentFromXToY, Range} from "web-vcore/nm/js-vextensions";
import {observer} from "web-vcore/nm/mobx-react.js";
import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row, Select, Spinner, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {LogEntryUI} from "./Logs/LogEntryUI";
import {LogGroupsUI} from "./Logs/LogGroupsUI";

export class LogEntry_Raw {
	time: number;
	level: string;

	span_name: string;
	target: string;

	message: string;
}

// synthesized from the above, for easier processing
export class LogEntry {
	static FromRaw(raw: LogEntry_Raw) {
		const result = new LogEntry();
		Object.assign(result, raw);
		/*result.time = raw.time;
		result.level = raw.level;
		result.span_name = raw.span_name;
		result.target = raw.target;
		result.message = raw.message;*/
		return result;
	}
	time: number;
	level: string;
	span_name: string;
	target: string;
	message: string;
}

export const LOG_ENTRIES_QUERY = gql`
query($adminKey: String!) {
	logEntries(adminKey: $adminKey) {
		message
	}
}
`;

const CLEAR_LOG_ENTRIES = gql`
mutation($adminKey: String!) {
	clearLogEntries(adminKey: $adminKey) {
		message
	}
}
`;

export const LogsUI = observer(()=>{
	const adminKey = store.main.adminKey;
	const uiState = store.main.logs;

	const {data, loading, refetch} = useQuery(LOG_ENTRIES_QUERY, {
		variables: {adminKey},
	});
	const logEntries_raw: LogEntry_Raw[] = data?.logEntries ?? [];
	let logEntries = logEntries_raw.map(a=>LogEntry.FromRaw(a))
		.filter(entry=>{
			for (const group of uiState.groups) {
				if (group.enabled && group.filter && !LogGroup.Matches(group, entry)) return false;
			}
			return true;
		});
	// app-server-rs sends the entries "ordered" by end-time (since that's when it knows it can send it), but we want the entries sorted by start-time
	logEntries = logEntries.OrderBy(entry=>{
		return entry.time;
	});
	console.log("Got data:", logEntries);
	const [clearLogEntries, info] = useMutation(CLEAR_LOG_ENTRIES);

	return (
		<Column style={{flex: 1, height: "100%"}}>
			<Row center>
				<Text>Actions:</Text>
				<Button ml={5} text="Refresh" onClick={async()=>{
					await refetch();
					//forceUpdate(); // fsr, this is currently necessary
				}}/>
				<Button ml={5} text="Clear (on app-server-rs)" onClick={async()=>{
					const {message} = (await clearLogEntries({
						variables: {adminKey},
					})).data;
					await refetch();
				}}/>
				<Row ml="auto">
					<DropDown autoHide={false}>
						<DropDownTrigger><Button style={{height: "100%"}} text="Groups"/></DropDownTrigger>
						<DropDownContent style={{zIndex: 1, position: "fixed", right: 0, width: 1000, borderRadius: "0 0 0 5px"}}>
							<LogGroupsUI/>
						</DropDownContent>
					</DropDown>
					{/*<DropDown style={{marginLeft: 5}}>
						<DropDownTrigger><Button style={{height: "100%"}} text="Others"/></DropDownTrigger>
						<DropDownContent style={{zIndex: 1, position: "fixed", right: 0, width: 500, borderRadius: "0 0 0 5px"}}><Column>
							<Row center>
								<Text>Significant duration threshold:</Text>
								<Spinner ml={5} value={uiState.significantDurationThreshold} onChange={val=>RunInAction_Set(()=>uiState.significantDurationThreshold = val)}/>
								<Text>ms</Text>
							</Row>
						</Column></DropDownContent>
					</DropDown>*/}
				</Row>
			</Row>
			<Row>Log entries ({logEntries.length})</Row>
			<ScrollView>
				{logEntries.map((entry, index)=>{
					return <LogEntryUI key={index} entry={entry}/>;
				})}
			</ScrollView>
		</Column>
	);
});