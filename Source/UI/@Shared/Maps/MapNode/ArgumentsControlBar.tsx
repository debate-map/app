import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "react-vextensions";
import {Pre, Row, TextArea_AutoSize, Button} from "react-vcomponents";
import {MapNode, MapNodeL3, ClaimForm, ChildEntry} from "../../../../Store/firebase/nodes/@MapNode";
import {SetNodeUILocked} from "UI/@Shared/Maps/MapNode/NodeUI";
import {WaitTillPathDataIsReceiving, WaitTillPathDataIsReceived} from "../../../../Frame/Database/DatabaseHelpers";
import {MapNodeType, GetNodeColor} from "../../../../Store/firebase/nodes/@MapNodeType";
import {MapNodeRevision, MapNodeRevision_titlePattern} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import AddChildNode from "../../../../Server/Commands/AddChildNode";
import {ACTMapNodeExpandedSet} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {ACTSetLastAcknowledgementTime} from "Store/main";
import keycode from "keycode";
import {GetErrorMessagesUnderElement} from "js-vextensions";
import chroma from "chroma-js";

/*@Connect((state, props)=> ({
}))*/
export class ArgumentsControlBar extends BaseComponent<{mapID: number, parentNode: MapNodeL3, parentPath: string, node: MapNodeL3} & Partial<{}>, {}> {
	static defaultState = {premiseTitle: ""};
	render() {
		let {mapID, parentNode, parentPath, node} = this.props;
		let backgroundColor = GetNodeColor(node);

		return (
			<Row className="argumentsControlBar" style={{
				alignSelf: "flex-start", position: "relative", alignItems: "stretch", padding: "5px 0px", background: backgroundColor.css(), borderRadius: 5,
				boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
			}}>
				<Pre>Show: </Pre>
				<Button text="Top"/>
				<Button text="New"/>
			</Row>
		);
	}
}

export class AddArgumentsRow extends BaseComponent<{}, {}> {
	render() {
		return (
			<Row style={{alignItems: "stretch", padding: "5px 0px"}}>
				<Button enabled={true} text="Add supporting argument" p="0 3px" style={{borderRadius: "0 5px 5px 0"}}/>
				<Button enabled={true} text="Add opposing argument" p="0 3px" style={{borderRadius: "0 5px 5px 0"}}/>
			</Row>
		);
	}
}