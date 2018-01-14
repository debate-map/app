import {BaseComponent, BaseProps} from "react-vextensions";
import {firebaseConnect} from "react-redux-firebase";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import GlobalMapUI from "./Global/GlobalMapUI";
import {ScrollView} from "react-vscrollview";
import GlobalListUI from "./Global/GlobalListUI";
import {Column} from "react-vcomponents";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {Switch} from "react-vcomponents";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.global.subpage),
}))
export default class GlobalUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "global";
		return (
			<Column style={{flex: 1}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="map" text="Map"/>
					{/*<SubNavBarButton {...{page}} subpage="list" text="List"/>*/}
				</SubNavBar>
				<Switch>
					<GlobalMapUI/>
					{currentSubpage == "list" && <GlobalListUI/>}
				</Switch>
			</Column>
		);
	}
}