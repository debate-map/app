import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Timeline, MeID, TimelineStep} from "dm_common";
import {RunCommand_AddTimeline, RunCommand_AddTimelineStep} from "Utils/DB/Command.js";
import {TimelineDetailsUI} from "./TimelineDetailsUI.js";

const defaultIntroMessage = `
Welcome to the Debate Map platform.

The purpose of this site is to "map" debates and discussions into a tree-based format, where it's easier to analyze the logic behind each argument.

One of these maps has been created for an existing conversation, which took place at: [enter url here]

Continue to the next step to begin displaying the comments made by those involved, and examining their logical connections with each other.
`.trim();

export function ShowAddTimelineDialog(userID: string, mapID: string) {
	let newTimeline = new Timeline({
		mapID,
		name: "",
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
			});
			RunCommand_AddTimelineStep(step);
		},
	});
}