import {GetUser, GetUserID} from "../../../Store/firebase/users";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import AddTerm from "../../../Server/Commands/AddTerm";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import AddMap from "../../../Server/Commands/AddMap";
import {Layer} from "Store/firebase/layers/@Layer";
import TimelineDetailsUI from "./TimelineDetailsUI";
import AddTimeline from "../../../Server/Commands/AddTimeline";
import {Timeline} from "../../../Store/firebase/timelines/@Timeline";
import { TimelineStep } from "Store/firebase/timelineSteps/@TimelineStep";
import AddTimelineStep from "Server/Commands/AddTimelineStep";

let defaultIntroMessage = `
Welcome to the Debate Map platform.

The purpose of this site is to "map" debates and discussions into a tree-based format, where it's easier to analyze the logic behind each argument.

One of these maps has been created for an existing conversation, which took place at: [enter url here]

Continue to the next step to begin displaying the comments made by those involved, and examining their logical connections with each other.
`.trim();

export function ShowAddTimelineDialog(userID: string, mapID: number) {
	let newTimeline = new Timeline({
		name: "",
		creator: GetUserID(),
	});
	
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add timeline`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TimelineDetailsUI baseData={newTimeline} forNew={true} onChange={(val, ui)=>Change(newTimeline = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: async ()=> {
			let timelineID = await new AddTimeline({mapID, timeline: newTimeline}).Run();
			let step = new TimelineStep({
				message: defaultIntroMessage.trim(),
			});
			new AddTimelineStep({timelineID, step}).Run();
		}
	});
}