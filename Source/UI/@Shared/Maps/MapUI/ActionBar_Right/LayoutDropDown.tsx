import {Map} from "../../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent, Pre} from "../../../../../Frame/UI/ReactGlobals";
import {GetUserID} from "Store/firebase/users";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import DropDown from "../../../../../Frame/ReactComponents/DropDown";
import {DropDownTrigger, DropDownContent} from "../../../../../Frame/ReactComponents/DropDown";
import Button from "Frame/ReactComponents/Button";
import Row from "Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import ScrollView from "react-vscrollview";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {GetMapTimelines, GetTimeline, GetTimelineSteps} from "../../../../../Store/firebase/timelines";
import {Timeline} from "../../../../../Store/firebase/timelines/@Timeline";
import {ShowAddTimelineDialog} from "../../../Timelines/AddTimelineDialog";
import { ACTMap_SelectedTimelineSet } from "Store/main/maps/$map";
import AddTimelineStep from "Server/Commands/AddTimelineStep";
import Select from "../../../../../Frame/ReactComponents/Select";
import {UpdateTimelineStep} from "../../../../../Server/Commands/UpdateTimelineStep";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RemoveHelpers} from "../../../../../Frame/Database/DatabaseHelpers";
import DeleteTimelineStep from "Server/Commands/DeleteTimelineStep";
import DeleteTimeline from "../../../../../Server/Commands/DeleteTimeline";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import {URL, GetCurrentURL} from "../../../../../Frame/General/URLs";
import {GetNewURL} from "Frame/URL/URLManager";
import {RowLR} from "../../../../../Frame/ReactComponents/Row";
import {ACTSetInitialChildLimit} from "../../../../../Store/main";
import Spinner from "../../../../../Frame/ReactComponents/Spinner";

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