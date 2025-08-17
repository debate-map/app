import Moment from "moment";
import {ScrollView} from "react-vscrollview";
import {VReactMarkdown_Remarkable} from "web-vcore";
import {DMap, NodeL3, GetUser, NodeRevision, MeID, GetNodeChildren, NodeType, AsNodeL1Input, NodeLink, ChildGroup, NodeL1, GetSystemAccessPolicyID, systemPolicy_publicUngoverned_name, NodePhrasing, GetNodeRevision, GetNodeL2, CheckUserCanDeleteNode, NodeL2, AsNodeRevisionInput} from "dm_common";
import {minidenticon} from "minidenticons";
import {RunCommand_AddChildNode, RunCommand_AddNodeRevision, RunCommand_DeleteNode, RunCommand_DeleteNodeRevision} from "Utils/DB/Command.js";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button, Row, TextArea} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ShowVMenu, VMenuItem} from "react-vmenu";
import {Vector2} from "js-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import Tooltip from "rc-tooltip";
import {CatchBail} from "mobx-graphlink";
import {ShowSignInPopup} from "../../../../NavBar/UserPanel.js";
import {observer_mgl} from "mobx-graphlink";

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

export type CommentsPanel_Props = {
	show: boolean,
	map?: DMap | n,
	node: NodeL3,
	path: string
};

export const CommentsPanel = observer_mgl((props: CommentsPanel_Props)=>{
	const {show, map, node} = props;
	const rootCommentNodes = useMemo(
		()=>GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment),
		[node.id],
	);

	const nodeAccessPolicyID = useMemo(
	     ()=>(map?.nodeAccessPolicy) ?? GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name),
	     [map?.nodeAccessPolicy],
	);

	const [value, updateValue] = useState("");
	const userID = MeID();

	const addComment = async(comment: string, parentNodeID: string)=>{
		if (userID == null) {
			ShowSignInPopup();
			return false;
		}
		const commentNode = new NodeL1({
			type: NodeType.comment,
			accessPolicy: nodeAccessPolicyID,
		});
		const nodeRev = new NodeRevision({
			phrasing: NodePhrasing.Embedded({text_base: comment}),
		});
		const nodeLink = new NodeLink({
			group: ChildGroup.comment,
			orderKey: "a0",
		});
		await RunCommand_AddChildNode({
			parentID: parentNodeID,
			node: AsNodeL1Input(commentNode),
			revision: nodeRev,
			link: nodeLink,
			mapID: map ? map.id : null,
		});
		return true;
	};

	return (
		<ScrollView style={{maxHeight: 300, display: show ? "flex" : "none"}}>
			{rootCommentNodes.length === 0 ?
				<div style={{width: "100%", height: "2rem", display: "flex", justifyContent: "center", alignItems: "center"}}><p>No comments yet!</p></div> :
				rootCommentNodes.map((n, i)=><CommentNodeUI map={map} node={n} key={i} addComment={addComment} isRootNode={true} isLastNode={(rootCommentNodes.length - 1) === i}/>)
			}
			<CommentInput inputType={"Comment"} value={value}
				onSubmit={async()=>{
					// TODO: Add some sort of loading on the comment button that indicates it's going out (as the addComment returns a promise)
					const success = await addComment(value, node.id);
					// only clear the comment input if the comment is successfully added
					if (success) updateValue("");
				}}
				onCancel={()=>updateValue("")}
				onValueChange={newVal=>updateValue(newVal)}/>
		</ScrollView>
	);
});

export type CommentNodeUI_Props = {
	map: DMap|n,
	addComment: (comment: string, parentNodeID: string)=>Promise<boolean>,
	node: NodeL1,
	isRootNode: boolean,
	isLastNode: boolean,
};

type CommentNodeUI_State = {
	expand: boolean,
	value: string,
	inputType: "Reply" | "Edit",
	disableReply: boolean,
}

export const CommentNodeUI = observer_mgl((props: CommentNodeUI_Props)=>{
	const {map, addComment, node, isRootNode, isLastNode} = props;
	const [state, setState] = useState<CommentNodeUI_State>({
	    expand: false,
	    disableReply: false,
	    value: "",
	    inputType: "Reply",
	});

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

	// use CatchBail, so that comment-node's ui can display even before all deletion-checks are done (while that info is loading, it shows as undeleteable)
	const deleteError = CatchBail("Still loading...", ()=>commentNodeError(nodel2, isRootNode));
	const canDelete = deleteError == null;

	const updateValue = (newValue: string)=>{
		setState(prevState=>({...prevState, value: newValue}));
	};

	const clearAndCloseInput = ()=>{
	    setState(prev=>({...prev, value: "", expand: false, disableReply: false, inputType: "Reply"}));
	};

	const handleSubmit = async(nodeID?: string, oldNodeRevisionID?: string)=>{
		if (state.inputType === "Edit" && nodeID && oldNodeRevisionID) {
			const newNodeRevisionInput = AsNodeRevisionInput(new NodeRevision({
				phrasing: NodePhrasing.Embedded({text_base: state.value, note: "(edited)"}),
				node: nodeID,
			}));
			await RunCommand_AddNodeRevision({mapID: map ? map.id : null, revision: newNodeRevisionInput});
			await RunCommand_DeleteNodeRevision({id: oldNodeRevisionID});
			clearAndCloseInput();
		} else if (state.inputType === "Reply") {
			const success = await addComment(state.value, node.id);
			if (success) clearAndCloseInput();
		}
	};

	const onReplyClick = ()=>{
		setState(prevState=>({...prevState, expand: !prevState.expand}));
	};

	const onDeleteClick = (nodeID: string)=>{
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
	};

	const onEditClick = (value: string)=>{
		if (state.inputType !== "Edit" && !state.expand) {
			setState(prevState=>({...prevState, inputType: "Edit", expand: true, disableReply: true, value}));
		}
	};

	const onUpvoteClick = ()=>{
		// we don't support it yet!
	};

	const onDownvoteClick = ()=>{
		// we don't support it yet!
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
					<ActionButtons disableReply={state.disableReply} disableDelete={!canDelete} onUpvoteClick={onUpvoteClick} onDownvoteClick={onDownvoteClick} onToggleReplyClick={onReplyClick} onDeleteClick={()=>onDeleteClick(node.id)} onEditClick={()=>onEditClick(nodeRevision?.phrasing.text_base!)} currentNodeCreator={node.creator}/>
					{state.expand && (
						<CommentInput inputType={state.inputType} value={state.value} onSubmit={()=>handleSubmit(node.id, nodeRevision?.id)} onCancel={clearAndCloseInput} onValueChange={updateValue}/>
					)}
				</div>
				{childCommentNodes.map((n, i)=><CommentNodeUI map={map} node={n} key={n.id} addComment={addComment} isRootNode={false} isLastNode={(childCommentNodes.length - 1) === i}/>)}
			</div>
		</div>
	);
});

type ActionButtons_Props = {
	onUpvoteClick: ()=>void,
	onDownvoteClick: ()=>void,
	onToggleReplyClick: ()=>void,
	onDeleteClick: ()=>void,
	onEditClick: ()=>void,
	currentNodeCreator: string,
	disableDelete?: boolean,
	disableReply?: boolean
};

const ActionButtons = (props: ActionButtons_Props)=>{
	const {onToggleReplyClick, onDeleteClick, onEditClick, currentNodeCreator, disableDelete, disableReply} = props;
	const buttonStyle = {fontSize: "12px", color: "white", height: "20px"};

	return (
		<div style={{display: "flex", paddingTop: "5px"}}>
			<Button style={buttonStyle} p="2px 3px" text="Reply" enabled={!disableReply} onClick={onToggleReplyClick}/>
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

export type CommentInput_Props = {
	inputType: "Comment" | "Reply" | "Edit",
	onSubmit: ()=>Promise<void>,
	onCancel: ()=>void,
	value: string,
	onValueChange: (newVal: string)=>void
};

export const CommentInput = (props: CommentInput_Props)=>{
	const {inputType, onSubmit, onCancel, value, onValueChange} = props;
	const textAreaRef = useRef<TextArea>(null);

	useEffect(()=>{
		textAreaRef.current?.DOM_HTML?.focus();
	}, []);

	const placeholder = `Enter your ${inputType.toLowerCase()}`;
	const onKeyDownCapture = (e: React.KeyboardEvent<HTMLTextAreaElement>)=>{
		if (e.key === "Escape") {
			onCancel();
		} else if (e.key === "Enter" && !e.shiftKey) {
			onSubmit();
			e.preventDefault();
		}
	}

	return (
		<Row mt={8} style={{borderRadius: "5px", border: "1px solid rgba(0,0,0,.3)"}}>
			<TextArea p={5} instant value={value} onChange={onValueChange} placeholder={placeholder} autoSize={true} ref={textAreaRef}
				style={{outline: "none", borderWidth: 0, borderRadius: "5px 0 0 5px"}} onKeyDownCapture={onKeyDownCapture}
			/>
			<Button mdIcon="send" width={32} title={inputType} onClick={onSubmit} style={{height: null, borderRadius: "0 5px 5px 0"}}/>
		</Row>
	);
};
