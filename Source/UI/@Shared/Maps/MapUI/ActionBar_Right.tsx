import {Map, MapType} from "../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {GetUserID} from "Store/firebase/users";
import {BaseComponent, GetInnerComp, BaseComponentWithConnector} from "react-vextensions";
import {Row, Pre, Select} from "react-vcomponents";
import {Button} from "react-vcomponents";
import {ACTDebateMapSelect} from "../../../../Store/main/debates";
import MapDetailsUI from "../MapDetailsUI";
import {DropDown} from "react-vcomponents";
import {Column} from "react-vcomponents";
import UpdateMapDetails from "../../../../Server/Commands/UpdateMapDetails";
import {ShowMessageBox} from "react-vmessagebox";
import DeleteMap from "../../../../Server/Commands/DeleteMap";
import {colors} from "../../../../Frame/UI/GlobalStyles";
import {Spinner} from "react-vcomponents";
import {ACTSetInitialChildLimit, WeightingType} from "../../../../Store/main";
import {TextInput} from "react-vcomponents";
import { ShareDropDown } from "UI/@Shared/Maps/MapUI/ActionBar_Right/ShareDropDown";
import {LayoutDropDown} from "./ActionBar_Right/LayoutDropDown";
import { ShowChangesSinceType } from "Store/main/maps/@MapInfo";
import {GetEntries} from "../../../../Frame/General/Enums";
import {ACTSet} from "Store";

let changesSince_options = [];
changesSince_options.push({name: "None", value: ShowChangesSinceType.None + "_null"});
for (let offset = 1; offset <= 5; offset++) {
	let offsetStr = [null, "", "2nd ", "3rd ", "4th ", "5th "][offset];
	changesSince_options.push({name: `Your ${offsetStr}last visit`, value: ShowChangesSinceType.SinceVisitX + "_" + offset})
}
changesSince_options.push({name: "All unclicked changes", value: ShowChangesSinceType.AllUnseenChanges + "_null"});

let connector = (state, {map}: {map: Map, subNavBarWidth: number})=> ({
	showChangesSince_type: State(`main/maps/${map._id}/showChangesSince_type`) as ShowChangesSinceType,
	showChangesSince_visitOffset: State(`main/maps/${map._id}/showChangesSince_visitOffset`) as number,
	weighting: State(a=>a.main.weighting),
})
@Connect(connector)
export class ActionBar_Right extends BaseComponentWithConnector(connector, {}) {
	render() {
		let {map, subNavBarWidth, showChangesSince_type, showChangesSince_visitOffset, weighting} = this.props;
		let tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 0 10px",
				}}>
					<Row mr={5}>
						<Pre>Show changes since: </Pre>
						<Select options={changesSince_options} value={showChangesSince_type + "_" + showChangesSince_visitOffset} onChange={val=> {
							let parts = val.split("_");
							store.dispatch(new ACTSet(`main/maps/${map._id}/showChangesSince_type`, parseInt(parts[0])));
							store.dispatch(new ACTSet(`main/maps/${map._id}/showChangesSince_visitOffset`, FromJSON(parts[1])));
						}}/>
						<Pre ml={5}>Weighting: </Pre>
						<Select options={GetEntries(WeightingType, name=>({ReasonScore: "Reason score"})[name] || name)} value={weighting} onChange={val=> {
							store.dispatch(new ACTSet(a=>a.main.weighting, val));
						}}/>
					</Row>
					<ShareDropDown map={map}/>
					<LayoutDropDown/>
				</Row>
			</nav>
		);
	}
}