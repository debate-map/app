import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUsers, GetUserExtraInfoMap, UserExtraInfoMap, User, GetUserID, GetUserPermissionGroups} from "../Store/firebase/users";
import Row from "../Frame/ReactComponents/Row";
import UserExtraInfo from "../Store/firebase/userExtras/@UserExtraInfo";
import Moment from "moment";
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";
import { GetSections, GetSubforums, GetSectionSubforums } from "Store/firebase/forum";
import {Section} from "../Store/firebase/forum/@Section";
import {Subforum} from "../Store/firebase/forum/@Subforum";
import {URL} from "../Frame/General/URLs";
import {ACTSubforumSelect, GetSelectedSubforum} from "../Store/main/forum";
import {SubforumUI} from "./Forum/SubforumUI";
import {IsUserMod} from "../Store/firebase/userExtras";
import Button from "Frame/ReactComponents/Button";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {ShowAddSectionDialog} from "./Forum/AddSectionDialog";
import {ShowAddSubforumDialog} from "./Forum/AddSubforumDialog";

export const columnWidths = [1];

@Connect(state=> ({
	_: GetUserPermissionGroups(GetUserID()),
	sections: GetSections(),
	selectedSubforum: GetSelectedSubforum(),
}))
export default class ForumUI extends BaseComponent<{} & Partial<{sections: Section[], selectedSubforum: Subforum}>, {}> {
	render() {
		let {sections, selectedSubforum} = this.props;

		if (selectedSubforum) {
			return <SubforumUI subforum={selectedSubforum}/>;
		}

		let userID = GetUserID();
		let isMod = IsUserMod(userID);
		return (
			<Column style={{width: 960, margin: "20px auto 20px auto", height: "calc(100% - 40px)", filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"}}>
				<Column className="clickThrough" style={{height: 40, background: "rgba(0,0,0,.7)", borderRadius: 10}}>
					<Row style={{height: 40, padding: 10}}>
						{isMod &&
							<Button text="Add section" ml="auto" onClick={()=> {
								if (userID == null) return ShowSignInPopup();
								ShowAddSectionDialog(userID);
							}}/>}
					</Row>
				</Column>
				<ScrollView contentStyle={{flex: 1}}>
					{sections.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{sections.map((section, index)=> {
						return <SectionUI key={index} section={section}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}

type SectionUI_Props = {section: Section} & Partial<{subforums: Subforum[]}>;
@Connect((state, {section}: SectionUI_Props)=> ({
	subforums: GetSectionSubforums(section),
}))
class SectionUI extends BaseComponent<SectionUI_Props, {}> {
	render() {
		let {section, subforums} = this.props;
		let userID = GetUserID();
		return (
			<Column style={{width: 960, margin: "20px auto 20px auto"}}>
				<Column className="clickThrough" style={{height: 80, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
					<Row style={{height: 40, padding: 10, fontSize: 18}}>
						{section.name}
						<Button text="Add subforum" ml="auto" onClick={()=> {
							if (userID == null) return ShowSignInPopup();
							ShowAddSubforumDialog(userID, section._id);
						}}/>
					</Row>
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Name</span>
					</Row>
				</Column>
				<Column>
					{subforums.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{subforums.map((subforum, index)=> {
						return <SubforumEntryUI key={subforum._id} index={index} last={index == subforums.length - 1} subforum={subforum}/>;
					})}
				</Column>
			</Column>
		);
	}
}

class SubforumEntryUI extends BaseComponent<{index: number, last: boolean, subforum: Subforum}, {}> {
	render() {
		let {index, last, subforum} = this.props;
		let toURL = new URL(null, [subforum._id+""]);
		return (
			<Column p="7px 10px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					<a href={toURL.toString({domain: false})} style={{fontSize: 18, flex: columnWidths[0]}} onClick={e=> {
						e.preventDefault();
						store.dispatch(new ACTSubforumSelect({id: subforum._id}));
					}}>
						{subforum.name}
					</a>
				</Row>
			</Column>
		);
	}
}