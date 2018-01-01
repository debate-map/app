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
import {GetCurrentURL} from "../../../../../Frame/General/URLs";
import {VURL} from "js-vextensions";
import {GetNewURL} from "Frame/URL/URLManager";
import {ACTSetInitialChildLimit} from "../../../../../Store/main";
import {Spinner} from "react-vcomponents";

type Props = {} & Partial<{initialChildLimit: number}>;
@Connect((state, props)=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
}))
export class LayoutDropDown extends BaseComponent<Props, {}> {
	render() {
		let {initialChildLimit} = this.props;
		let splitAt = 120;
		return (
			<DropDown>
				<DropDownTrigger><Button text="Layout"/></DropDownTrigger>
				<DropDownContent style={{right: 0, width: 300}}><Column>
					<RowLR splitAt={splitAt}>
						<Pre>Initial child limit: </Pre>
						<Spinner min={1} value={initialChildLimit} onChange={val=>store.dispatch(new ACTSetInitialChildLimit({value: val}))}/>
					</RowLR>
				</Column></DropDownContent>
			</DropDown>
		);
	}
}