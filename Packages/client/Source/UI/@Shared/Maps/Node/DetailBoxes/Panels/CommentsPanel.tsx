import Moment from "moment";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {Observer, VReactMarkdown_Remarkable} from "web-vcore";
import {Map, NodeL3, GetUser, NodeRevision, MeID, GetNodeChildren, NodeType, AsNodeL1Input, NodeLink, ChildGroup, NodeL1, GetSystemAccessPolicyID, systemPolicy_publicUngoverned_name, NodePhrasing, GetNodeRevision, GetNodeL2, CheckUserCanDeleteNode, NodeL2, GetNodePhrasing, NodePhrasing_Embedded, GetNodePhrasings, AsNodeRevisionInput} from "dm_common";
import {minidenticon} from "minidenticons";
import {RunCommand_AddChildNode, RunCommand_AddNodeRevision, RunCommand_DeleteNode, RunCommand_DeleteNodeRevision, RunCommand_UpdateNode, RunCommand_UpdateNodePhrasing} from "Utils/DB/Command.js";
import React, {useMemo, useState} from "react";
import {Button, Row, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "react-vmessagebox";
import {ShowVMenu, VMenuItem} from "react-vmenu";
import {Vector2} from "js-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {Tooltip} from "web-vcore/nm/rc-tooltip.js";
import {GetAsync} from "mobx-graphlink";
import keycode from "keycode/index.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

const MinidenticonImg = ({username, saturation, lightness, ...props})=>{
	const svgURI = useMemo(()=>`data:image/svg+xml;utf8,${encodeURIComponent(minidenticon(username, saturation, lightness))}`, [username, saturation, lightness]);
	return (<img src={svgURI} alt={username} {...props}/>);
};

const TimeFromNow = ({timestamp})=>(
	<span>{Moment(timestamp).fromNow()}</span>
);

const ExactTime = ({timestamp})=>(
	<span>{Moment(timestamp).format("MMMM Do YYYY, h:mm:ss a")}</span>
);

@Observer
export class CommentsPanel extends BaseComponentPlus({} as {show: boolean, map?: Map | n, node: NodeL3, path: string}, {}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {show, map, node} = this.props;
		const rootCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
		const nodeAccessPolicyID = (map?.nodeAccessPolicy) ?? GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name);
		const [value, updateValue] = useState("");

		const addComment = async(comment: string, parentNodeID: string)=>{
			const nodeRev = new NodeRevision({
				phrasing: NodePhrasing.Embedded({text_base: comment}),
			});

			const nodeLink = new NodeLink({
				group: ChildGroup.comment,
				orderKey: "a0",
			});

			const commentNode = new NodeL1({
				type: NodeType.comment,
				accessPolicy: nodeAccessPolicyID,
			});

			const res = await RunCommand_AddChildNode({
				parentID: parentNodeID,
				node: AsNodeL1Input(commentNode),
				revision: nodeRev,
				link: nodeLink,
				mapID: map ? map.id : null,
			});

			console.log(res);
		};

		return (
			<ScrollView style={{maxHeight: 300, display: show ? "flex" : "none"}}>
				{rootCommentNodes.length === 0 ?
					<div style={{width: "100%", height: "2rem", display: "flex", justifyContent: "center", alignItems: "center"}}><p>No comments yet!</p></div> :
					rootCommentNodes.map((n, i)=><CommentNodeUI map={map} node={n} key={i} addComment={addComment} isRootNode={true} isLastNode={(rootCommentNodes.length - 1) === i}/>)
				}
				<CommentInput inputType={"Comment"} value={value}
					onSubmit={async()=>{
						await addComment(value, node.id);
						// TODO: Add some sort of loading on the comment button that indicates it's going out(as the addComment returns a promise)
						updateValue("");
					}} onCancel={()=>{
						updateValue("");
					}} onValueChange={newVal=>{
						updateValue(newVal);
					}}/>
			</ScrollView>
		);
	}
}

@Observer
export class CommentNodeUI extends BaseComponent<{map: Map | n, addComment: (comment: string, parentNodeID: string) => Promise<void>, node: NodeL1, isRootNode: boolean, isLastNode: boolean},
	{expand: boolean, value: string, inputType: "Reply" | "Edit", disableReply: boolean}> {

	constructor(props) {
		super(props);
		this.state = {
			expand: false,
			disableReply: false,
			value: "",
			inputType: "Reply",
		};
	}

	updateValue = newValue=>{
		this.SetState({value: newValue});
	};

	clearAndCloseInput = ()=>{
		this.SetState({value: "", expand: false, disableReply: false, inputType: "Reply"});
	};

	handleSubmit = async(nodeID?: string, oldNodeRevisionID?: string)=>{
		if (this.state.inputType === "Edit" && nodeID && oldNodeRevisionID) {
			const newNodeRevisionInput = AsNodeRevisionInput(new NodeRevision({
				phrasing: NodePhrasing.Embedded({text_base: this.state.value, note: "(edited)"}),
				node: nodeID,
			}));
			await RunCommand_AddNodeRevision({mapID: this.props.map ? this.props.map.id : null, revision: newNodeRevisionInput});
			await RunCommand_DeleteNodeRevision({id: oldNodeRevisionID});
			this.clearAndCloseInput();
		} else if (this.state.inputType === "Reply") {
			await this.props.addComment(this.state.value, this.props.node.id);
			this.clearAndCloseInput();
		}
	};

	onReplyClick = ()=>{
		this.SetState({expand: !this.state.expand});
	};

	onDeleteClick = (nodeID: string)=>{
		ShowMessageBox({
			title: "Delete Comment",
			message: `Are you sure you want to delete this comment? It will delete all replies as well.`,
			okButtonProps: {text: "Yes"},
			cancelButtonProps: {text: "No"},
			cancelButton: true,
			onOK: async()=>{
				await RunCommand_DeleteNode({nodeID});
			},
		});
	}

	onEditClick = (value: string)=>{
		if (this.state.inputType !== "Edit" && !this.state.expand) {
			this.SetState({inputType: "Edit", expand: true, disableReply: true, value});
		}
	}

	onUpvoteClick = ()=>{}
	onDownvoteClick = ()=>{}

	render() {
		const {node, isRootNode, isLastNode} = this.props;
		const {expand, value, inputType, disableReply} = this.state;
		const user = GetUser(node.creator);
		const nodeRevision = GetNodeRevision(node.c_currentRevision);
		const childCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
		const nodel2 = GetNodeL2(node)!;

		// checks if the delete button should be disabled
		const commentNodeError = (nodel2: NodeL2, isRoot: boolean)=>{
			const nodeChildrens = GetNodeChildren(nodel2.id).filter(n=>n.type === NodeType.comment);
			const rootError = CheckUserCanDeleteNode(MeID(), nodel2!, {forRecursiveCommentsDelete: !isRoot, childrenToIgnore: nodeChildrens.map(n=>n.id)});
			if (rootError) {
				return rootError;
			}

			for (const childNode of nodeChildrens) {
				const childNodeL2 = GetNodeL2(childNode)!;
				const childError = commentNodeError(childNodeL2, false);
				if (childError) {
					return childError;
				}
			}
		};

		return (
			<div style={{display: "flex", marginTop: "12px"}}>
				<div style={{width: "30px", position: "relative"}}>
					<MinidenticonImg username={user?.displayName} saturation="90" width="30" height="30" lightness={100}/>
					{!isRootNode && <div style={{width: "20px", height: "30px", position: "absolute", top: "-15px", left: "-19px", borderBottom: "solid gray 2px", borderLeft: "solid gray 2px", borderBottomLeftRadius: "12px"}}></div>}
				</div>
				<div style={{whiteSpace: "break-spaces", paddingLeft: "4px", width: "100%", position: "relative"}}>
					{(!isRootNode && !isLastNode) && <div style={{width: "30px", height: "100%", position: "absolute", borderLeft: "solid gray 2px", left: "-49px"}}></div>}
					<div style={{position: "relative"}}>
						<div style={{display: "flex", paddingBottom: "5px"}}>
							{(childCommentNodes.length !== 0) && <div style={{width: "30px", maxHeight: "calc(100% - 20px)", height: "100%", position: "absolute", borderLeft: "solid gray 2px", left: "-19px", top: "30px"}}></div>}
							<div style={{display: "flex"}}>
								<div>{user?.displayName}{" • "}</div>
								<Tooltip placement="right" overlay={<ExactTime timestamp={node.createdAt}/>}>
									<div><TimeFromNow timestamp={node.createdAt}/></div>
								</Tooltip>
								<div>{` ${nodeRevision?.phrasing.note ?? ""}`}</div>
							</div>
						</div>
						<div style={{overflowWrap: "break-word", background: "rgba(255,255,255,.15)", padding: "2px 5px", borderRadius: "5px"}}>
							<VReactMarkdown_Remarkable source={nodeRevision?.phrasing.text_base!} className="selectable"/>
						</div>
						<ActionButtons disableReply={disableReply} disableDelete={!!commentNodeError(nodel2!, true)} onUpvoteClick={this.onUpvoteClick} onDownvoteClick={this.onDownvoteClick} onToggleReplyClick={this.onReplyClick} onDeleteClick={()=>this.onDeleteClick(node.id)} onEditClick={()=>this.onEditClick(nodeRevision?.phrasing.text_base!)} currentNodeCreator={node.creator}/>
						{expand && (
							<CommentInput inputType={inputType} value={value} onSubmit={()=>this.handleSubmit(node.id, nodeRevision?.id)} onCancel={this.clearAndCloseInput} onValueChange={this.updateValue}/>
						)}
					</div>
					{childCommentNodes.map((n, i)=><CommentNodeUI map={this.props.map} node={n} key={i} addComment={this.props.addComment} isRootNode={false} isLastNode={(childCommentNodes.length - 1) === i}/>)}
				</div>
			</div>
		);
	}
}

class ActionButtons extends BaseComponent<{onUpvoteClick: () => void, onDownvoteClick: () => void, onToggleReplyClick: () => void, onDeleteClick: () => void, onEditClick: () => void, currentNodeCreator: string, disableDelete?: boolean, disableReply?: boolean}, {}> {
	render() {
		const {onUpvoteClick, onDownvoteClick, onToggleReplyClick, onDeleteClick, onEditClick, currentNodeCreator, disableDelete, disableReply} = this.props;
		const buttonStyle = {fontSize: "12px", color: "white", height: "20px"};

		return (
			<div style={{display: "flex", paddingTop: "5px"}}>
				{/*<Button style={buttonStyle} p="2px 3px" mdIcon="thumb-up" enabled={true} onClick={onUpvoteClick}/>
				<Button ml={5} style={buttonStyle} p="2px 3px" mdIcon="thumb-down" enabled={true} onClick={onDownvoteClick}/>*/}
				<Button /*ml={5}*/ style={buttonStyle} p="2px 3px" text="Reply" enabled={!disableReply} onClick={onToggleReplyClick}/>
				{currentNodeCreator === MeID() &&
					<Button style={buttonStyle} ml={5} mdIcon="dots-horizontal" onClick={e=>{
						const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
						ShowVMenu(
							{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
							<>
								<VMenuItem text="Edit" enabled={true} style={liveSkin.Style_VMenuItem()} onClick={onEditClick}/>
								<VMenuItem text="Delete" enabled={!disableDelete} style={liveSkin.Style_VMenuItem()} onClick={onDeleteClick}/>
							</>,
						);
					}}/>
				}
			</div>
		);
	}
}

export class CommentInput extends BaseComponent<{inputType: "Comment" | "Reply" | "Edit", onSubmit: () => Promise<void>, onCancel: () => void, value: string, onValueChange: (newVal: string) => void}, {}> {
	ComponentDidMount() {
		this.textAreaRef?.DOM_HTML?.focus();
	}
	textAreaRef: TextArea|n;
	render() {
		const {inputType, onSubmit, onCancel, value, onValueChange} = this.props;
		const placeholder = `Enter your ${inputType.toLowerCase()}`;

		return (
			<Row mt={8} style={{borderRadius: "5px", border: "1px solid rgba(0,0,0,.3)"}}>
				<TextArea p={5} instant value={value} onChange={onValueChange} placeholder={placeholder} autoSize={true}
					ref={c=>this.textAreaRef = c}
					style={{outline: "none", borderWidth: 0, borderRadius: "5px 0 0 5px"}}
					onKeyDownCapture={e=>{
						if (e.keyCode == keycode.codes.esc) {
							onCancel();
						} else if (e.keyCode == keycode.codes.enter && !e.shiftKey) {
							onSubmit();
							e.preventDefault();
						}
					}}/>
				{/*<Button ml={5} mdIcon="cancel" title="Cancel" onClick={onCancel}/>*/}
				<Button mdIcon="send" width={32} title={inputType} onClick={onSubmit} style={{height: null, borderRadius: "0 5px 5px 0"}}/>
			</Row>
		);
	}
}