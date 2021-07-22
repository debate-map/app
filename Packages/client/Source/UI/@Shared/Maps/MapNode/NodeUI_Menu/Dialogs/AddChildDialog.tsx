import {Assert, E, GetEntries, OmitIfFalsy} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {CheckBox, Column, Pre, Row, Select, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {store} from "Store";
import {ACTMapNodeExpandedSet} from "Store/main/maps/mapViews/$mapView.js";
import {ES, InfoButton, Link, observer_simple} from "web-vcore";
import {MapNodeType, GetMapNodeTypeDisplayName, GetDefaultAccessPolicyID_ForNode, NodeChildLink, Map, GetAccessPolicy, Polarity, MapNode, ClaimForm, GetMap, GetNode, MapNodeRevision, ArgumentType, PermissionInfoType, MapNodeRevision_titlePattern, AddArgumentAndClaim, AddChildNode, GetNodeL3, GetNodeForm, AsNodeL2, AsNodeL3} from "dm_common";
import {CatchBail} from "web-vcore/nm/mobx-graphlink";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

export class AddChildHelper {
	constructor(parentPath: string, childType: MapNodeType, title: string, childPolarity: Polarity, userID: string, mapID: string|n) {
		this.mapID = mapID;
		this.node_parentPath = parentPath;
		this.map = GetMap(mapID);
		Assert(this.map, "Map was not pre-loaded into the store. Can use this beforehand: await GetAsync(()=>GetMap(mapID));");
		const parentNode = GetNode(this.Node_ParentID);
		Assert(parentNode, "Parent-node was not pre-loaded into the store. Can use this beforehand: await GetAsync(()=>GetNode(parentID));");

		this.node = new MapNode({
			accessPolicy: GetDefaultAccessPolicyID_ForNode(),
			//parents: {[this.Node_ParentID]: {_: true}},
			type: childType,
			//ownerMapID: OmitIfFalsy(parentNode.ownerMapID),
		});
		this.node_revision = new MapNodeRevision(this.map.nodeDefaults);
		this.node_link = E(
			childType == MapNodeType.claim && {form: parentNode.type == MapNodeType.category ? ClaimForm.yesNoQuestion : ClaimForm.base},
			childType == MapNodeType.argument && {polarity: childPolarity},
		) as NodeChildLink;

		if (childType == MapNodeType.argument) {
			this.node.argumentType = ArgumentType.all;
			this.subNode = new MapNode({
				//ownerMapID: OmitIfFalsy(parentNode.ownerMapID),
				accessPolicy: GetDefaultAccessPolicyID_ForNode(),
				type: MapNodeType.claim, creator: userID,
			});
			this.subNode_revision = new MapNodeRevision(E(this.map.nodeDefaults, {titles: {base: title}}));
			this.subNode_link = {form: ClaimForm.base} as NodeChildLink;
		} else {
			let usedTitleKey = "base";
			if (childType == MapNodeType.claim) {
				usedTitleKey = ClaimForm[this.node_link.form!].replace(/^./, ch=>ch.toLowerCase());
			}
			this.node_revision.titles[usedTitleKey] = title;
		}
	}

	mapID: string|n;
	map: Map|n;
	node_parentPath: string;
	// get Node_Parent() { return GetNodeL3(this.node_parentPath); }
	get Node_ParentID() { return this.node_parentPath.split("/").Last(); }
	node: MapNode;
	node_revision: MapNodeRevision;
	node_link: NodeChildLink;
	subNode?: MapNode;
	subNode_revision?: MapNodeRevision;
	subNode_link: NodeChildLink;

	GetCommand(): AddArgumentAndClaim | AddChildNode {
		let result;
		if (this.node.type == MapNodeType.argument) {
			result = new AddArgumentAndClaim({
				mapID: this.mapID,
				argumentParentID: this.Node_ParentID, argumentNode: this.node, argumentRevision: this.node_revision, argumentLink: this.node_link,
				claimNode: this.subNode!, claimRevision: this.subNode_revision!, claimLink: this.subNode_link,
			});
		} else {
			result = new AddChildNode({
				mapID: this.mapID, parentID: this.Node_ParentID, node: this.node, revision: this.node_revision, link: this.node_link,
			});
		}
		return result;
	}
	async Apply(opt?: {expandSelf?: boolean, expandTruthAndRelevance?: boolean}) {
		opt = E({expandSelf: true, expandTruthAndRelevance: true}, opt);
		/* if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		} */
		runInAction("AddChildDialog.Apply_start", ()=>store.main.maps.currentNodeBeingAdded_path = `${this.node_parentPath}/?`);

		/*if (opt.uiType == AddChildDialogTab.MultiPremise) {
			this.node.multiPremiseArgument = true;
		}*/

		const command = this.GetCommand();
		let runResult_copy;
		if (this.node.type == MapNodeType.argument) {
			if (!(command instanceof AddArgumentAndClaim)) throw new Error("Expected AddArgumentAndClaim command.");
			const runResult = runResult_copy = await command.RunOnServer();

			if (opt.expandSelf) {
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${runResult.argumentNodeID}`, expanded: true, resetSubtree: false});
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${runResult.argumentNodeID}/${runResult.claimNodeID}`, expanded: true,
					expanded_truth: opt.expandTruthAndRelevance, expanded_relevance: opt.expandTruthAndRelevance, resetSubtree: false});
				runInAction("AddChildDialog.Apply_mid", ()=>{
					store.main.maps.nodeLastAcknowledgementTimes.set(runResult.argumentNodeID, Date.now());
					store.main.maps.nodeLastAcknowledgementTimes.set(runResult.claimNodeID, Date.now());
				});
			}
		} else {
			if (!(command instanceof AddChildNode)) throw new Error("Expected AddChildNode command.");
			const runResult = runResult_copy = await command.RunOnServer();

			if (opt.expandSelf) {
				ACTMapNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${runResult.nodeID}`, expanded: true,
					expanded_truth: opt.expandTruthAndRelevance, expanded_relevance: opt.expandTruthAndRelevance, resetSubtree: false});
				runInAction("AddChildDialog.Apply_mid", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(runResult.nodeID, Date.now()));
			}
		}

		runInAction("AddChildDialog.Apply_end", ()=>store.main.maps.currentNodeBeingAdded_path = null);

		return runResult_copy;
	}
}

enum AddChildDialogTab {
	Argument,
	Claim,
}
export function ShowAddChildDialog(parentPath: string, childType: MapNodeType, childPolarity: Polarity, userID: string, mapID: string|n) {
	const helper = new AddChildHelper(parentPath, childType, "", childPolarity, userID, mapID);
	const parentNode = GetNodeL3.NN(parentPath);
	const parentForm = GetNodeForm(parentNode);
	const displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);

	const map = GetMap(mapID); // "not in observer" -- humbug; technically true, but map-data must be loaded already, for this func to be called

	let root;
	let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>boxController.UpdateUI();

	let tab = AddChildDialogTab.Claim;
	const boxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = helper.GetCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.ValidateErrorStr as any,
			};

			const accessPolicy = GetAccessPolicy.CatchBail(null, helper.node.accessPolicy);
			if (accessPolicy == null) return null as any as JSX.Element; // wait
			const newNodeAsL2 = AsNodeL2(helper.node, helper.node_revision, accessPolicy);
			const newNodeAsL3 = AsNodeL3(newNodeAsL2, helper.node_link, childPolarity);

			const advanced = store.main.maps.addChildDialog.advanced;
			return (
				<Column ref={c=>root = c} style={{width: 600}}>
					{childType == MapNodeType.argument && // right now, the "advanced" UI is only different when adding an argument, so only let user see/set it in that case
					<Row center mb={5}>
						{childType == MapNodeType.argument && advanced &&
						<>
							<Text>Data:</Text>
							<Select ml={5} displayType="button bar" options={GetEntries(AddChildDialogTab)} style={{display: "inline-block"}}
								value={tab} onChange={val=>Change(tab = val)}/>
							<InfoButton ml={5} mr={5} text={`
								An "argument" consists of two parts: 1) the argument node itself, 2) the argument's premise/claim node(s)

								Use the tabs to control which part you're setting the data for.
							`.AsMultiline(0)}/>
						</>}
						<CheckBox text="Advanced" value={advanced} onChange={val=>{
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
								/*if (map?.requireMapEditorsCanEdit) {
									comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
								}*/
								helper.VSet({node: newNodeData, node_revision: newRevisionData, node_link: newLinkData});
								Change();
							}}/>
					</>}
					{tab == AddChildDialogTab.Claim &&
					<>
						{childType == MapNodeType.argument &&
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
										value={helper.subNode_revision!.titles["base"]}
										onChange={val=>Change(helper.subNode_revision!.titles["base"] = val)}/>
								</Row>
								<Row mt={5} style={{fontSize: 12}}>{`To add a second premise later, right click on your new argument and press "Convert to multi-premise".`}</Row>
							</Column>}
							{advanced &&
							<NodeDetailsUI style={{padding: "5px 0 0 0"}} parent={newNodeAsL3}
								baseData={helper.subNode!} baseRevisionData={helper.subNode_revision!} baseLinkData={helper.subNode_link} forNew={true}
								onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
									/*if (map?.requireMapEditorsCanEdit) {
										comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
									}*/
									helper.VSet({subNode: newNodeData, subNode_revision: newRevisionData, subNode_link: newLinkData});
									Change();
								}}/>}
						</>}
						{childType != MapNodeType.argument &&
						<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: childType == MapNodeType.claim ? "5px 0 0 0" : 0}} parent={parentNode}
							baseData={newNodeAsL3} baseRevisionData={helper.node_revision} baseLinkData={helper.node_link} forNew={true}
							onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
								/*if (map?.requireMapEditorsCanEdit) {
									comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
								}*/
								helper.VSet({node: newNodeData, node_revision: newRevisionData, node_link: newLinkData});
								Change();
							}}/>}
					</>}
				</Column>
			);
		}),
		onOK: ()=>{
			helper.Apply();
		},
	});
}