import {Assert, E, GetEntries, NN, OmitIfFalsy} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {CheckBox, Column, Pre, Row, Select, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {store} from "Store";
import {ACTNodeExpandedSet} from "Store/main/maps/mapViews/$mapView.js";
import {ES, InfoButton, Link, observer_simple, RunInAction} from "web-vcore";
import {NodeType, GetNodeTypeDisplayName, NodeLink, Map, GetAccessPolicy, Polarity, NodeL1, ClaimForm, GetMap, GetNode, NodeRevision, ArgumentType, PermissionInfoType, NodeRevision_titlePattern, AddArgumentAndClaim, AddChildNode, GetNodeL3, GetNodeForm, AsNodeL2, AsNodeL3, NodePhrasing, GetSystemAccessPolicyID, systemUserID, systemPolicy_publicUngoverned_name, GetUserHidden, MeID, ChildGroup, GetNodeLinks, OrderKey, NodeL1Input_keys, AsNodeL1Input, IsSLModeOrLayout, GetChildLayout_Final, GetNodeL2} from "dm_common";
import {BailError, CatchBail, GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {RunCommand_AddArgumentAndClaim, RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

export class AddChildHelper {
	constructor(public payload: {parentPath: string, childType: NodeType, title: string, childPolarity: Polarity, userID: string, group: ChildGroup, mapID: string|n}) {}

	Prepare() {
		const {parentPath, childType, title, childPolarity, userID, group, mapID} = this.payload;

		this.mapID = mapID;
		this.node_parentPath = parentPath;
		this.map = GetMap(mapID);
		Assert(this.map, "Map was not pre-loaded into the store. Can use this beforehand: await GetAsync(()=>GetMap(mapID));");
		const parentNode = GetNodeL2(this.Node_ParentID);
		Assert(parentNode, "Parent-node was not pre-loaded into the store. Can use this beforehand: await GetAsync(()=>GetNode(parentID));");
		const slModeOrLayout = IsSLModeOrLayout(GetChildLayout_Final(parentNode.current, this.map));

		const parent_childLinks = GetNodeLinks(this.Node_ParentID);
		const parent_lastOrderKey = parent_childLinks.OrderBy(a=>a.orderKey).LastOrX()?.orderKey ?? OrderKey.mid().toString();
		const orderKeyForOuterNode = new OrderKey(parent_lastOrderKey).next().toString();

		//const defaultPolicyID = GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name);
		const userHidden = GetUserHidden(MeID());
		if (userHidden == null) {
			throw new Error("Child-adding helper could not query user's default access-policy. (The websocket connection to the server was probably lost; refreshing the page should resolve it.)");
		}
		this.node = new NodeL1({
			//accessPolicy: GetDefaultAccessPolicyID_ForNode(),
			accessPolicy: this.map?.nodeAccessPolicy ?? userHidden.lastAccessPolicy,
			//parents: {[this.Node_ParentID]: {_: true}},
			type: childType,
		});
		this.node_revision = new NodeRevision();
		this.node_link = E(
			{
				group,
				orderKey: orderKeyForOuterNode,
			},
			//childType == NodeType.claim && {form: parentNode.type == NodeType.category ? ClaimForm.question : ClaimForm.base},
			childType == NodeType.claim && parentNode.type == NodeType.category && !slModeOrLayout && {form: ClaimForm.question},
			childType == NodeType.argument && {polarity: childPolarity},
		) as NodeLink;

		if (childType == NodeType.argument) {
			this.node.argumentType = ArgumentType.all;
			this.subNode = new NodeL1({
				//accessPolicy: GetDefaultAccessPolicyID_ForNode(),
				accessPolicy: this.map?.nodeAccessPolicy ?? userHidden.lastAccessPolicy,
				type: NodeType.claim, creator: userID,
			});
			this.subNode_revision = new NodeRevision({phrasing: NodePhrasing.Embedded({text_base: title})});
			this.subNode_link = new NodeLink({
				group: ChildGroup.generic,
				orderKey: OrderKey.mid().key,
				form: ClaimForm.base,
			});
		} else {
			let usedTitleKey = "text_base";
			if (childType == NodeType.claim && this.node_link.form) {
				usedTitleKey = `text_${ClaimForm[this.node_link.form].replace(/^./, ch=>ch.toLowerCase())}`;
			}
			this.node_revision.phrasing[usedTitleKey] = title;
		}
	}

	mapID: string|n;
	map: Map|n;
	node_parentPath: string;
	// get Node_Parent() { return GetNodeL3(this.node_parentPath); }
	get Node_ParentID() { return this.node_parentPath.split("/").Last(); }
	node: NodeL1;
	node_revision: NodeRevision;
	node_link: NodeLink;
	subNode?: NodeL1;
	subNode_revision?: NodeRevision;
	subNode_link: NodeLink;

	async Apply(opt?: {expandSelf?: boolean}) {
		opt = E({expandSelf: true}, opt);
		/* if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		} */
		RunInAction("AddChildDialog.Apply_start", ()=>store.main.maps.currentNodeBeingAdded_path = `${this.node_parentPath}/?`);

		//const command = this.GetCommand();
		let runResult_copy;
		if (this.node.type == NodeType.argument) {
			//if (!(command instanceof AddArgumentAndClaim)) throw new Error("Expected AddArgumentAndClaim command.");
			/*const command = new AddArgumentAndClaim({...});
			const runResult = runResult_copy = await command.RunOnServer();*/
			const runResult = runResult_copy = await RunCommand_AddArgumentAndClaim({
				mapID: this.mapID,
				argumentParentID: this.Node_ParentID, argumentNode: AsNodeL1Input(this.node), argumentRevision: this.node_revision, argumentLink: this.node_link,
				claimNode: AsNodeL1Input(this.subNode!), claimRevision: this.subNode_revision!, claimLink: this.subNode_link,
			});
			RunInAction("AddChildDialog.Apply_mid", ()=>{
				store.main.maps.nodeLastAcknowledgementTimes.set(runResult.argumentNodeID, runResult.doneAt);
				store.main.maps.nodeLastAcknowledgementTimes.set(runResult.claimNodeID, runResult.doneAt);
			});

			if (opt.expandSelf) {
				ACTNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${runResult.argumentNodeID}`, expanded: true, resetSubtree: false});
				ACTNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${runResult.argumentNodeID}/${runResult.claimNodeID}`, expanded: true, resetSubtree: false});
			}
		} else {
			//if (!(command instanceof AddChildNode)) throw new Error("Expected AddChildNode command.");
			const runResult = runResult_copy = await RunCommand_AddChildNode({
				mapID: this.mapID, parentID: this.Node_ParentID, node: AsNodeL1Input(this.node), revision: this.node_revision, link: this.node_link,
			});
			RunInAction("AddChildDialog.Apply_mid", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(runResult.nodeID, runResult.doneAt));

			if (opt.expandSelf) {
				ACTNodeExpandedSet({mapID: this.mapID, path: `${this.node_parentPath}/${runResult.nodeID}`, expanded: true, resetSubtree: false});
			}
		}

		RunInAction("AddChildDialog.Apply_end", ()=>store.main.maps.currentNodeBeingAdded_path = null);

		return runResult_copy;
	}
}

enum AddChildDialogTab {
	Argument,
	Claim,
}
export async function ShowAddChildDialog(parentPath: string, childType: NodeType, childPolarity: Polarity, userID: string, group: ChildGroup, mapID: string|n) {
	const helper = new AddChildHelper({parentPath, childType, title: "", childPolarity, userID, group, mapID});
	const prep = await GetAsync(()=>{
		helper.Prepare();
		const parentNode = GetNodeL3(parentPath);
		if (parentNode == null) return {canceled: true}; // musta been deleted while prepping
		const parentForm = GetNodeForm(parentNode);
		const displayName = GetNodeTypeDisplayName(childType, parentNode, parentForm, childPolarity);
		//const map = GetMap(mapID); // "not in observer" -- humbug; technically true, but map-data must be loaded already, for this func to be called
		return {parentNode, displayName};
	});
	if (prep.canceled) return;

	let root;
	let nodeEditorUI: NodeDetailsUI|n;
	const Change = (..._)=>boxController.UpdateUI();

	let tab = AddChildDialogTab.Claim;
	const boxController = ShowMessageBox({
		title: `Add ${prep.displayName}`, cancelButton: true,
		//message: observer_simple(()=>{
		message: observer(()=>{
			/*try {
				const tempCommand = helper.GetCommand();
				boxController.options.okButtonProps = {
					enabled: tempCommand.Validate_Safe() == null,
					title: tempCommand.ValidateErrorStr as any,
				};
			} catch (ex) {
				if (ex instanceof BailError) {
					boxController.options.okButtonProps = {
						enabled: false,
						title: ex.message,
					};
					return <div>Loading...</div>;
				}
				throw ex;
			}*/
			// are these CatchBail's really the best way to handle this? (maybe just use a "loading" state, and don't show the box until ready, eg. by creating a variant of the `observer` wrapper-func)
			const map = GetMap.CatchBail(null, mapID);

			const accessPolicy = GetAccessPolicy.CatchBail(null, helper.node.accessPolicy);
			if (accessPolicy == null) return null as any as JSX.Element; // wait
			//Object.defineProperty(helper.node, "policy", {configurable: true, set: val=>{ debugger; }});
			const newNodeAsL2 = AsNodeL2(helper.node, helper.node_revision, accessPolicy);
			const newNodeAsL3 = AsNodeL3(newNodeAsL2, helper.node_link, childPolarity);

			const advanced = store.main.maps.addChildDialog.advanced;
			return (
				<Column ref={c=>root = c} style={{width: 600}}>
					{childType == NodeType.argument && // right now, the "advanced" UI is only different when adding an argument, so only let user see/set it in that case
					<Row center mb={5}>
						{childType == NodeType.argument && advanced &&
						<>
							<Text>Data:</Text>
							<Select ml={5} displayType="button bar" options={GetEntries(AddChildDialogTab, "ui")} style={{display: "inline-block"}}
								value={tab} onChange={val=>Change(tab = val)}/>
							<InfoButton ml={5} mr={5} text={`
								An "argument" consists of two parts: 1) the argument node itself, 2) the argument's premise/claim node(s)

								Use the tabs to control which part you're setting the data for.
							`.AsMultiline(0)}/>
						</>}
						<CheckBox text="Advanced" value={advanced} onChange={val=>{
							RunInAction("AddChildDialog.advanced.onChange", ()=>store.main.maps.addChildDialog.advanced = val);
							if (!val) tab = AddChildDialogTab.Claim;
							Change();
						}}/>
					</Row>}
					{tab == AddChildDialogTab.Argument &&
					<>
						<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: 0}} map={map} parent={prep.parentNode}
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
						{childType == NodeType.argument &&
						<>
							{!advanced &&
							<Column>
								<Row style={{display: "flex", alignItems: "center"}}>
									<Pre>Main claim (ie. premise) that your argument will be based on: </Pre>
									<Link to="https://en.wikipedia.org/wiki/Premise" style={{marginLeft: "auto", fontSize: 12, opacity: 0.7}}>What is a premise?</Link>
								</Row>
								<Row style={{display: "flex", alignItems: "center"}}>
									<TextArea required={true} pattern={NodeRevision_titlePattern}
										allowLineBreaks={false} autoSize={true} style={ES({flex: 1})}
										value={helper.subNode_revision!.phrasing["text_base"]}
										onChange={val=>Change(helper.subNode_revision!.phrasing["text_base"] = val)}/>
								</Row>
								<Row mt={5} style={{fontSize: 12}}>{`To add a second premise later, right click on your new argument and press "Add structured child" -> "New claim".`}</Row>
							</Column>}
							{advanced &&
							<NodeDetailsUI style={{padding: "5px 0 0 0"}} map={map} parent={newNodeAsL3}
								baseData={helper.subNode!} baseRevisionData={helper.subNode_revision!} baseLinkData={helper.subNode_link} forNew={true}
								onChange={(newNodeData, newRevisionData, newLinkData, comp)=>{
									/*if (map?.requireMapEditorsCanEdit) {
										comp.state.newRevisionData.permission_edit = {type: PermissionInfoType.mapEditors};
									}*/
									helper.VSet({subNode: newNodeData, subNode_revision: newRevisionData, subNode_link: newLinkData});
									Change();
								}}/>}
						</>}
						{childType != NodeType.argument &&
						<NodeDetailsUI ref={c=>nodeEditorUI = c} style={{padding: childType == NodeType.claim ? "5px 0 0 0" : 0}} map={map} parent={prep.parentNode}
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
			helper.Apply({expandSelf: store.main.maps.autoExpandNewNodes});
		},
	});
}