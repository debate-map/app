import {Assert, E, GetEntries, GetErrorMessagesUnderElement, OmitIfFalsy} from "js-vextensions";
import {Column, Pre, Row, Select, TextArea, Text, CheckBox} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {AddArgumentAndClaim} from "Server/Commands/AddArgumentAndClaim";
import {GetNode} from "Store/firebase/nodes";
import {ES} from "Utils/UI/GlobalStyles";
import {store} from "Store";
import {Link, InfoButton} from "vwebapp-framework";
import {ACTMapNodeExpandedSet} from "Store/main/maps/mapViews/$mapView";
import {runInAction} from "mobx";
import {GetMap} from "Store/firebase/maps";
import {ImageAttachment} from "Store/firebase/nodeRevisions/@ImageAttachment";
import {AttachmentType, GetAttachmentType, ResetNodeRevisionAttachment} from "Store/firebase/nodeRevisions/@AttachmentType";
import {HasModPermissions} from "Store/firebase/users/$user";
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
			this.subNode_link = {_: true, form: ClaimForm.Base} as ChildEntry;
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
	subNode_link: ChildEntry;

	async Apply(opt?: {expandSelf?: boolean, expandTruthAndRelevance?: boolean}) {
		opt = E({expandSelf: true, expandTruthAndRelevance: true}, opt);
		/* if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		} */
		runInAction("AddChildDialog.Apply_start", ()=>store.main.maps.currentNodeBeingAdded_path = `${this.node_parentPath}/?`);

		/*if (opt.uiType == AddChildDialogTab.MultiPremise) {
			this.node.multiPremiseArgument = true;
		}*/

		let info;
		if (this.node.type == MapNodeType.Argument) {
			info = await new AddArgumentAndClaim({
				mapID: this.mapID,
				argumentParentID: this.Node_ParentID, argumentNode: this.node.Excluding("parents") as MapNode, argumentRevision: this.node_revision, argumentLink: this.node_link,
				claimNode: this.subNode, claimRevision: this.subNode_revision, claimLink: this.subNode_link,
			}).Run();

			if (opt.expandSelf) {
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${info.argumentNodeID}`, expanded: true, resetSubtree: false});
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${info.argumentNodeID}/${info.claimNodeID}`, expanded: true,
					expanded_truth: opt.expandTruthAndRelevance, expanded_relevance: opt.expandTruthAndRelevance, resetSubtree: false});
				runInAction("AddChildDialog.Apply_mid", ()=>{
					store.main.maps.nodeLastAcknowledgementTimes.set(info.argumentNodeID, Date.now());
					store.main.maps.nodeLastAcknowledgementTimes.set(info.claimNodeID, Date.now());
				});
			}
		} else {
			info = await new AddChildNode({
				mapID: this.mapID, parentID: this.Node_ParentID, node: this.node.Excluding("parents") as MapNode, revision: this.node_revision, link: this.node_link,
			}).Run();

			if (opt.expandSelf) {
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${info.nodeID}`, expanded: true,
					expanded_truth: opt.expandTruthAndRelevance, expanded_relevance: opt.expandTruthAndRelevance, resetSubtree: false});
				runInAction("AddChildDialog.Apply_mid", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(info.nodeID, Date.now()));
			}
		}

		runInAction("AddChildDialog.Apply_end", ()=>store.main.maps.currentNodeBeingAdded_path = null);

		return info;
	}
}

enum AddChildDialogTab {
	Argument,
	Claim,
}
export function ShowAddChildDialog(parentPath: string, childType: MapNodeType, childPolarity: Polarity, userID: string, mapID: string) {
	const helper = new AddChildHelper(parentPath, childType, "", childPolarity, userID, mapID);
	const parentNode = GetNodeL3(parentPath);
	const parentForm = GetNodeForm(parentNode);
	const displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);

	const map = GetMap(mapID); // "not in observer" -- humbug; technically true, but map-data must be loaded already, for this func to be called

	let root;
	let nodeEditorUI: NodeDetailsUI;
	let validationError = "No data entered yet.";
	const Change = (..._)=>boxController.UpdateUI();

	let tab = AddChildDialogTab.Claim;
	let boxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		message: ()=>{
			boxController.options.okButtonClickable = validationError == null;

			const newNodeAsL2 = AsNodeL2(helper.node, helper.node_revision);
			const newNodeAsL3 = AsNodeL3(newNodeAsL2, childPolarity, helper.node_link);

			const advanced = store.main.maps.addChildDialog.advanced;
			return (
				<Column ref={c=>root = c} style={{width: 600}}>
					{childType == MapNodeType.Argument && // right now, the "advanced" UI is only different when adding an argument, so only let user see/set it in that case
					<Row center mb={5}>
						{childType == MapNodeType.Argument && advanced &&
						<>
							<Text>Data:</Text>
							<Select ml={5} displayType="button bar" options={GetEntries(AddChildDialogTab)} style={{display: "inline-block"}}
								value={tab} onChange={val=>Change(tab = val)}/>
							<InfoButton ml={5} mr={5} text={`
								An "argument" consists of two parts: 1) the argument node itself, 2) the argument's premise/claim nodes

								Use the tabs to control which part you're setting the data for.
							`.AsMultiline(0)}/>
						</>}
						<CheckBox text="Advanced" checked={advanced} onChange={val=>{
							runInAction("AddChildDialog.advanced.onChange", ()=>store.main.maps.addChildDialog.advanced = val);
							if (!val) tab = AddChildDialogTab.Claim;
							Change();
						}}/>
					</Row>}
					{tab == AddChildDialogTab.Argument &&
					<>
						<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: 0}} parent={parentNode}
							baseData={newNodeAsL3} baseRevisionData={helper.node_revision} baseLinkData={helper.node_link} forNew={true}
							onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
								if (map?.requireMapEditorsCanEdit) {
									comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.MapEditors};
								}
								helper.VSet({node: newNodeData, node_revision: newRevisionData, node_link: newLinkData});
								validationError = comp.GetValidationError();
								Change();
							}}/>
					</>}
					{tab == AddChildDialogTab.Claim &&
					<>
						{childType == MapNodeType.Argument &&
						<>
							{!advanced &&
							<Column>
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
							{advanced &&
							<NodeDetailsUI style={{padding: "5px 0 0 0"}} parent={newNodeAsL3}
								baseData={helper.subNode} baseRevisionData={helper.subNode_revision} baseLinkData={helper.subNode_link} forNew={true}
								onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
									if (map?.requireMapEditorsCanEdit) {
										comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.MapEditors};
									}
									helper.VSet({subNode: newNodeData, subNode_revision: newRevisionData, subNode_link: newLinkData});
									validationError = comp.GetValidationError();
									Change();
								}}/>}
						</>}
						{childType != MapNodeType.Argument &&
						<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: childType == MapNodeType.Claim ? "5px 0 0 0" : 0}} parent={parentNode}
							baseData={newNodeAsL3} baseRevisionData={helper.node_revision} baseLinkData={helper.node_link} forNew={true}
							onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
								if (map?.requireMapEditorsCanEdit) {
									comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.MapEditors};
								}
								helper.VSet({node: newNodeData, node_revision: newRevisionData, node_link: newLinkData});
								validationError = comp.GetValidationError();
								Change();
							}}/>}
					</>}
				</Column>
			);
		},
		onOK: ()=>{
			helper.Apply();
		},
	});
}