import chroma from "chroma-js";
import React from "react";
import {store} from "Store/index.js";
import {LogGroup} from "Store/main/logs/LogGroup";
import {LogEntry} from "UI/Logs/Realtime.js";
import {Chroma, ES, InfoButton, Observer} from "web-vcore";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class LogEntryUI extends BaseComponent<{entry: LogEntry}, {}> {
	render() {
		const {entry} = this.props;
		const uiState = store.main.logs;
		const highlightGroup = uiState.groups.filter(group=>group.enabled && group.highlight && LogGroup.Matches(group, entry)).LastOrX(); // have later matching groups take priority

		return (
			<Row style={ES(
				highlightGroup != null && {background: highlightGroup.highlightColor},
			)}>
				{/*<Row style={{alignSelf: "flex-start", border: "1px solid black"}}>*/}
				<Row center style={{whiteSpace: "pre"}}>
					<Row style={{width: 130, justifyContent: "center"}}>{new Date(entry.time).toLocaleString("sv")}</Row>
					<Row ml={5} style={{width: 50, justifyContent: "center", background: GetLevelColor(entry.level)}}>{entry.level}</Row>
					<InfoButton ml={5} text={`@target:${entry.target}\n@spanName:${entry.spanName}`}/>
				</Row>
				<Row ml={5}>{entry.message}</Row>
			</Row>
		);
	}
}

function GetLevelColor(level: string): string {
	if (level == "ERROR") return "red";
	if (level == "WARN") return "orange";
	if (level == "INFO") return "green";
	if (level == "DEBUG") return chroma.mix(Chroma("green"), "white", .33).css();
	if (level == "TRACE") return chroma.mix(Chroma("green"), "white", .66).css();
	return "transparent";
}