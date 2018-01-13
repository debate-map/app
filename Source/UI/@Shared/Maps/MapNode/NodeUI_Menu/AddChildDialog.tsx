import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ClaimForm, ChildEntry, MapNodeL2, ClaimType, ImageAttachment, Polarity, MapNodeL3} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox, BoxController} from "react-vmessagebox";
import {Select} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {BaseComponent, GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {Column} from "react-vcomponents";
import keycode from "keycode";
import {Button} from "react-vcomponents";
import {E} from "../../../../../Frame/General/Globals_Free";
import {ImpactPremise_ThenType, ImpactPremise_IfType, GetImpactPremiseIfTypeDisplayText} from "./../../../../../Store/firebase/nodes/@ImpactPremiseInfo";
import AddNode from "../../../../../Server/Commands/AddNode";
import Editor from "react-md-editor";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {CleanUpdatedContentNode} from "../QuoteInfoEditorUI";
import {CheckBox} from "react-vcomponents";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import NodeDetailsUI from "../NodeDetailsUI";
import {GetClaimType, AsNodeL3, AsNodeL2, GetFinalPolarity} from "../../../../../Store/firebase/nodes/$node";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import { IsUserAdmin, IsUserMod } from "../../../../../Store/firebase/userExtras";
import AddChildNode from "../../../../../Server/Commands/AddChildNode";
import {MapNodeRevision} from "../../../../../Store/firebase/nodes/@MapNodeRevision";

export function ShowAddChildDialog(parentNode: MapNodeL3, parentForm: ClaimForm, childType: MapNodeType, childPolarity: Polarity, userID: string, mapID: number, path: string) {
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);

	let claimForm = childType == MapNodeType.Claim
		? (parentNode.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base)
		: null;

	let newNode = new MapNode({
		parents: {[parentNode._id]: {_: true}},
		type: childType,
	});
	let newRevision = new MapNodeRevision({
		titles: {},
		relative: false,
		//contentNode: new ContentNode(),
		approved: true,
	});
	let newLink = E(
		{_: true},
		childType == MapNodeType.Claim && {form: claimForm},
		childType == MapNodeType.Argument && {polarity: childPolarity},
	) as ChildEntry;
	let newImpactPremise: MapNode;
	let newImpactPremiseRevision: MapNodeRevision;
	if (childType == MapNodeType.Argument) {
		newImpactPremise = new MapNode({
			type: MapNodeType.Claim, creator: userID,
		});
		newImpactPremiseRevision = new MapNodeRevision({
			approved: true,
			impactPremise: {
				ifType: ImpactPremise_IfType.All,
				thenType: ImpactPremise_ThenType.Impact,
			},
		});
	}
	
	let justShowed = true;
	let nodeEditorUI: NodeDetailsUI;
	let validationError = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		messageUI: ()=> {
			setTimeout(()=>justShowed = false);
			boxController.options.okButtonClickable = validationError == null;

			let claimTypes = GetEntries(ClaimType);
			claimTypes.Remove(claimTypes.find(a=>a.value == ClaimType.ImpactPremise));
			if (!IsUserMod(userID)) {
				claimTypes.Remove(claimTypes.find(a=>a.value == ClaimType.Image));
			}

			let newNodeAsL2 = AsNodeL2(newNode, newRevision);

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					{childType == MapNodeType.Claim &&
						<Row>
							<Pre>Type: </Pre>
							<Select displayType="button bar" options={claimTypes} style={{display: "inline-block"}}
								value={GetClaimType(newNodeAsL2)}
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
									Change();

									let oldError = validationError;
									setTimeout(()=> {
										validationError = nodeEditorUI.GetValidationError();
										if (validationError != oldError) {
											Change();
										}
									});
								}}/>
						</Row>}
					<NodeDetailsUI ref={c=>nodeEditorUI = GetInnerComp(c) as any}
						baseData={AsNodeL3(newNodeAsL2, Polarity.Supporting, null)}
						baseRevisionData={newRevision}
						baseLinkData={newLink} forNew={true}
						parent={parentNode}
						onChange={(newNodeData, newRevisionData, newLinkData, comp)=> {
							newNode = newNodeData;
							newRevision = newRevisionData;
							newLink = newLinkData;
							validationError = comp.GetValidationError();
							Change();
						}}/>
				</Column>
			);
		},
		onOK: async ()=> {
			/*if (validationError) {
				return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
			}*/

			let newNodeID = await new AddChildNode({
				mapID: mapID, node: newNode, revision: newRevision, link: newLink,
				impactPremiseNode: newImpactPremise, impactPremiseNodeRevision: newImpactPremiseRevision,
			}).Run();
			store.dispatch(new ACTMapNodeExpandedSet({mapID, path: path + "/" + newNodeID, expanded: true, recursive: false}));
		}
	});
}