import gql from "graphql-tag";
import React, {useState} from "react";
import {store} from "Store";
import {LogGroup} from "Store/main/logs/LogGroup";
import {Observer} from "web-vcore";
import {useSubscription} from "web-vcore/nm/@apollo/client.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {LogEntryUI} from "./LogEntryUI.js";
import {LogGroupsUI} from "./LogGroupsUI.js";

export class LogEntry_Raw {
	time: number;
	level: string;

	target: string;
	spanName: string;

	message: string;
}

// synthesized from the above, for easier processing
export const Level_values = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"] as const;
export type Level = typeof Level_values[number];
export class LogEntry {
	static FromRaw(raw: LogEntry_Raw) {
		const result = new LogEntry();
		Object.assign(result, raw);
		return result;
	}
	constructor(data?: Partial<LogEntry>) {
		Object.assign(this, data);
	}

	time: number;
	level: Level;
	target: string;
	spanName: string;
	message: string;
}

export const LOG_ENTRIES_SUBSCRIPTION = gql`
subscription($adminKey: String!) {
	logEntries(adminKey: $adminKey) {
		time
		level
		target
		spanName
		message
	}
}
`;

/*const CLEAR_LOG_ENTRIES = gql`
mutation($adminKey: String!) {
	clearLogEntries(adminKey: $adminKey) {
		message
	}
}
`;*/

//export const LogsUI = observer(()=>{
@Observer
export class LogsUI_Realtime extends BaseComponent<{}, {}> {
	render() {
		const adminKey = store.main.adminKey;
		const uiState = store.main.logs;

		/*const {data, loading, refetch} = useQuery(LOG_ENTRIES_QUERY, {
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
			// app-server sends the entries "ordered" by end-time (since that's when it knows it can send it), but we want the entries sorted by start-time
			logEntries = logEntries.OrderBy(entry=>{
				return entry.time;
			});
			console.log("Got data:", logEntries);*/

		const [logEntries, setLogEntries] = useState([] as LogEntry[]);
		const [enabled, setEnabled] = useState(true);

		const {data, loading} = useSubscription(LOG_ENTRIES_SUBSCRIPTION, {
			variables: {adminKey},
			onSubscriptionData: info=>{
				if (!enabled) return;
				const newEntries_raw = info.subscriptionData.data.logEntries as LogEntry_Raw[];
				const newEntries_final = newEntries_raw.map(a=>LogEntry.FromRaw(a));
				setLogEntries(logEntries.concat(newEntries_final));
			},
		});

		const logEntriesToShow = logEntries
			.filter(entry=>{
				for (const group of uiState.groups) {
					if (group.enabled && group.filter && !LogGroup.Matches(group, entry)) return false;
				}
				return true;
			});
		//logEntriesToShow = logEntriesToShow.OrderBy(a=>a.time);

		//const [clearLogEntries, info] = useMutation(CLEAR_LOG_ENTRIES);

		return (
				<Column style={{flex: 1, height: "100%"}}>
					<Row center>
						{/*<Text>Actions:</Text>*/}
						<CheckBox text="Enabled" value={enabled} onChange={val=>setEnabled(val)}/>
						{/*<Button ml={5} text="Refresh" onClick={async()=>{
							await refetch();
							//forceUpdate(); // fsr, this is currently necessary
						}}/>*/}
						<Button ml={5} text="Clear (local list)" onClick={async()=>{
							/*const {message} = (await clearLogEntries({
								variables: {adminKey},
							})).data;
							await refetch();*/
							setLogEntries([]);
						}}/>
						<Text ml={5}>{`Note: "println" calls are not yet captured here.`}</Text>
					</Row>
					<Row>Log entries (showing {logEntriesToShow.length} of {logEntries.length})</Row>
					<ScrollView className="selectable">
						{logEntriesToShow.map((entry, index)=>{
							return <LogEntryUI key={index} entry={entry}/>;
						})}
					</ScrollView>
				</Column>
		);
	}
}