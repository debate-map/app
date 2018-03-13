import {firebaseConnect, helpers} from "react-redux-firebase";
import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";
import {DBPath, GetData} from "../../Frame/Database/DatabaseHelpers";
import {connect} from "react-redux";
import {MapUI} from "../@Shared/Maps/MapUI";
import {Debugger, Debugger_Wrap} from "../../Frame/General/Globals_Free";
import {ScrollView} from "react-vscrollview";
import {RootState} from "../../Store/index";
import {Map} from "../../Store/firebase/maps/@Map";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetMap} from "../../Store/firebase/maps";

type Props = {} & Partial<{map: Map}>;
@Connect(state=> ({
	map: GetMap(1),
}))
export default class GlobalMapUI extends BaseComponent<Props, {}> {
	render() {
		let {map} = this.props;
		return (
			<MapUI map={map} subNavBarWidth={/*104*/ 54}/>
		);
	}
}