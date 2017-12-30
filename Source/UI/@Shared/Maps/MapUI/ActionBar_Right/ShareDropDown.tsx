import {Map} from "../../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "react-vextensions";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {DropDown, RowLR, DropDownTrigger, DropDownContent, Pre} from "react-vcomponents";
import {Button} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {Column} from "react-vcomponents";
import ScrollView from "react-vscrollview";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {GetMapTimelines, GetTimeline, GetTimelineSteps} from "../../../../../Store/firebase/timelines";
import {Timeline} from "../../../../../Store/firebase/timelines/@Timeline";
import {ShowAddTimelineDialog} from "../../../Timelines/AddTimelineDialog";
import { ACTMap_SelectedTimelineSet } from "Store/main/maps/$map";
import AddTimelineStep from "Server/Commands/AddTimelineStep";
import {Select} from "react-vcomponents";
import {UpdateTimelineStep} from "../../../../../Server/Commands/UpdateTimelineStep";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RemoveHelpers} from "../../../../../Frame/Database/DatabaseHelpers";
import DeleteTimelineStep from "Server/Commands/DeleteTimelineStep";
import DeleteTimeline from "../../../../../Server/Commands/DeleteTimeline";
import {TextInput} from "react-vcomponents";
import {URL, GetCurrentURL} from "../../../../../Frame/General/URLs";
import {GetNewURL} from "Frame/URL/URLManager";
import { CopyText } from "Frame/General/Globals_Free";
import {WaitXThenRun} from "../../../../../Frame/General/Timers";

type ShareDropDownProps = {map: Map} & Partial<{newURL: URL, timelines: Timeline[]}>;
@Connect((state, {map}: ShareDropDownProps)=> ({
	newURL: GetNewURL(),
	timelines: GetMapTimelines(map),
}))
export class ShareDropDown extends BaseComponent<ShareDropDownProps, {timeline: Timeline, justCopied: boolean}> {
	render() {
		let {map, newURL, timelines} = this.props;
		let {timeline, justCopied} = this.state;

		newURL.queryVars.Clear();
		newURL.domain = GetCurrentURL(true).domain;
		if (timeline) {
			newURL.SetQueryVar("timeline", timeline._id);
		}

		let splitAt = 130;
		return (
			<DropDown>
				<DropDownTrigger><Button mr={5} text="Share"/></DropDownTrigger>
				<DropDownContent style={{right: 0, width: 400}}>
					<Column>
						<RowLR splitAt={splitAt}>
							<Pre>URL: </Pre>
							<Row style={{width: "100%"}}>
								<TextInput value={newURL.toString({domain: true})} readOnly={true} style={{flex: .75}}/>
								<Button text={justCopied ? "Copied!" : "Copy"} ml={5} style={{flex: ".25 0 auto"}} onClick={()=> {
									CopyText(newURL.toString({domain: true}));
									this.SetState({justCopied: true});
									WaitXThenRun(1000, ()=>this.SetState({justCopied: false}));
								}}/>
							</Row>
						</RowLR>
						<RowLR mt={5} splitAt={splitAt}>
							<Pre>Show timeline: </Pre>
							<Select options={[{name: "None", value: null} as any].concat(timelines)} value={timeline} onChange={val=>this.SetState({timeline: val})}/>
						</RowLR>
					</Column>
				</DropDownContent>
			</DropDown>
		);
	}
}