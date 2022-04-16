import React from "react";
import {store} from "Store/index.js";
import {LogEntry} from "UI/Logs.js";
import {Observer} from "web-vcore";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class LogEntryUI extends BaseComponent<{entry: LogEntry}, {}> {
	render() {
		const {entry} = this.props;
		const uiState = store.main.logs;

		return (
			<Column>
				<Row>{new Date(entry.time).toLocaleString("sv")}: {entry.message}</Row>
			</Column>
		);
	}
}