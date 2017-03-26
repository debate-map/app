import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";
import {Route} from "react-router-dom";
import GlobalMapUI from "./Global/GlobalMapUI";
import ScrollView from "react-vscrollview";

@firebaseConnect()
export default class GlobalUI extends BaseComponent<{} & BaseProps, {}> {
	render() {
		return (
			<div style={{height: "100%"}}>
				{/*<SubNavbar fullWidth={true}>*/}
				<SubNavbar>
					<SubNavBarButton to="/global" text="Map"/>
					<SubNavBarButton to="/global/list" text="List"/>
				</SubNavbar>
				{/*<ScrollView style={{flex: "1 1 100%"}} scrollVBarStyle={{width: 10}}>*/}
				<Route path="/global" component={GlobalMapUI}/>
				<Route path="/global/list" component={()=><div/>}/>
				{/*</ScrollView>*/}
			</div>
		);
	}
}