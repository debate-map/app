import {BaseComponent, RouteProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import {Route} from "react-router";
import AdminUI from "./More/Admin";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";

@firebaseConnect()
export default class MoreUI extends BaseComponent<{page?} & RouteProps, {}> {
	render() {
		let {page, children, match} = this.props;
		return (
			<div>
				<SubNavbar>
					<SubNavBarButton to={`${match.url}/admin`} text="Admin"/>
				</SubNavbar>
				<Route path={`${match.url}/admin`} component={AdminUI}/>
			</div>
		);
	}
}