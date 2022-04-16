import React from "react";
import {store} from "Store/index.js";
import {LogGroup} from "Store/main/logs/LogGroup";
import {LogEntry} from "UI/Logs.js";
import {ES, Observer} from "web-vcore";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class LogEntryUI extends BaseComponent<{entry: LogEntry}, {}> {
	render() {
		const {entry} = this.props;
		const uiState = store.main.logs;
		const highlightGroup = uiState.groups.filter(group=>group.enabled && group.highlight && LogGroup.Matches(group, entry)).LastOrX(); // have later matching groups take priority

		return (
			<Column style={ES(
				highlightGroup != null && {background: highlightGroup.highlightColor},
			)}>
				<Row>{new Date(entry.time).toLocaleString("sv")}: {entry.message}</Row>
			</Column>
		);
	}
}