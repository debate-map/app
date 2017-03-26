import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {BaseComponent, FirebaseDatabase, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import {DBPath, GetData} from "../../Frame/Database/DatabaseHelpers";
import {connect} from "react-redux";
import {Map} from "../@Shared/Maps/Map";
import MapUI from "../@Shared/Maps/MapUI";
import {Debugger} from "../../Frame/General/Globals_Free";
import {P} from "../../Frame/Serialization/VDF/VDFTypeInfo";
import ScrollView from "react-vscrollview";
import {RootState} from "../../store/Root";

@firebaseConnect([
	DBPath("maps/e1"),
])
@(connect(({firebase}: RootState)=> ({
	//map: helpers.dataToJS(firebase, DBPath("maps/e1")),
	map: GetData(firebase, "maps/e1"),
})) as any)
export default class GlobalMapUI extends BaseComponent<{map: Map}, {}> {
	render() {
		let {map} = this.props;
		return (
			<MapUI map={map}/>
		);
	}
}