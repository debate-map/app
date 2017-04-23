import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {
    GetNodeDisplayText,
    GetValidChildTypes,
	GetValidNewChildTypes,
    MapNode,
    MetaThesis_ThenType,
    MetaThesis_ThenType_Info
} from "../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../Store/firebase/userExtras/@UserExtraInfo";
import {VMenuStub} from "react-vmenu";
import {MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Type} from "../../../../Frame/General/Types";
import {GetUserID, GetUserPermissionGroups} from "../../../../Store/firebase/users";
import {RootState} from "../../../../Store";
import VMenu from "react-vmenu";
import {BaseComponent, Pre, Div} from "../../../../Frame/UI/ReactGlobals";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {DataSnapshot} from "firebase";
import {DN} from "../../../../Frame/General/Globals";
import keycode from "keycode";
import {firebaseConnect} from "react-redux-firebase";
import {connect} from "react-redux";
import {ACTNodeCopy} from "../../../../Store/main";
import Select from "../../../../Frame/ReactComponents/Select";
import {GetEntries, GetValues} from "../../../../Frame/General/Enums";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {
    ForDelete_GetError,
    ForUnlink_GetError,
    GetNode,
    GetNodeParentsAsync,
    GetParentNode,
    IsLinkValid,
    IsNewLinkValid
} from "../../../../Store/firebase/nodes";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {SignInPanel, ShowSignInPopup} from "../../NavBar/UserPanel";
import {IsUserBasicOrAnon, IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
import {ShowAddChildDialog} from "./NodeUI_Menu/AddChildDialog";

type Props = {node: MapNode, path: string} & Partial<{permissions: PermissionGroupSet, parentNode: MapNode, copiedNode: MapNode}>;
@Connect((state: RootState, {path}: Props)=> {
	let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
	return {
		//userID: GetUserID(), // not needed in Connect(), since permissions already watches its data
		permissions: GetUserPermissionGroups(GetUserID()), 
		parentNode: GetParentNode(path),
		copiedNode: GetNode(state.main.copiedNode),
	};
})
export default class NodeUI_Menu extends BaseComponent<Props, {}> {
	render() {
		let {node, path, permissions, parentNode, copiedNode} = this.props;
		let userID = GetUserID();
		let firebase = store.firebase.helpers;
		//let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValidNewChildTypes(node.type, path, permissions);
		let thesisFormForThesisChild = node.type == MapNodeType.Category ? ThesisForm.YesNoQuestion : ThesisForm.Base;

		let nodeText = GetNodeDisplayText(node, path);

		return (
			<VMenuStub>
				{IsUserBasicOrAnon(userID) && validChildTypes.map(childType=> {
					let childTypeInfo = MapNodeType_Info.for[childType];
					let displayName = childTypeInfo.displayName(node);
					return (
						<VMenuItem key={childType} text={`Add ${displayName}`} style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();

							ShowAddChildDialog(node, childType, userID);
						}}/>
					);
				})}
				{IsUserBasicOrAnon(userID) && node.metaThesis == null &&
					//<VMenuItem text={copiedNode ? "Copy (right-click to clear)" : "Copy"} style={styles.vMenuItem}
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : "Copy"} style={styles.vMenuItem}
						onClick={e=> {
							e.persist();
							if (node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument) {
								return void ShowMessageBox({title: "Copy argument?", cancelButton: true, onOK: proceed, message:
`Are you sure you want to copy this argument?

Usually, it's best to make a new one (with the same title), and just copy the premises. (since an argument has a meta-thesis, which is usually specific to the parent thesis)`
								});
							}
							proceed();
							function proceed() {
								if (e.button == 0)
									store.dispatch(new ACTNodeCopy(node._id));
								else
									store.dispatch(new ACTNodeCopy(null));
							}
						}}/>}
				{IsUserBasicOrAnon(userID) && copiedNode && IsNewLinkValid(node.type, path, copiedNode, permissions) &&
					<VMenuItem text={`Paste as link: "${GetNodeDisplayText(copiedNode, thesisFormForThesisChild).KeepAtMost(50)}"`} style={styles.vMenuItem} onClick={e=> {
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();
						//Store.dispatch(new ACTNodeCopy(null));
						firebase.Ref(`nodes/${copiedNode._id}/parents`).update({[node._id]: {_: true}});
						let linkInfo = {_: true} as any;
						if (thesisFormForThesisChild)
							linkInfo.form = thesisFormForThesisChild;
						firebase.Ref(`nodes/${node._id}/children`).update({[copiedNode._id]: linkInfo});
					}}/>}
				{IsUserCreatorOrMod(userID, node) && <VMenuItem text="Unlink" style={styles.vMenuItem} onClick={async e=> {
					if (e.button != 0) return;
					let error = ForUnlink_GetError(userID, node);
					if (error)
						return void ShowMessageBox({title: "Cannot unlink", message: error});

					/*firebase.Ref("nodes").once("value", (snapshot: DataSnapshot)=> {
						//let nodes = snapshot.val().VValues(true);
						let nodes = (snapshot.val() as Object).Props().Select(a=>a.value.Extended({_id: a.name}));
						//let childNodes = node.children.Select(a=>nodes[a]);
						// todo: remove need for downloading all nodes, by have children store their parents (redundant, but practical)
						let parentNodes = nodes.Where(a=>a.children && a.children[node._id]);
						if (parentNodes.length <= 1)
							return void ShowMessageBox({title: "Cannot unlink", message: "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."});

						//let parent = parentNodes[0];
						let parentText = GetNodeDisplayText(parentNode, path.substr(0, path.lastIndexOf("/")));
						ShowMessageBox({
							title: `Unlink child "${nodeText}"`, cancelButton: true,
							message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
							onOK: ()=> {
								firebase.Ref("nodes").transaction(nodes=> {
									if (!nodes) return nodes;
									nodes[node._id].parents[parentNode._id] = null;
									nodes[parentNode._id].children[node._id] = null;
									return nodes;
								}, undefined, false);
							}
						});
					});*/

					let parentNodes = await GetNodeParentsAsync(node);
					if (parentNodes.length <= 1)
						return void ShowMessageBox({title: "Cannot unlink", message: "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."});

					//let parent = parentNodes[0];
					let parentText = GetNodeDisplayText(parentNode, path.substr(0, path.lastIndexOf("/")));
					ShowMessageBox({
						title: `Unlink child "${nodeText}"`, cancelButton: true,
						message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
						onOK: ()=> {
							firebase.Ref("nodes").transaction(nodes=> {
								if (!nodes) return nodes;
								nodes[node._id].parents[parentNode._id] = null;
								nodes[parentNode._id].children[node._id] = null;
								return nodes;
							}, undefined, false);
						}
					});
				}}/>}
				{IsUserCreatorOrMod(userID, node) && <VMenuItem text="Delete" style={styles.vMenuItem} onClick={async e=> {
					if (e.button != 0) return;
					let error = ForDelete_GetError(userID, node);
					if (error)
						return void ShowMessageBox({title: "Cannot delete", message: error});

					let parentNodes = await GetNodeParentsAsync(node);
					if (parentNodes.length > 1)
						return void ShowMessageBox({title: "Cannot delete", message: "Cannot delete this child, as it has more than one parent. Try unlinking it instead."});
					//let s_ifParents = parentNodes.length > 1 ? "s" : "";
					let metaThesisID = node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument ? node.children.VKeys()[0] : null;

					ShowMessageBox({
						title: `Delete "${nodeText}"`, cancelButton: true,
						/*message: `Delete the node "${nodeText}"`
							+ `${metaThesisID ? ", its 1 meta-thesis" : ""}`
							+ `, and its link${s_ifParents} with ${parentNodes.length} parent${s_ifParents}?`,*/
						message: `Delete the node "${nodeText}"${metaThesisID ? ", its 1 meta-thesis" : ""}, and its link with 1 parent?`,
						onOK: ()=> {
							firebase.Ref().transaction(data=> {
								if (!data) return data;

								for (let parent of parentNodes) {
									//data.nodes[node._id].parents[parent._id] = null;
									data.nodes[parent._id].children[node._id] = null;
								}
								data.nodes[node._id] = null;
								data.nodeExtras[node._id] = null;
								data.nodeRatings[node._id] = null;

								// if has meta-thesis, delete it also
								if (metaThesisID) {
									data.nodes[metaThesisID] = null;
									data.nodeExtras[metaThesisID] = null;
									data.nodeRatings[metaThesisID] = null;
								}
								
								return data;
							}, undefined, false);
						}
					});
				}}/>}
			</VMenuStub>
		);
	}
}