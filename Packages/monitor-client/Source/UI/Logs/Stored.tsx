import {GetServerURL} from "dm_common";
import React, {useState} from "react";
import {store} from "Store";
import {DateToDateTimeInputStr} from "UI/DB/Requests.js";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {Button, CheckBox, Column, Row, Spinner, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {LogEntryUI} from "./LogEntryUI.js";
import {LogEntry} from "./Realtime.js";

export class LogEntry_Stored {
	constructor(data?: Partial<LogEntry_Stored>) {
		Object.assign(this, data);
	}

	time: number;
	message: string;
	stream: string;
	time_display: string;

	ToRealtimeEntry(): LogEntry {
		return new LogEntry({
			// todo
			message: this.message,
			target: this.stream,
			time: this.time,
		});
	}
}

@Observer
export class LogsUI_Stored extends BaseComponent<{}, {}> {
	render() {
		const adminKey = store.main.adminKey;
		const uiState = store.main.logs;

		const [logEntries, setLogEntries] = useState([] as LogEntry_Stored[]);
		const logEntriesToShow = logEntries;
		/*.filter(entry=>{
				for (const group of uiState.groups) {
					if (group.enabled && group.filter && !LogGroup.Matches(group, entry)) return false;
				}
				return true;
			});*/

		return (
				<Column style={{flex: 1, height: "100%"}}>
					<Row center>
						<Button ml={5} text="Refresh" onClick={async()=>{
							//await fetch("http://localhost:3000/api/datasources/proxy/1/loki/api/v1/query_range?direction=BACKWARD&limit=1000&query=%7Bapp%3D%22dm-app-server%22%7D&start=1673399447849000000&end=1673485847849000000&step=30");
							const graphqlEndpoint = GetServerURL("monitor", "/graphql", {restrictToRecognizedHosts: true, claimedClientURL: window.location.href});
							const response = await fetch(graphqlEndpoint, {
								method: "POST",
								body: JSON.stringify({
									operationName: null,
									query: `query($input: QueryLokiInput) { queryLoki(input: $input) { logEntries } }`,
									variables: {input: {
										adminKey,
										query: uiState.query,
										startTime: uiState.showRange_start * 1_000_000,
										endTime: uiState.showRange_end_enabled ? (uiState.showRange_end * 1_000_000) : null,
										limit: uiState.limit,
									}},
								}),
								/*credentials: "include",
								headers: {
									"Content-Type": "application/json",
									authorization: `Bearer ${jwtToken}`,
								},*/
							});
							const response_as_str = await response.text();
							const response_as_json = JSON.parse(response_as_str);
							if (response_as_json.errors?.length) {
								throw new Error(`Got graphql errors:${JSON.stringify(response_as_json.errors)}`);
							}

							const logEntries_new_raw = response_as_json.data.queryLoki.logEntries as any[];
							let lastLogTime: number|n;
							const logEntries_new = logEntries_new_raw.map(raw=>{
								const time = Number(raw[0]) / 1_000_000;
								try {
									var subdata = JSON.parse(raw[1]);
								} catch (ex) {
									// if log-entry was not json... (apparently [can?] happen for simple println calls like: println!("GetServerURL_claimedClientURLStr: {:?}", claimed_client_url_str);)
									return new LogEntry_Stored({
										time,
										message: raw[1],
										stream: undefined,
										time_display: time.toString(),
									});
								}
								//lastLogTime = time;
								return new LogEntry_Stored({
									time,
									message: subdata.log,
									stream: subdata.stream,
									time_display: subdata.time,
								});
							});
							logEntries_new.reverse(); // reverse entries, to make reading more natural (eg. for stack-traces, which get chopped up into multiple log-messages)
							setLogEntries(logEntries_new);
						}}/>

						{/*<Text ml={5}>Range to show, duration:</Text>
						<TextInput ml={5} type="time" {...{step: 1}} value={TimeInMSToTimeInputStr(uiState.showRange_duration)} onChange={val=>uiState.showRange_duration = TimeInputStrToTimeInMS(val)}/>*/}
						<Text ml={5}>Start:</Text>
						<TextInput ml={5} type="datetime-local" {...{step: 1}}
							value={DateToDateTimeInputStr(new Date(uiState.showRange_start))} onChange={val=>RunInAction_Set(()=>uiState.showRange_start = new Date(val).valueOf())}/>
						<Button ml={5} p="5px 7px" text="-24hr" onClick={()=>RunInAction_Set(()=>uiState.showRange_start = Date.now() - (24 * 60 * 60 * 1000))}/>
						<Button ml={5} p="5px 7px" text="-6hr" onClick={()=>RunInAction_Set(()=>uiState.showRange_start = Date.now() - (6 * 60 * 60 * 1000))}/>
						<Button ml={5} p="5px 7px" text="-1hr" onClick={()=>RunInAction_Set(()=>uiState.showRange_start = Date.now() - (1 * 60 * 60 * 1000))}/>
						<Button ml={5} p="5px 7px" text="-10m" onClick={()=>RunInAction_Set(()=>uiState.showRange_start = Date.now() - (10 * 60 * 1000))}/>
						<Button ml={5} p="5px 7px" text="Now" onClick={()=>RunInAction_Set(()=>uiState.showRange_start = Date.now())}/>
						<CheckBox ml={5} text="End:" value={uiState.showRange_end_enabled} onChange={val=>RunInAction_Set(()=>uiState.showRange_end_enabled = val)}/>
						<TextInput ml={5} type="datetime-local" {...{step: 1}}
							value={DateToDateTimeInputStr(new Date(uiState.showRange_end))} onChange={val=>RunInAction_Set(()=>uiState.showRange_end = new Date(val).valueOf())}/>
						<Button ml={5} p="5px 7px" text="Now" onClick={()=>RunInAction_Set(()=>uiState.showRange_end = Date.now())}/>
						<Text ml={5}>Limit:</Text>
						<InfoButton ml={5} sel text="Limit happens from the end, going backward. (ie. limits result to the most recent X entries)"/>
						<Spinner ml={5} value={uiState.limit} onChange={val=>RunInAction_Set(this, ()=>uiState.limit = val)}/>

						<Text ml={5}>{`Note: Only logs printed to standard-out are captured atm.`}</Text>
					</Row>
					<Row>
						<Text ml={5}>Base query:</Text>
						<InfoButton ml={5} sel text="LoqQL cheatsheet: https://megamorf.gitlab.io/cheat-sheets/loki"/>
						<TextInput ml={5} style={{flex: 1}} value={uiState.query} onChange={val=>RunInAction_Set(this, ()=>uiState.query = val)}/>

						<Text ml={10}>Auto-appended:</Text>
						<InfoButton ml={5} sel text="LoqQL cheatsheet: https://megamorf.gitlab.io/cheat-sheets/loki"/>
						<TextInput ml={5} editable={false} style={{flex: 1}} value={""}/>
					</Row>
					<Row>Log entries (showing {logEntriesToShow.length} of {logEntries.length})</Row>
					<ScrollView className="selectable">
						{logEntriesToShow.map((entry, index)=>{
							return <LogEntryUI key={index} entry={entry.Cast(LogEntry_Stored).ToRealtimeEntry()}/>;
						})}
					</ScrollView>
				</Column>
		);
	}
}