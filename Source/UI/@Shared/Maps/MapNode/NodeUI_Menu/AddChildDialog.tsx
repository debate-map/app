import {Assert, E, GetEntries, GetErrorMessagesUnderElement, OmitIfFalsy} from "js-vextensions";
import {Column, Pre, Row, Select, TextArea} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {AddArgumentAndClaim} from "Server/Commands/AddArgumentAndClaim";
import {GetNode} from "Store/firebase/nodes";
import {HasModPermissions} from "Store/firebase/userExtras";
import {ES} from "Utils/UI/GlobalStyles";
import {store} from "Store";
import {Link} from "vwebapp-framework";
import {ACTMapNodeExpandedSet} from "Store/main/maps/mapViews/$mapView";
import {runInAction} from "mobx";
import {GetMap} from "Store/firebase/maps";
import {ImageAttachment} from "Store/firebase/nodeRevisions/@ImageAttachment";
import {AttachmentType, GetAttachmentType, ResetNodeRevisionAttachment} from "Store/firebase/nodeRevisions/@AttachmentType";
import {AddChildNode} from "../../../../../Server/Commands/AddChildNode";
import {QuoteAttachment} from "../../../../../Store/firebase/nodeRevisions/@QuoteAttachment";
import {AsNodeL2, AsNodeL3, GetNodeForm, GetNodeL3} from "../../../../../Store/firebase/nodes/$node";
import {ChildEntry, ClaimForm, MapNode, Polarity} from "../../../../../Store/firebase/nodes/@MapNode";
import {ArgumentType, MapNodeRevision, MapNodeRevision_titlePattern, PermissionInfoType} from "../../../../../Store/firebase/nodes/@MapNodeRevision";
import {GetMapNodeTypeDisplayName, MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {NodeDetailsUI} from "../NodeDetailsUI";

export class AddChildHelper {
	constructor(parentPath: string, childType: MapNodeType, title: string, childPolarity: Polarity, userID: string, mapID: string) {
		this.mapID = mapID;
		this.node_parentPath = parentPath;
		const map = GetMap(mapID);
		Assert(map, "Map was not pre-loaded into the store. Can use this beforehand: await GetAsync(()=>GetMap(mapID));");
		const parentNode = GetNode(this.Node_ParentID);
		Assert(parentNode, "Parent-node was not pre-loaded into the store. Can use this beforehand: await GetAsync(()=>GetNode(parentID));");

		this.node = new MapNode({
			parents: {[this.Node_ParentID]: {_: true}},
			type: childType,
			ownerMapID: OmitIfFalsy(parentNode.ownerMapID),
		});
		this.node_revision = new MapNodeRevision(map.nodeDefaults);
		this.node_link = E(
			{_: true},
			childType == MapNodeType.Claim && {form: parentNode.type == MapNodeType.Category ? ClaimForm.YesNoQuestion : ClaimForm.Base},
			childType == MapNodeType.Argument && {polarity: childPolarity},
		) as ChildEntry;

		if (childType == MapNodeType.Argument) {
			this.node_revision.argumentType = ArgumentType.All;
			this.subNode = new MapNode({type: MapNodeType.Claim, creator: userID, ownerMapID: OmitIfFalsy(parentNode.ownerMapID)});
			this.subNode_revision = new MapNodeRevision(E(map.nodeDefaults, {titles: {base: title}}));
		} else {
			let usedTitleKey = "base";
			if (childType == MapNodeType.Claim) {
				usedTitleKey = ClaimForm[this.node_link.form].replace(/^./, ch=>ch.toLowerCase());
			}
			this.node_revision.titles[usedTitleKey] = title;
		}
	}

	mapID: string;
	node_parentPath: string;
	// get Node_Parent() { return GetNodeL3(this.node_parentPath); }
	get Node_ParentID() { return this.node_parentPath.split("/").Last(); }
	node: MapNode;
	node_revision: MapNodeRevision;
	node_link: ChildEntry;
	subNode?: MapNode;
	subNode_revision?: MapNodeRevision;

	async Apply(expandSelf = true, expandTruthAndRelevance = true) {
		/* if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		} */
		runInAction("AddChildDialog.Apply_start", ()=>store.main.maps.currentNodeBeingAdded_path = `${this.node_parentPath}/?`);

		let info;
		if (this.node.type == MapNodeType.Argument) {
			info = await new AddArgumentAndClaim({
				mapID: this.mapID,
				argumentParentID: this.Node_ParentID, argumentNode: this.node.Excluding("parents") as MapNode, argumentRevision: this.node_revision, argumentLink: this.node_link,
				claimNode: this.subNode, claimRevision: this.subNode_revision,
			}).Run();

			if (expandSelf) {
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${info.argumentNodeID}`, expanded: true, resetSubtree: false});
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${info.argumentNodeID}/${info.claimNodeID}`, expanded: true,
					expanded_truth: expandTruthAndRelevance, expanded_relevance: expandTruthAndRelevance, resetSubtree: false});
				runInAction("AddChildDialog.Apply_mid", ()=>{
					store.main.maps.nodeLastAcknowledgementTimes.set(info.argumentNodeID, Date.now());
					store.main.maps.nodeLastAcknowledgementTimes.set(info.claimNodeID, Date.now());
				});
			}
		} else {
			info = await new AddChildNode({
				mapID: this.mapID, parentID: this.Node_ParentID, node: this.node.Excluding("parents") as MapNode, revision: this.node_revision, link: this.node_link,
			}).Run();

			if (expandSelf) {
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${info.nodeID}`, expanded: true,
					expanded_truth: expandTruthAndRelevance, expanded_relevance: expandTruthAndRelevance, resetSubtree: false});
				runInAction("AddChildDialog.Apply_mid", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(info.nodeID, Date.now()));
			}
		}

		runInAction("AddChildDialog.Apply_end", ()=>store.main.maps.currentNodeBeingAdded_path = null);

		return info;
	}
}

export function ShowAddChildDialog(parentPath: string, childType: MapNodeType, childPolarity: Polarity, userID: string, mapID: string) {
	const helper = new AddChildHelper(parentPath, childType, "", childPolarity, userID, mapID);
	const parentNode = GetNodeL3(parentPath);
	const parentForm = GetNodeForm(parentNode);
	const displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);

	const map = GetMap(mapID); // "not in observer" -- humbug; technically true, but map-data must be loaded already, for this func to be called

	let root;
	let justShowed = true;
	let nodeEditorUI: NodeDetailsUI;
	let validationError = "No data entered yet.";
	const Change = (..._)=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		message: ()=>{
			setTimeout(()=>justShowed = false);
			boxController.options.okButtonClickable = validationError == null;

			const claimTypes = GetEntries(AttachmentType);
			if (!HasModPermissions(userID)) {
				claimTypes.Remove(claimTypes.find(a=>a.value == AttachmentType.Image));
			}

			const newNodeAsL2 = AsNodeL2(helper.node, helper.node_revision);
			return (
				<Column ref={c=>root = c} style={{width: 600}}>
					{childType == MapNodeType.Claim &&
						<Row>
							<Pre>Type: </Pre>
							<Select displayType="button bar" options={claimTypes} style={{display: "inline-block"}}
								value={GetAttachmentType(newNodeAsL2)}
								onChange={val=>{
									ResetNodeRevisionAttachment(helper.node_revision, val);
									Change();

									const oldError = validationError;
									setTimeout(()=>{
										validationError = nodeEditorUI.GetValidationError();
										if (validationError != oldError) {
											Change();
										}
									});
								}}/>
						</Row>}
					{childType != MapNodeType.Argument &&
						<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: childType == MapNodeType.Claim ? "5px 0 0 0" : 0}}
							baseData={AsNodeL3(newNodeAsL2, Polarity.Supporting, null)}
							baseRevisionData={helper.node_revision}
							baseLinkData={helper.node_link} forNew={true}
							parent={parentNode}
							onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
								if (map?.requireMapEditorsCanEdit) {
									comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.MapEditors};
								}
								helper.node = newNodeData;
								helper.node_revision = newRevisionData;
								helper.node_link = newLinkData;
								validationError = comp.GetValidationError();
								Change();
							}}/>}
					{childType == MapNodeType.Argument &&
						<Column>
							{/* <Row style={{display: "flex", alignItems: "center"}}>
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
							</Row> */}
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>Main claim (ie. premise) that your argument will be based on: </Pre>
								<Link to="https://en.wikipedia.org/wiki/Premise" style={{marginLeft: "auto", fontSize: 12, opacity: 0.7}}>What is a premise?</Link>
								{/* <InfoButton text={`
								`.trim()}/> */}
							</Row>
							<Row style={{display: "flex", alignItems: "center"}}>
								<TextArea required={true} pattern={MapNodeRevision_titlePattern}
									allowLineBreaks={false} autoSize={true} style={ES({flex: 1})}
									value={helper.subNode_revision.titles["base"]}
									onChange={val=>Change(helper.subNode_revision.titles["base"] = val, validationError = GetErrorMessagesUnderElement(root.DOM)[0])}/>
							</Row>
							<Row mt={5} style={{fontSize: 12}}>{`To add a second premise later, right click on your new argument and press "Convert to multi-premise".`}</Row>
						</Column>}
				</Column>
			);
		},
		onOK: ()=>{
			helper.Apply();
		},
	});
}