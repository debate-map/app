import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {Route, Switch} from "react-router-dom";
import GlobalMapUI from "./Global/GlobalMapUI";
import ScrollView from "react-vscrollview";
import GlobalListUI from "./Global/GlobalListUI";
import Column from "../Frame/ReactComponents/Column";

export default class GlobalUI extends BaseComponent<{}, {}> {
	render() {
		//let {match: {url: path} = {} as any} = this.props;
		let path = "/global";
		return (
			<Column style={{height: "100%"}}>
				<SubNavBar>
					<SubNavBarButton to={path} toImplied={path + "/map"} text="Map"/>
					<SubNavBarButton to={path + "/list"} text="List"/>
				</SubNavBar>
				<Switch>
					<Route path={path + "/list"} component={GlobalListUI}/>
					<Route component={GlobalMapUI}/>
				</Switch>
			</Column>
		);
	}
}