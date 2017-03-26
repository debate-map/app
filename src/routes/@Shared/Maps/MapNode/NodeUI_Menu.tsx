import VMenu from "react-vmenu";
import {MapNodeType_Info} from "../MapNodeType";
import {BaseComponent} from "../../../../Frame/UI/ReactGlobals";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {MapNode} from "../MapNode";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {DataSnapshot} from "firebase";
import {DN} from "../../../../Frame/General/Globals";
import keycode from "keycode";
import {firebaseConnect} from "react-redux-firebase";

@firebaseConnect()
export default class NodeUI_Menu extends BaseComponent<{node: MapNode, userID: string}, {}> {
	render() {
		let {node, userID, firebase} = this.props;
		return (
			<VMenu contextMenu={true} onBody={true}>
				{MapNodeType_Info.for[node.type].childTypes.map(childType=> {
					let childTypeInfo = MapNodeType_Info.for[childType];
					return (
						<VMenuItem key={childType} text={`Add ${childTypeInfo.displayName}`} style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;
							let title = "";
							let boxController = ShowMessageBox({
								title: `Add ${childTypeInfo.displayName}`, cancelButton: true,
								messageUI: ()=>(
									<div style={{padding: "10px 0"}}>
										Title: <TextInput ref={a=>a && WaitXThenRun(0, ()=>a.DOM.focus())} style={{width: 500}}
											onKeyDown={e=> {
												if (e.keyCode != keycode.codes.enter) return;
												boxController.options.onOK();
												boxController.Close();
											}}
											value={title} onChange={val=>DN(title = val, boxController.UpdateUI())}/>
									</div>
								),
								onOK: ()=> {
									firebase.Ref("nodes").transaction(nodes=> {
										if (!nodes) return nodes;

										let newID = (nodes as Object).Props.Select(a=>a.name.KeyToInt).Max() + 1;
										nodes[node._key].children = {
											...nodes[node._key].children,
											[newID.IntToKey]: {_: true}
										};
										nodes[newID.IntToKey] = new MapNode({
											type: childType, title,
											creator: userID, approved: true,
										});
										return nodes;
									}, undefined, false);
								}
							});
						}}/>
					);
				})}
				<VMenuItem text="Edit title" style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;
					let title = node.title;
					let boxController = ShowMessageBox({
						title: `Edit title`, cancelButton: true,
						messageUI: ()=>(
							<div style={{padding: "10px 0"}}>
								<div>Old title: {node.title}</div>
								<div>
									New title: {}
									<TextInput ref={a=>a && WaitXThenRun(0, ()=>a.DOM.focus())} style={{width: 500}}
										onKeyDown={e=> {
											if (e.keyCode != keycode.codes.enter) return;
											boxController.options.onOK();
											boxController.Close();
										}}
										value={title} onChange={val=>DN(title = val, boxController.UpdateUI())}/>
								</div>
							</div>
						),
						onOK: ()=> {
							firebase.Ref(`nodes/${node._key}`).update({title});
						}
					});
				}}/>
				<VMenuItem text="Delete" style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;
					if ((node.children || {}).VKeys().length)
						return void ShowMessageBox({title: "Cannot delete", message: "Cannot delete this node until all its children have been deleted or unlinked."});
					firebase.Ref("nodes").once("value", (snapshot: DataSnapshot)=> {
						let nodes = (snapshot.val() as Object).Props.Select(a=>a.value.Extended({_key: a.name}));
						//let childNodes = node.children.Select(a=>nodes[a]);
						let parentNodes = nodes.Where(a=>a.children && a.children[node._key]);
						let s_ifParents = parentNodes.length > 1 ? "s" : "";
						ShowMessageBox({
							title: `Delete "${node.title}"`, cancelButton: true,
							message: `Delete the node "${node.title}", and its link${s_ifParents} with ${parentNodes.length} parent-node${s_ifParents}?`,
							onOK: ()=> {
								firebase.Ref("nodes").transaction(nodes=> {
									if (!nodes) return nodes;
									for (let parent of parentNodes)
										nodes[parent._key].children[node._key] = null;
									nodes[node._key] = null;
									return nodes;
								}, undefined, false);
							}
						});
					});
				}}/>
			</VMenu>
		);
	}
}