import React from "react";
import {store} from "Store";
import {Observer, RunInAction_Set} from "web-vcore";
import {GetEntries, ModifyString} from "web-vcore/nm/js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {LogGroupsUI} from "./Logs/LogGroupsUI.js";
import {LogsUI_Realtime} from "./Logs/Realtime.js";
import {LogsUI_Stored} from "./Logs/Stored.js";

@Observer
export class LogsUI extends BaseComponent<{}, {}> {
	render() {
		const uiState = store.main.logs;

		return (
				<Column style={{flex: 1, height: "100%"}}>
					<Row mb={5}>
						<Select displayType="button bar" options={{Stored: "stored", Realtime: "realtime"}}
							value={uiState.panel} onChange={val=>RunInAction_Set(this, ()=>uiState.panel = val)}/>
						<Row ml="auto">
							{uiState.panel == "realtime" && // atm, the Groups panel only applies for the Realtime panel
							<DropDown autoHide={false}>
								<DropDownTrigger><Button style={{height: "100%"}} text="Groups"/></DropDownTrigger>
								<DropDownContent style={{zIndex: 1, position: "fixed", right: 0, width: 1000, borderRadius: "0 0 0 5px"}}>
									<LogGroupsUI/>
								</DropDownContent>
							</DropDown>}
						</Row>
					</Row>
					{uiState.panel == "stored" && <LogsUI_Stored/>}
					{uiState.panel == "realtime" && <LogsUI_Realtime/>}
				</Column>
		);
	}
}