import {Div, BaseComponent} from "../../Frame/UI/ReactGlobals";
import {styles} from "../../Frame/UI/GlobalStyles";
import {MapNode, MapNodeEnhanced, globalMapID} from "../../Store/firebase/nodes/@MapNode";
import Row from "Frame/ReactComponents/Row";
import NodeUI from "../@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../Store/firebase/maps/@Map";
import { Connect } from "../../Frame/Database/FirebaseConnect";
import { GetMap } from "Store/firebase/maps";
import { GetSelectedNode_InList, ACTSelectedNode_InListSet } from "../../Store/main/maps/$map";
import ListUI from "UI/@Shared/Maps/ListUI";

type Props = {
} & Partial<{
	map: Map,
}>;
@Connect(state=> ({
	map: GetMap(globalMapID),
}))
export default class GlobalListUI extends BaseComponent<Props, {panelToShow}> {
	render() {
		let {map} = this.props;
		if (map == null) return null;
		return (
			<ListUI map={map}/>
		);
	}
}