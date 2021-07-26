import {GetUserHidden, Me, MeID, SetUserData_Hidden, GetCommandRuns, CommandRun} from "dm_common";
import React from "react";
import {store} from "Store";
import {HSLA, InfoButton, Observer, RunInAction_Set, TextPlus} from "web-vcore";
import {CheckBox, Column, Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {ScrollView} from "web-vcore/nm/react-vscrollview";

@Observer
export class StreamUI extends BaseComponentPlus({panel: false} as {panel?: boolean}, {}) {
	render() {
		const {panel} = this.props;
		const userHidden = GetUserHidden(MeID());
		const commandRuns = GetCommandRuns(undefined, store.main.social.showAll);

		return (
			<Column>
				<Row center mb={5}>
					<Text>Recent changes:</Text>
					<CheckBox ml="auto" text="Add to stream:" enabled={userHidden != null} value={userHidden?.addToStream ?? false} onChange={val=>{
						new SetUserData_Hidden({id: MeID()!, updates: {addToStream: val}}).RunOnServer();
					}}/>
					<InfoButton ml={5} text="When enabled, contributions you make to maps and such will be shown publicly on the Social page and Stream panel."/>
					{Me()?.permissionGroups.admin && <>
						<CheckBox ml={10} text="Show all:" value={store.main.social.showAll} onChange={val=>RunInAction_Set(this, ()=>store.main.social.showAll = val)}/>
						<InfoButton ml={5} text="When enabled, private contributions are also shown in the UI. (admin-only option)"/>
					</>}
				</Row>
				<ScrollView>
					{commandRuns.map((run, index)=>{
						return <CommandRunUI key={index} run={run} index={index} last={index == commandRuns.length - 1}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}

class CommandRunUI extends BaseComponentPlus({} as {run: CommandRun, index: number, last: boolean}, {}) {
	render() {
		const {run, index, last} = this.props;
		return (
			<Row mt={index > 0 ? 5 : 0} style={{background: HSLA(0, 0, 1, .5), borderRadius: 5, whiteSpace: "pre-wrap"}}>
				{JSON.stringify(run, null, 2)}
			</Row>
		);
	}
}