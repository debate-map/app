import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate, FindDOM} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import Button from "../../Frame/ReactComponents/Button";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetTerms} from "../../Store/firebase/terms";
import {Term} from "../../Store/firebase/terms/@Term";
import {PermissionGroupSet} from "../../Store/firebase/userExtras/@UserExtraInfo";
import {GetUserPermissionGroups, GetUserID} from "../../Store/firebase/users";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";
import {ShowAddTermDialog} from "./Terms/AddTermDialog";
import { ACTTermSelect, GetSelectedTermID, GetSelectedTerm } from "../../Store/main";
import TermEditorUI from "./Terms/TermEditorUI";
import {RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import UpdateNodeDetails from "../../Server/Commands/UpdateNodeDetails";
import UpdateTermData from "../../Server/Commands/UpdateTermData";

@Connect(state=> ({
	terms: GetTerms(),
	selectedTerm: GetSelectedTerm(),
	permissions: GetUserPermissionGroups(GetUserID()),
}))
export default class TermsUI extends BaseComponent
		<{} & Partial<{terms: Term[], selectedTerm: Term, permissions: PermissionGroupSet}>,
		{selectedTerm_newData: Term}> {
	ComponentWillReceiveProps(props) {
		if (props.selectedTerm != this.props.selectedTerm) {
			this.SetState({selectedTerm_newData: null});
		}
	}

	scrollView: ScrollView;
	render() {
		let {terms, selectedTerm, permissions} = this.props;
		if (terms == null) return <div>Loading terms...</div>;
		let userID = GetUserID();
		let {selectedTerm_newData} = this.state;
		
		return (
			<Row p="10px 7px" style={{height: "100%"}}>
				<Column style={{flex: .4, height: "100%"}} onClick={e=> {
					if (e.target == e.currentTarget || e.target == FindDOM(this.scrollView.refs.content)) {
						store.dispatch(new ACTTermSelect({id: null}));
					}
				}}>
					<ScrollView ref={c=>this.scrollView = c} style={{flex: 1}}>
						{terms.map((term, index)=> {
							return <TermUI key={index} first={index == 0} term={term} selected={selectedTerm == term}/>;
						})}
					</ScrollView>
					<Button text="Add term" style={{alignSelf: "flex-start"}} onClick={e=> {
						if (userID == null) return ShowSignInPopup();
						ShowAddTermDialog(userID);
					}}/>
				</Column>
				<Column pl={10} style={{flex: .6, height: "100%"}}>
					{selectedTerm &&
						<TermEditorUI startData={selectedTerm} onChange={data=>this.SetState({selectedTerm_newData: data})}/>}
					<Button mt={5} text="Save term" style={{alignSelf: "flex-start"}} enabled={selectedTerm_newData != null} onClick={async e=> {
						//if (selectedTerm_newData == null) return; // no changes made
						if (userID == null) return ShowSignInPopup();
						let updates = RemoveHelpers(E(
							{name: selectedTerm_newData.name, shortDescription_current: selectedTerm_newData.shortDescription_current}
						));
						await new UpdateTermData({termID: selectedTerm._id, updates}).Run();
					}}/>
				</Column>
			</Row>
		);
	}
}

type TermUI_Props = {term: Term, first: boolean, selected: boolean};
export class TermUI extends BaseComponent<TermUI_Props, {}> {
	render() {
		let {term, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5}
					style={E(
						{padding: 5, background: "rgba(150,150,150,.5)", borderRadius: 5, cursor: "pointer", justifyContent: "space-between"},
						selected && {background: "rgba(150,150,150,.7)"},
					)}
					onClick={e=> {
						store.dispatch(new ACTTermSelect({id: term._id}));
					}}>
				{term.name} ({term.shortDescription_current})
				<span>#{term._id}</span>
			</Row>
		);
	}
}