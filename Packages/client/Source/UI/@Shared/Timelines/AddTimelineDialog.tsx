import {Column, Row} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {Timeline, MeID, TimelineStep, GetUserHidden, GetSystemAccessPolicyID, OrderKey, GetFinalAccessPolicyForNewEntry} from "dm_common";
import {RunCommand_AddTimeline, RunCommand_AddTimelineStep} from "Utils/DB/Command.js";
import {GetAsync} from "mobx-graphlink";
import {TimelineDetailsUI} from "./TimelineDetailsUI.js";
import React from "react";

const defaultIntroMessage = `
Welcome to the Debate Map platform.

The purpose of this site is to "map" debates and discussions into a tree-based format, where it's easier to analyze the logic behind each argument.

One of these maps has been created for an existing conversation, which took place at: [enter url here]

Continue to the next step to begin displaying the comments made by those involved, and examining their logical connections with each other.
`.trim();

export async function ShowAddTimelineDialog(userID: string, mapID: string) {
	const prep = await GetAsync(()=>{
		return {
			accessPolicy: GetFinalAccessPolicyForNewEntry(null, null, "timelines"),
		};
	});

	let newTimeline = new Timeline({
		mapID,
		name: "",
		accessPolicy: prep.accessPolicy.id,
	});

	let error = null;
	const Change = (..._)=>boxController.UpdateUI();
	const boxController: BoxController = ShowMessageBox({
		title: "Add timeline", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: error == null};
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<TimelineDetailsUI baseData={newTimeline} forNew={true} onChange={(val, ui)=>Change(newTimeline = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: async()=>{
			const timelineID = (await RunCommand_AddTimeline(newTimeline)).id;
			const step = new TimelineStep({
				timelineID,
				message: defaultIntroMessage.trim(),
				orderKey: OrderKey.mid().toString(),
				groupID: "full",
			});
			RunCommand_AddTimelineStep(step);
		},
	});
}
