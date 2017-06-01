import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {Route} from "react-router-dom";
import GlobalMapUI from "./Global/GlobalMapUI";
import ScrollView from "react-vscrollview";
import GlobalListUI from "./Global/GlobalListUI";
import Column from "../Frame/ReactComponents/Column";
import {Connect} from "../Frame/Database/FirebaseConnect";
import Switch from "Frame/ReactComponents/Switch";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.global.subpage),
}))
export default class GlobalUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "global";
		return (
			<Column style={{height: "100%"}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="map" text="Map"/>
					<SubNavBarButton {...{page}} subpage="list" text="List"/>
				</SubNavBar>
				<Switch>
					{currentSubpage == "list" && <GlobalListUI/>}
					<GlobalMapUI/>
				</Switch>
			</Column>
		);
	}
}