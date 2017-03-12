import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";
import {Route} from "react-router-dom";
var ScrollView = require("react-free-scrollbar").default;

@firebaseConnect()
export default class GlobalUI extends BaseComponent<{} & BaseProps, {}> {
	render() {
		return (
			<div>
				{/*<SubNavbar fullWidth={true}>*/}
				<SubNavbar>
					<SubNavBarButton to="/global/map" text="Map"/>
					<SubNavBarButton to="/global/list" text="List"/>
				</SubNavbar>
				<ScrollView style={{flex: "1 1 100%"}} scrollVBarStyles={{width: 10}}>
					<Route path="/global/map" component={()=><div/>}/>
					<Route path="/global/list" component={()=><div/>}/>
				</ScrollView>
			</div>
		);
	}
}