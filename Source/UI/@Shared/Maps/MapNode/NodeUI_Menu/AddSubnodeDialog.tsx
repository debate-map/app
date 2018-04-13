import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ClaimForm, ChildEntry, MapNodeL2, ClaimType, ImageAttachment} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox, BoxController} from "react-vmessagebox";
import {Select} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {BaseComponent, GetInnerComp, FindDOM} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {Column} from "react-vcomponents";
import keycode from "keycode";
import {Button} from "react-vcomponents";
import {E} from "js-vextensions";
import AddNode from "../../../../../Server/Commands/AddNode";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {CleanUpdatedContentNode} from "../QuoteInfoEditorUI";
import {CheckBox} from "react-vcomponents";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import NodeDetailsUI from "../NodeDetailsUI";
import {GetClaimType, AsNodeL2, AsNodeL3} from "../../../../../Store/firebase/nodes/$node";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import { IsUserAdmin, IsUserMod } from "../../../../../Store/firebase/userExtras";
import {GetLayers} from "../../../../../Store/firebase/layers";
import {Connect} from "Frame/Database/FirebaseConnect";
import {GetUserID} from "Store/firebase/users";
import {Layer} from "Store/firebase/layers/@Layer";
import AddSubnode from "../../../../../Server/Commands/AddSubnode";
 import {GetErrorMessagesUnderElement} from "js-vextensions";
import {MapNodeRevision} from "../../../../../Store/firebase/nodes/@MapNodeRevision";

export function ShowAddSubnodeDialog(mapID: number, anchorNode: MapNodeL2, anchorNodePath: string) {
	let dialog: AddSubnodeDialog;
	let boxController: BoxController = ShowMessageBox({
		title: `Add subnode (to layer)`, cancelButton: true,
		messageUI: ()=><AddSubnodeDialog ref={c=>dialog = GetInnerComp(c)} {...{mapID, anchorNode, anchorNodePath, boxController}}/>,
		onOK: ()=>dialog.OnOK(),
	});
}

type Props = {mapID: number, anchorNode: MapNode, anchorNodePath: string, boxController: BoxController} & Partial<{layers: Layer[]}>;
@Connect((state, {}: Props)=> ({
	layers: GetLayers(),
}))
class AddSubnodeDialog extends BaseComponent<Props, {layer: Layer, newNode: MapNode, newRevision: MapNodeRevision, newLink: ChildEntry, validationError: string}> {
	constructor(props) {
		super(props);
		let newNode = new MapNode({
			type: MapNodeType.Claim,
		});
		let newRevision = new MapNodeRevision({});
		let newLink = E({_: true}, newNode.type == MapNodeType.Claim && {form: ClaimForm.Base}) as ChildEntry; // not actually used
		this.state = {newNode, newRevision, newLink} as any;
	}
	UpdateOKButton() {
		let {boxController} = this.props;
		let {validationError} = this.state;
		// update ok-button
		let newClickable = validationError == null;
		if (newClickable != boxController.options.okButtonClickable) {
			boxController.options.okButtonClickable = newClickable;
			boxController.UpdateUI(false);
		}
	}

	nodeEditorUI: NodeDetailsUI;
	render() {
		let {boxController, layers} = this.props;
		let {layer, newNode, newRevision, newLink, validationError} = this.state;
		
		let claimTypes = GetEntries(ClaimType);
		if (!IsUserMod(GetUserID())) {
			claimTypes.Remove(claimTypes.find(a=>a.value == ClaimType.Image));
		}

		let layersWeCanAddTo = layers.filter(a=>a.creator == GetUserID());
		let layerOptions = [{name: "", value: null}].concat(layersWeCanAddTo.map(a=>({name: a.name, value: a})));
		
		return (
			<div>
			<Column style={{padding: "10px 0", width: 600}}>
				<Row>
					<Pre>Layer: </Pre>
					<Select options={layerOptions} value={layer} onChange={val=>this.SetState({layer: val})}/>
				</Row>
				{newNode.type == MapNodeType.Claim &&
					<Row mt={5}>
						<Pre>Type: </Pre>
						<Select displayType="button bar" options={claimTypes} style={{display: "inline-block"}}
							value={GetClaimType(AsNodeL2(newNode, newRevision))}
							onChange={val=> {
								newRevision.Extend({equation: null, contentNode: null, image: null});
								if (val == ClaimType.Normal) {
								} else if (val == ClaimType.Equation) {
									newRevision.equation = new Equation();
								} else if (val == ClaimType.Quote) {
									newRevision.contentNode = new ContentNode();
								} else {
									newRevision.image = new ImageAttachment();
								}
								this.Update();
							}}/>
					</Row>}
				<NodeDetailsUI ref={c=>this.nodeEditorUI = GetInnerComp(c) as any} parent={null}
					baseData={AsNodeL3(AsNodeL2(newNode, newRevision))} baseRevisionData={newRevision} baseLinkData={newLink} forNew={true}
					onChange={(newNodeData, newRevisionData, newLinkData, comp)=> {
						this.SetState({newNode: newNodeData, newRevision: newRevisionData, newLink: newLinkData});
					}}/>
				{/*validationError && <Row mt={3} style={{color: "rgba(255,200,200,.5)"}}>{FinalizeValidationError(validationError)}</Row>*/}
			</Column>
			</div>
		);
	}
	PostRender() {
		let oldError = this.state.validationError;
		let newError = this.GetValidationError();
		if (newError != oldError) {
			//this.Update();
			this.SetState({validationError: newError}, ()=>this.UpdateOKButton());
		}
	}

	GetValidationError() {
		if (this.nodeEditorUI && this.nodeEditorUI.GetValidationError()) return this.nodeEditorUI.GetValidationError();
		let {layer} = this.state;
		if (layer == null) return "A layer must be selected.";
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	async OnOK() {
		let {mapID, anchorNode, anchorNodePath} = this.props;
		let {layer, newNode, newRevision, newLink} = this.state;

		/*if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		}*/

		let newNodeID = await new AddSubnode({
			mapID, layerID: layer._id, anchorNodeID: anchorNode._id,
			subnode: newNode, subnodeRevision: newRevision, //link: newLink,
		}).Run();
		//store.dispatch(new ACTMapNodeExpandedSet_InLayer({mapID, anchorNodePath, layerID: layer._id, layerPath: newNodeID, expanded: true, recursive: false}));
	}
}

function FinalizeValidationError(message: string) {
	if (message == "Please fill out this field.") return "Please fill out the highlighted field.";
	return message;
}