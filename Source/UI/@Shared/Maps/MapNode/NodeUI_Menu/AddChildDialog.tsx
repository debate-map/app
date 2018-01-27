import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ClaimForm, ChildEntry, MapNodeL2, ClaimType, ImageAttachment, Polarity, MapNodeL3} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox, BoxController} from "react-vmessagebox";
import {Select, TextArea_AutoSize} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import {BaseComponent, GetInnerComp, RenderSource} from "react-vextensions";
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
import {GetClaimType, AsNodeL3, AsNodeL2, GetFinalPolarity, GetNodeForm} from "../../../../../Store/firebase/nodes/$node";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import { IsUserAdmin, IsUserMod } from "../../../../../Store/firebase/userExtras";
import AddChildNode from "../../../../../Server/Commands/AddChildNode";
import {MapNodeRevision, MapNodeRevision_titlePattern} from "../../../../../Store/firebase/nodes/@MapNodeRevision";
import {ACTSetLastAcknowledgementTime} from "../../../../../Store/main";
import {SetNodeUILocked} from "UI/@Shared/Maps/MapNode/NodeUI";
import {WaitTillPathDataIsReceiving, WaitTillPathDataIsReceived, DBPath} from "../../../../../Frame/Database/DatabaseHelpers";
import {GetErrorMessagesUnderElement} from "js-vextensions";
import Link from "../../../../../Frame/ReactComponents/Link";

export function ShowAddChildDialog(parentNode: MapNodeL3, parentPath: string, childType: MapNodeType, childPolarity: Polarity, userID: string, mapID: number) {
	let parentForm = GetNodeForm(parentNode);
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);

	let claimForm = childType == MapNodeType.Claim
		? (parentNode.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base)
		: null;

	let newNode = new MapNode({
		parents: {[parentNode._id]: {_: true}},
		type: childType,
	});
	let newRevision = new MapNodeRevision({approved: true, titles: {}});
	let newLink = E(
		{_: true},
		childType == MapNodeType.Claim && {form: claimForm},
		childType == MapNodeType.Argument && {polarity: childPolarity},
	) as ChildEntry;
	if (childType == MapNodeType.Argument) {
		var newImpactPremise = new MapNode({type: MapNodeType.Claim, creator: userID});
		var newImpactPremiseRevision = new MapNodeRevision({approved: true,
			impactPremise: {
				ifType: ImpactPremise_IfType.All,
				thenType: ImpactPremise_ThenType.Impact,
			},
		});
		var newPremise = new MapNode({type: MapNodeType.Claim, creator: userID});
		var newPremiseRevision = new MapNodeRevision({approved: true, titles: {}});
	}
	
	let root;
	let justShowed = true;
	let nodeEditorUI: NodeDetailsUI;
	let validationError = "No data entered yet.";
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
				<Column ref={c=>root = c} style={{padding: "10px 0", width: 600}}>
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
					{childType != MapNodeType.Argument &&
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
							}}/>}
					{childType == MapNodeType.Argument &&
						<Column style={{padding: 5}}>
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>Title: </Pre>
								<InfoButton text={`
An argument title should be a short "key phrase" that gives the gist of the argument, for easy remembering/scanning.

Examples:
* Shadow during lunar eclipses
* May have used biased sources
* Quote: Socrates

The details of the argument should be described within the argument's premises. (the first premise can be typed in below)
								`.trim()}/><Pre> </Pre>
								{/*<TextArea_AutoSize required={true} pattern={MapNodeRevision_titlePattern}
									allowLineBreaks={false} style={{flex: 1}}
									//ref={a=>a && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
									value={newRevision.titles["base"]} onChange={val=>Change(newRevision.titles["base"] = val)}/>*/}
								<TextInput style={{flex: 1}} required={true} pattern={MapNodeRevision_titlePattern}
									//ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
									value={newRevision.titles["base"]}
									onChange={val=>Change(newRevision.titles["base"] = val, validationError = GetErrorMessagesUnderElement(root.DOM)[0])}/>
							</Row>
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>First claim/premise: </Pre>
								<Link to="https://en.wikipedia.org/wiki/Premise" style={{marginLeft: "auto", fontSize: 12, opacity: .7}}>What is a premise?</Link>
								{/*<InfoButton text={`
								`.trim()}/>*/}
							</Row>
							<Row style={{display: "flex", alignItems: "center"}}>
								<TextArea_AutoSize required={true} pattern={MapNodeRevision_titlePattern}
									allowLineBreaks={false} style={{flex: 1}}
									value={newPremiseRevision.titles["base"]}
									onChange={val=>Change(newPremiseRevision.titles["base"] = val, validationError = GetErrorMessagesUnderElement(root.DOM)[0])}/>
							</Row>
							<Row mt={5} style={{fontSize: 12}}>To add a second premise, right click on your new argument and press "Add claim". (once you're finished here)</Row>
						</Column>}
				</Column>
			);
		},
		onOK: async ()=> {
			/*if (validationError) {
				return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
			}*/
			SetNodeUILocked(parentNode._id, true);
			let info = await new AddChildNode({
				mapID: mapID, node: newNode, revision: newRevision, link: newLink,
				impactPremiseNode: newImpactPremise, impactPremiseNodeRevision: newImpactPremiseRevision,
			}).Run();
			store.dispatch(new ACTMapNodeExpandedSet({mapID, path: parentPath + "/" + info.nodeID, expanded: true, recursive: false}));
			store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.nodeID, time: Date.now()}));
			if (info.impactPremise_nodeID) {
				store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.impactPremise_nodeID, time: Date.now()}));
			}

			if (childType == MapNodeType.Argument) {
				newPremise.parents = {[info.nodeID]: {_: true}};
				var info2 = await new AddChildNode({mapID: mapID, node: newPremise, revision: newPremiseRevision}).Run();
				//store.dispatch(new ACTMapNodeExpandedSet({mapID, path: `${parentPath}/${info.nodeID}/${info2.nodeID}`, expanded: true, recursive: false}));
				store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info2.nodeID, time: Date.now()}));
			}

			let watchPath = DBPath(`nodeRevisions/${info2.revisionID || info.impactPremise_revisionID || info.revisionID}`);
			await WaitTillPathDataIsReceiving(watchPath);
			await WaitTillPathDataIsReceived(watchPath);
			SetNodeUILocked(parentNode._id, false);
		}
	});
}