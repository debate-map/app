import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {Route} from "react-router-dom";
import GlobalMapUI from "./Global/GlobalMapUI";
import ScrollView from "react-vscrollview";
import {GetPathNodes} from "../Store/router";
import GlobalListUI from "./Global/GlobalListUI";

export default class GlobalUI extends BaseComponent<{} & BaseProps, {}> {
	render() {
		//let {match: {url: path} = {} as any} = this.props;
		let path = "/global";
		return (
			<div style={{height: "100%"}}>
				{/*<SubNavbar fullWidth={true}>*/}
				<SubNavBar>
					<SubNavBarButton to={path} toImplied={path + "/map"} text="Map"/>
					<SubNavBarButton to={path + "/list"} text="List"/>
				</SubNavBar>
				{/*<ScrollView style={{flex: "1 1 100%"}} scrollVBarStyle={{width: 10}}>*/}
				<Route path={path} exact={true} component={GlobalMapUI}/>
				<Route path={path + "/list"} component={GlobalListUI}/>
				{/*</ScrollView>*/}
			</div>
		);
	}
}