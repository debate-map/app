import React from "react";
import {store} from "Store";
import {Observer, RunInAction_Set} from "web-vcore";
import {GetEntries, ModifyString} from "web-vcore/nm/js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {LogGroupsUI} from "./Logs/LogGroupsUI";
import {LogsUI_Realtime} from "./Logs/Realtime";
import {LogsUI_Stored} from "./Logs/Stored";

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
					{uiState.panel == "stored" && <LogsUI_Stored/>}
					{uiState.panel == "realtime" && <LogsUI_Realtime/>}
				</Column>
		);
	}
}