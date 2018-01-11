import DeleteNode from "../../../../Server/Commands/DeleteNode";
import {GetDataAsync, RemoveHelpers, SlicePath} from "../../../../Frame/Database/DatabaseHelpers";
import {MapNode, MapNodeL2, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../Store/firebase/userExtras/@UserExtraInfo";
import {VMenuStub} from "react-vmenu";
import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../Store/firebase/nodes/@MapNodeType";
import {GetUserID, GetUserPermissionGroups} from "../../../../Store/firebase/users";
import {RootState} from "../../../../Store";
import {VMenu} from "react-vmenu";
import {BaseComponent} from "react-vextensions";
import {Div, Pre} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {WaitXThenRun} from "js-vextensions";
import {TextInput} from "react-vcomponents";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {DataSnapshot} from "firebase";
import {DN} from "js-vextensions";
import keycode from "keycode";
import {firebaseConnect} from "react-redux-firebase";
import {connect} from "react-redux";
import {ACTNodeCopy} from "../../../../Store/main";
import {Select} from "react-vcomponents";
import {GetEntries, GetValues} from "../../../../Frame/General/Enums";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {ForDelete_GetError, ForUnlink_GetError, GetNode, GetNodeChildrenAsync, GetNodeParentsAsync, GetParentNode, IsLinkValid, IsNewLinkValid, IsNodeSubnode, GetParentNodeL3} from "../../../../Store/firebase/nodes";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {SignInPanel, ShowSignInPopup} from "../../NavBar/UserPanel";
import {IsUserBasicOrAnon, IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {ThesisForm, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {ShowAddChildDialog} from "./NodeUI_Menu/AddChildDialog";
import { GetNodeChildren, ForCut_GetError, ForCopy_GetError } from "../../../../Store/firebase/nodes";
import {E} from "../../../../Frame/General/Globals_Free";
import {GetNodeDisplayText, GetValidNewChildTypes, GetNodeForm, GetNodeL3} from "../../../../Store/firebase/nodes/$node";
import {Map} from "../../../../Store/firebase/maps/@Map";
import LinkNode from "Server/Commands/LinkNode";
import UnlinkNode from "Server/Commands/UnlinkNode";
import CloneNode from "Server/Commands/CloneNode";
import {SplitStringBySlash_Cached} from "Frame/Database/StringSplitCache";
import { ShowAddSubnodeDialog } from "UI/@Shared/Maps/MapNode/NodeUI_Menu/AddSubnodeDialog";
import { GetPathNodes, GetPathNodeIDs } from "../../../../Store/main/mapViews";
import {GetNodeL2} from "Store/firebase/nodes/$node";

type Props = {map: Map, node: MapNodeL3, path: string, inList?: boolean}
	& Partial<{permissions: PermissionGroupSet, parentNode: MapNodeL2, copiedNode: MapNodeL2, copiedNode_asCut: boolean}>;
@Connect((_: RootState, {map, node, path}: Props)=> ({
	_: (ForUnlink_GetError(GetUserID(), map, node), ForDelete_GetError(GetUserID(), map, node)),
	//userID: GetUserID(), // not needed in Connect(), since permissions already watches its data
	permissions: GetUserPermissionGroups(GetUserID()),
	parentNode: GetParentNodeL3(path),
	copiedNode: State(a=>a.main.copiedNodePath) ? GetNodeL2(SplitStringBySlash_Cached(State(a=>a.main.copiedNodePath)).Last().ToInt()) : null,
	copiedNode_asCut: State(a=>a.main.copiedNodePath_asCut),
}))
export default class NodeUI_Menu extends BaseComponent<Props, {}> {
	render() {
		let {map, node, path, inList, permissions, parentNode, copiedNode, copiedNode_asCut} = this.props;
		let userID = GetUserID();
		let firebase = store.firebase.helpers;
		//let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValidNewChildTypes(node, path, permissions);
		let form = GetNodeForm(node, path);
		let formForChildren = node.type == MapNodeType.Category ? ThesisForm.YesNoQuestion : ThesisForm.Base;

		let nodeText = GetNodeDisplayText(node, path);

		return (
			<VMenuStub preOpen={e=>e.passThrough != true}>
				{IsUserBasicOrAnon(userID) && !inList && validChildTypes.map(childType=> {
					let childTypeInfo = MapNodeType_Info.for[childType];
					//let displayName = GetMapNodeTypeDisplayName(childType, node, form);
					let polarities = childType == MapNodeType.Argument ? [Polarity.Supporting, Polarity.Opposing] : [null];
					return polarities.map(polarity=> {
						let displayName = GetMapNodeTypeDisplayName(childType, node, ThesisForm.Base, polarity);
						return (
							<VMenuItem key={childType + "_" + polarity} text={`Add ${displayName}`} style={styles.vMenuItem} onClick={e=> {
								if (e.button != 0) return;
								if (userID == null) return ShowSignInPopup();
								
								ShowAddChildDialog(node, form, childType, polarity, userID, map._id, path);
							}}/>
						);
					});
				})}
				{IsUserBasicOrAnon(userID) && !inList && path.includes("/") && !path.includes("L") &&
					<VMenuItem text="Add subnode (in layer)" style={styles.vMenuItem}
						onClick={e=> {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();
							ShowAddSubnodeDialog(map._id, node, path);
						}}/>}
				{IsUserBasicOrAnon(userID) && node.current.impactPremise == null && !inList &&
					<VMenuItem text={copiedNode ? <span>Cut <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : `Cut`}
						enabled={ForCut_GetError(userID, map, node) == null} title={ForCut_GetError(userID, map, node)}
						style={styles.vMenuItem}
						onClick={e=> {
							e.persist();
							if (e.button == 0) {
								store.dispatch(new ACTNodeCopy({path, asCut: true}));
							} else {
								store.dispatch(new ACTNodeCopy({path: null, asCut: true}));
							}
						}}/>}
				{IsUserBasicOrAnon(userID) && node.current.impactPremise == null &&
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : `Copy`} style={styles.vMenuItem}
						enabled={ForCopy_GetError(userID, map, node) == null} title={ForCopy_GetError(userID, map, node)}
						onClick={e=> {
							e.persist();
							if (e.button == 0) {
								store.dispatch(new ACTNodeCopy({path, asCut: false}));
							} else {
								store.dispatch(new ACTNodeCopy({path: null, asCut: false}));
							}
						}}/>}
				{IsUserBasicOrAnon(userID) && copiedNode && IsNewLinkValid(node, path, copiedNode, permissions) &&
					<VMenuItem text={`Paste${copiedNode_asCut ? "" : " as link"}: "${GetNodeDisplayText(copiedNode, formForChildren).KeepAtMost(50)}"`}
						style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();

							if (copiedNode.type == MapNodeType.Argument && !copiedNode_asCut) {
								return void ShowMessageBox({title: `Argument at two locations?`, cancelButton: true, onOK: proceed, message:
`Are you sure you want to paste this argument as a linked child?

Only do this if you're sure that the impact-premise applies exactly the same to both the old parent and the new parent.${""
	} (usually it does not, ie. usually it's specific to its original parent thesis)

If not, paste the argument as a clone instead.`
								});
							}
							proceed();

							async function proceed() {
								await new LinkNode({mapID: map._id, parentID: node._id, childID: copiedNode._id, childForm: formForChildren}).Run();
								if (copiedNode_asCut) {
									let baseNodePath = State(a=>a.main.copiedNodePath);		
									let baseNodePath_ids = GetPathNodeIDs(baseNodePath);
									await new UnlinkNode({mapID: map._id, parentID: baseNodePath_ids.XFromLast(1), childID: baseNodePath_ids.Last()}).Run();
								}
							}
						}}/>}
				{IsUserBasicOrAnon(userID) && copiedNode && IsNewLinkValid(node, path, copiedNode.Extended({_id: -1}), permissions) && !copiedNode_asCut &&
					<VMenuItem text={`Paste as clone: "${GetNodeDisplayText(copiedNode, formForChildren).KeepAtMost(50)}"`} style={styles.vMenuItem} onClick={async e=> {
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();

						let baseNodePath = State(a=>a.main.copiedNodePath);
						let baseNodePath_ids = GetPathNodeIDs(baseNodePath);
						await new CloneNode({mapID: map._id, baseNodePath, newParentID: node._id}).Run();
						if (copiedNode_asCut) {
							await new UnlinkNode({mapID: map._id, parentID: baseNodePath_ids.XFromLast(1), childID: baseNodePath_ids.Last()}).Run();
						}
					}}/>}
				{IsUserCreatorOrMod(userID, node) && !inList &&
					<VMenuItem text="Unlink" enabled={ForUnlink_GetError(userID, map, node) == null} title={ForUnlink_GetError(userID, map, node)}
						style={styles.vMenuItem} onClick={async e=> {
							if (e.button != 0) return;
							/*let error = ForUnlink_GetError(userID, node);
							if (error) {
								return void ShowMessageBox({title: `Cannot unlink`, message: error});
							}*/
							
							/*let parentNodes = await GetNodeParentsAsync(node);
							if (parentNodes.length <= 1) {*/
							/*if (node.parents.VKeys(true).length <= 1) {
								return void ShowMessageBox({title: `Cannot unlink`, message: `Cannot unlink this child, as doing so would orphan it. Try deleting it instead.`});
							}*/

							//let parent = parentNodes[0];
							let parentText = GetNodeDisplayText(parentNode, path.substr(0, path.lastIndexOf(`/`)));
							ShowMessageBox({
								title: `Unlink child "${nodeText}"`, cancelButton: true,
								message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
								onOK: ()=> {
									new UnlinkNode({mapID: map._id, parentID: parentNode._id, childID: node._id}).Run();
								}
							});
						}}/>}
				{IsUserCreatorOrMod(userID, node) &&
					<VMenuItem text="Delete" enabled={ForDelete_GetError(userID, map, node) == null} title={ForDelete_GetError(userID, map, node)}
						style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;
							/*let error = ForDelete_GetError(userID, node);
							if (error) {
								return void ShowMessageBox({title: `Cannot delete`, message: error});
							}*/

							//let parentNodes = await GetNodeParentsAsync(node);
							/*if (node.parents.VKeys(true).length > 1) {
								return void ShowMessageBox({title: `Cannot delete`, message: `Cannot delete this child, as it has more than one parent. Try unlinking it instead.`});
							}*/
							//let s_ifParents = parentNodes.length > 1 ? "s" : "";
							let impactPremiseID = node.type == MapNodeType.Argument ? node.children.VKeys()[0] : null;
							let contextStr = IsNodeSubnode(node) ? ", and its placement in-layer" : ", and its link with 1 parent";

							ShowMessageBox({
								title: `Delete "${nodeText}"`, cancelButton: true,
								/*message: `Delete the node "${nodeText}"`
									+ `${impactPremiseID ? ", its 1 impact-premise" : ""}`
									+ `, and its link${s_ifParents} with ${parentNodes.length} parent${s_ifParents}?`,*/
								message: `Delete the node "${nodeText}"${impactPremiseID ? `, its 1 impact-premise` : ``}${contextStr}?`,
								onOK: ()=> {
									new DeleteNode({mapID: map._id, nodeID: node._id}).Run();
								}
							});
						}}/>}
			</VMenuStub>
		);
	}
}