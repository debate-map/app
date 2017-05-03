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
import { ACTTermSelect, GetSelectedTermID } from "../../Store/main";

@Connect(state=> ({
	terms: GetTerms(),
	permissions: GetUserPermissionGroups(GetUserID()),
}))
export default class TermsUI extends BaseComponent<{} & Partial<{terms: Term[], permissions: PermissionGroupSet}>, {}> {
	scrollView: ScrollView;
	render() {
		let {terms, permissions} = this.props;
		if (terms == null) return <div>Loading terms...</div>;
		let userID = GetUserID();
		
		return (
			<Row p="10px 7px" style={{height: "100%"}}>
				<Column style={{flex: .4, height: "100%"}} onClick={e=> {
					if (e.target == e.currentTarget || e.target == FindDOM(this.scrollView.refs.content)) {
						store.dispatch(new ACTTermSelect({id: null}));
					}
				}}>
					<ScrollView ref={c=>this.scrollView = c} style={{flex: 1}}>
						{terms.map((term, index)=> {
							return <TermUI key={index} first={index == 0} term={term}/>;
						})}
					</ScrollView>
					<Button text="Add term" style={{alignSelf: "flex-start"}} onClick={e=> {
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();

						ShowAddTermDialog(userID);
					}}/>
				</Column>
				<Column style={{flex: .6, height: "100%"}}>
				</Column>
			</Row>
		);
	}
}

type TermUI_Props = {term: Term, first: boolean} & Partial<{selected: boolean}>;
@Connect((state, props: TermUI_Props)=> ({
	selected: GetSelectedTermID() == props.term._id,
}))
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