import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "react-vextensions";
import {Row, TextArea_AutoSize, Button} from "react-vcomponents";
import {MapNode, MapNodeL3, ClaimForm, ChildEntry} from "../../../../Store/firebase/nodes/@MapNode";
import {SetNodeUILocked} from "UI/@Shared/Maps/MapNode/NodeUI";
import {WaitTillPathDataIsReceiving, WaitTillPathDataIsReceived} from "../../../../Frame/Database/DatabaseHelpers";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import AddChildNode from "../../../../Server/Commands/AddChildNode";
import {ACTMapNodeExpandedSet} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {ACTSetLastAcknowledgementTime} from "Store/main";
import keycode from "keycode";

/*@Connect((state, props)=> ({
}))*/
export class PremiseAddHelper extends BaseComponent<{mapID: number, parentNode: MapNodeL3, parentPath: string} & Partial<{}>, {premiseTitle: string}> {
	render() {
		let {mapID, parentNode, parentPath} = this.props;
		let {premiseTitle} = this.state;
		return (
			<Row style={{alignItems: "stretch", padding: "5px 0px"}}>
				{/*<TextInput placeholder="Type the argument's first claim/premise here." style={{flex: 1}}
					value={premiseTitle} onChange={val=>this.SetState({premiseTitle: val})}/>*/}
				<TextArea_AutoSize placeholder="Type the argument's first claim/premise here." value={premiseTitle} style={{width: "100%"}}
					onKeyDown={async e=> {
						if (e.keyCode == keycode.codes.enter) {
							this.CreatePremise();
						}
					}}
					onChange={val=>this.SetState({premiseTitle: val.replace(/[\r\n]/g, "")})}/>
				<Button text="✔️" ml={1} p="0 3px" onClick={()=>this.CreatePremise()}/>
			</Row>
		);
	}
	async CreatePremise() {
		let {mapID, parentNode, parentPath} = this.props;
		let {premiseTitle} = this.state;

		let newNode = new MapNode({
			parents: {[parentNode._id]: {_: true}},
			type: MapNodeType.Claim,
		});
		let newRevision = new MapNodeRevision({
			titles: {base: premiseTitle},
			relative: false,
			approved: true,
		});
		let newLink = {_: true, form: ClaimForm.Base} as ChildEntry;

		SetNodeUILocked(parentNode._id, true);
		let info = await new AddChildNode({mapID: mapID, node: newNode, revision: newRevision, link: newLink}).Run();
		store.dispatch(new ACTMapNodeExpandedSet({mapID, path: parentPath + "/" + info.nodeID, expanded: true, recursive: false}));
		store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.nodeID, time: Date.now()}));

		await WaitTillPathDataIsReceiving(`nodeRevisions/${info.revisionID}`);
		await WaitTillPathDataIsReceived(`nodeRevisions/${info.revisionID}`);
		SetNodeUILocked(parentNode._id, false);
	}
}