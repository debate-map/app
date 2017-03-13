import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {BaseComponent, FirebaseDatabase} from "../../Frame/UI/ReactGlobals";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {connect} from "react-redux";
import {Map} from "../@Shared/Maps/Map";
import MapUI from "../@Shared/Maps/MapUI";
var ScrollView = require("react-free-scrollbar").default;

@firebaseConnect([
	DBPath("maps/1"),
])
@(connect(({firebase}: {firebase: FirebaseDatabase})=> ({
	map: helpers.dataToJS(firebase, DBPath("maps/1")),
})) as any)
export default class GlobalMapUI extends BaseComponent<{map: Map}, {}> {
	render() {
		let {map} = this.props;
		return (
			<MapUI map={map}/>
		);
	}
}