import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ThesisForm, ChildEntry, MapNodeL2, ThesisType, ImageAttachment, Polarity, MapNodeL3} from "../../../../../Store/firebase/nodes/@MapNode";
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
import {MetaThesis_ThenType, MetaThesis_IfType, GetMetaThesisIfTypeDisplayText} from "../../../../../Store/firebase/nodes/@MetaThesisInfo";
import AddNode from "../../../../../Server/Commands/AddNode";
import Editor from "react-md-editor";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {CleanUpdatedContentNode} from "../QuoteInfoEditorUI";
import {CheckBox} from "react-vcomponents";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import NodeDetailsUI from "../NodeDetailsUI";
import {GetThesisType, AsNodeL3, AsNodeL2, GetFinalPolarity} from "../../../../../Store/firebase/nodes/$node";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import { IsUserAdmin, IsUserMod } from "../../../../../Store/firebase/userExtras";
import AddChildNode from "../../../../../Server/Commands/AddChildNode";
import {MapNodeRevision} from "../../../../../Store/firebase/nodes/@MapNodeRevision";

export function ShowAddChildDialog(parentNode: MapNodeL3, parentForm: ThesisForm, childType: MapNodeType, childPolarity: Polarity, userID: string, mapID: number, path: string) {
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);

	let thesisForm = childType == MapNodeType.Thesis
		? (parentNode.type == MapNodeType.Category ? ThesisForm.YesNoQuestion : ThesisForm.Base)
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
		childType == MapNodeType.Thesis && {form: thesisForm},
		childType == MapNodeType.Argument && {polarity: childPolarity},
	) as ChildEntry;
	let newMetaThesis: MapNode;
	let newMetaThesisRevision: MapNodeRevision;
	if (childType == MapNodeType.Argument) {
		newMetaThesis = new MapNode({
			type: MapNodeType.Thesis, creator: userID,
		});
		newMetaThesisRevision = new MapNodeRevision({
			approved: true,
			impactPremise: {
				ifType: MetaThesis_IfType.All,
				thenType: MetaThesis_ThenType.Impact,
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

			let thesisTypes = GetEntries(ThesisType);
			thesisTypes.Remove(thesisTypes.find(a=>a.value == ThesisType.MetaThesis));
			if (!IsUserMod(userID)) {
				thesisTypes.Remove(thesisTypes.find(a=>a.value == ThesisType.Image));
			}

			let newNodeAsL2 = AsNodeL2(newNode, newRevision);

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					{childType == MapNodeType.Thesis &&
						<Row>
							<Pre>Type: </Pre>
							<Select displayType="button bar" options={thesisTypes} style={{display: "inline-block"}}
								value={GetThesisType(newNodeAsL2)}
								onChange={val=> {
									newRevision.Extend({equation: null, contentNode: null, image: null});
									if (val == ThesisType.Normal) {
									} else if (val == ThesisType.Equation) {
										newRevision.equation = new Equation();
									} else if (val == ThesisType.Quote) {
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
						onChange={(newNodeData, newLinkData, comp)=> {
							newNode = newNodeData;
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
				impactPremiseNode: newMetaThesis, impactPremiseNodeRevision: newMetaThesisRevision,
			}).Run();
			store.dispatch(new ACTMapNodeExpandedSet({mapID, path: path + "/" + newNodeID, expanded: true, recursive: false}));
		}
	});
}