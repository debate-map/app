import {SetNodeUILocked} from "UI/@Shared/Maps/MapNode/NodeUI";
import {E, GetErrorMessagesUnderElement} from "js-vextensions";
import {Column, Pre, Row, Select, TextArea_AutoSize} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {DBPath, WaitTillPathDataIsReceived, WaitTillPathDataIsReceiving} from "../../../../../Frame/Database/DatabaseHelpers";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {Link} from "../../../../../Frame/ReactComponents/Link";
import AddChildNode from "../../../../../Server/Commands/AddChildNode";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {AsNodeL2, AsNodeL3, GetClaimType, GetNodeForm} from "../../../../../Store/firebase/nodes/$node";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import {ChildEntry, ClaimForm, ClaimType, ImageAttachment, MapNode, MapNodeL3, Polarity} from "../../../../../Store/firebase/nodes/@MapNode";
import {ArgumentType, MapNodeRevision, MapNodeRevision_titlePattern} from "../../../../../Store/firebase/nodes/@MapNodeRevision";
import {GetMapNodeTypeDisplayName, MapNodeType, MapNodeType_Info} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {IsUserMod} from "../../../../../Store/firebase/userExtras";
import {ACTSetLastAcknowledgementTime} from "../../../../../Store/main";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import NodeDetailsUI from "../NodeDetailsUI";

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
	let newRevision = new MapNodeRevision({});
	let newLink = E(
		{_: true},
		childType == MapNodeType.Claim && {form: claimForm},
		childType == MapNodeType.Argument && {polarity: childPolarity},
	) as ChildEntry;
	if (childType == MapNodeType.Argument) {
		newRevision.argumentType = ArgumentType.All;
		var newPremise = new MapNode({type: MapNodeType.Claim, creator: userID});
		var newPremiseRevision = new MapNodeRevision({});
	}
	
	let root;
	let justShowed = true;
	let nodeEditorUI: NodeDetailsUI;
	let validationError = "No data entered yet.";
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		message: ()=> {
			setTimeout(()=>justShowed = false);
			boxController.options.okButtonClickable = validationError == null;

			let claimTypes = GetEntries(ClaimType);
			if (!IsUserMod(userID)) {
				claimTypes.Remove(claimTypes.find(a=>a.value == ClaimType.Image));
			}

			let newNodeAsL2 = AsNodeL2(newNode, newRevision);
			return (
				<Column ref={c=>root = c} style={{width: 600}}>
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
						<NodeDetailsUI ref={c=>nodeEditorUI = GetInnerComp(c) as any} style={{padding: 0}}
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
						<Column style={{padding: "5px 0"}}>
							{/*<Row style={{display: "flex", alignItems: "center"}}>
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
									allowLineBreaks={false} style={ES({flex: 1})}
									//ref={a=>a && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
									value={newRevision.titles["base"]} onChange={val=>Change(newRevision.titles["base"] = val)}/>*#/}
								<TextInput style={ES({flex: 1})} required={true} pattern={MapNodeRevision_titlePattern}
									//ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
									value={newRevision.titles["base"]}
									onChange={val=>Change(newRevision.titles["base"] = val, validationError = GetErrorMessagesUnderElement(root.DOM)[0])}/>
							</Row>*/}
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>Main claim (ie. premise) that your argument will be based on: </Pre>
								<Link to="https://en.wikipedia.org/wiki/Premise" style={{marginLeft: "auto", fontSize: 12, opacity: .7}}>What is a premise?</Link>
								{/*<InfoButton text={`
								`.trim()}/>*/}
							</Row>
							<Row style={{display: "flex", alignItems: "center"}}>
								<TextArea_AutoSize required={true} pattern={MapNodeRevision_titlePattern}
									allowLineBreaks={false} style={ES({flex: 1})}
									value={newPremiseRevision.titles["base"]}
									onChange={val=>Change(newPremiseRevision.titles["base"] = val, validationError = GetErrorMessagesUnderElement(root.DOM)[0])}/>
							</Row>
							<Row mt={5} style={{fontSize: 12}}>To add a second premise later, right click on your new argument and press "Convert to multi-premise".</Row>
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
			}).Run();
			store.dispatch(new ACTMapNodeExpandedSet({mapID, path: parentPath + "/" + info.nodeID, expanded: true, recursive: false}));
			store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info.nodeID, time: Date.now()}));

			if (childType == MapNodeType.Argument) {
				newPremise.parents = {[info.nodeID]: {_: true}};
				var info2 = await new AddChildNode({mapID: mapID, node: newPremise, revision: newPremiseRevision}).Run();
				//store.dispatch(new ACTMapNodeExpandedSet({mapID, path: `${parentPath}/${info.nodeID}/${info2.nodeID}`, expanded: true, recursive: false}));
				store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: info2.nodeID, time: Date.now()}));
			}

			let watchPath = DBPath(`nodeRevisions/${(info2 && info2.revisionID) || info.revisionID}`);
			await WaitTillPathDataIsReceiving(watchPath);
			await WaitTillPathDataIsReceived(watchPath);
			SetNodeUILocked(parentNode._id, false);
		}
	});
}