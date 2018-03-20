import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "react-vextensions";
import {Pre, Row, TextArea_AutoSize, Button, Select, Column} from "react-vcomponents";
import {MapNode, MapNodeL3, ClaimForm, ChildEntry, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
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
import {Map} from "Store/firebase/maps/@Map";
import {AddArgumentButton} from "UI/@Shared/Maps/MapNode/NodeUI/AddArgumentButton";

export class ArgumentsControlBar extends BaseComponent<{map: Map, parentNode: MapNodeL3, parentPath: string, node: MapNodeL3} & Partial<{}>, {}> {
	static defaultState = {premiseTitle: ""};
	render() {
		let {map, parentNode, parentPath, node} = this.props;
		let backgroundColor = GetNodeColor({type: MapNodeType.Category} as MapNodeL3);

		return (
			<Row className="argumentsControlBar clickThrough">
				{/*<Row style={{
					/*alignSelf: "flex-start",*#/ position: "relative", background: backgroundColor.css(), borderRadius: 5,
					boxShadow: "rgba(0,0,0,1) 0px 0px 2px", alignSelf: "stretch",
					padding: "0 5px",
					//paddingLeft: 5,
				}}>
					<Pre>Sort by: </Pre>
					<Select options={["Ratings", "Recent"]} style={{borderRadius: 5, outline: "none"}} value={"Ratings"} onChange={val=>{}}/>
				</Row>*/}
				{/*<Column>
					<Row>Supporting arguments</Row>
					<Row>Opposing arguments</Row>
				</Column>*/}
				<Column ml={0}> {/* vertical */}
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.Supporting}/>
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.Opposing} style={{marginTop: 1}}/>
				</Column>
				{/*<Row ml={0}> // horizontal
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.Supporting}/>
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.Opposing} style={{marginLeft: 3}}/>
				</Row>*/}
			</Row>
		);
	}
}