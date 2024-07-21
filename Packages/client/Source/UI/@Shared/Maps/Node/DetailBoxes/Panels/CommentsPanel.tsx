import Moment from "moment";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {Observer, VReactMarkdown_Remarkable} from "web-vcore";
import {Map, NodeL3, GetUser, NodeRevision, MeID, GetNodeChildren, NodeType, AsNodeL1Input, NodeLink, ChildGroup, NodeL1, GetSystemAccessPolicyID, systemPolicy_publicUngoverned_name, NodePhrasing, GetNodeRevision, GetNodeL2, CheckUserCanDeleteNode, NodeL2} from "dm_common";
import {minidenticon} from "minidenticons";
import {RunCommand_AddChildNode, RunCommand_DeleteNode} from "Utils/DB/Command.js";
import {useMemo, useState} from "react";
import {Button, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "react-vmessagebox";
import {ShowVMenu, VMenuItem} from "react-vmenu";
import {Vector2} from "js-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

const MinidenticonImg = ({username, saturation, lightness, ...props})=>{
	const svgURI = useMemo(()=>`data:image/svg+xml;utf8,${encodeURIComponent(minidenticon(username, saturation, lightness))}`, [username, saturation, lightness]);
	return (<img src={svgURI} alt={username} {...props} />);
};

@Observer
export class CommentsPanel extends BaseComponentPlus({} as { show: boolean, map?: Map|n, node: NodeL3, path: string }, {}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {show, map, node} = this.props;
		const rootCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
		const nodeAccessPolicyID = (map?.nodeAccessPolicy) ?? GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name);
		const [value, updateValue] = useState("");

		const addComment = async(comment: string, parentNodeID: string)=>{
			const nodeRev = new NodeRevision({
                phrasing : NodePhrasing.Embedded({text_base : comment}),
			});

			const nodeLink = new NodeLink({
                group: ChildGroup.comment,
                orderKey : "a0",
			});

			const commentNode = new NodeL1({
                type : NodeType.comment,
                accessPolicy : nodeAccessPolicyID,
			});

			const res = await RunCommand_AddChildNode({
                parentID : parentNodeID,
                node : AsNodeL1Input(commentNode),
                revision : nodeRev,
                link : nodeLink,
                mapID : null,
			});

			console.log(res);
		};

		return (
            <ScrollView style={{maxHeight: 300, display: show ? "flex" : "none"}}>
                { rootCommentNodes.length === 0 ?
                    <div style={{width : "100%", height : "2rem", display :"flex", justifyContent : "center", alignItems : "center"}}><p>No Comments Yet!</p></div> :
                	rootCommentNodes.map((n, i)=><CommentNode node={n} key={i} addComment={addComment} isRootNode={true} isLastNode={(rootCommentNodes.length - 1) === i}/>)
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
export class CommentNode extends BaseComponent<{ addComment: (comment: string, parentNodeID: string) => Promise<void>, node: NodeL1, isRootNode: boolean, isLastNode: boolean }, { replyExpand: boolean, value: string }> {
    constructor(props) {
        super(props);
        this.state = {
            replyExpand: false,
            value: "",
        };
    }

    updateValue = newValue=>{
    	this.SetState({value: newValue});
    };

    clearAndCloseInput = ()=>{
    	this.SetState({value: "", replyExpand: false});
    };

    handleSubmit = async()=>{
    	await this.props.addComment(this.state.value, this.props.node.id);
    	this.clearAndCloseInput();
    };

    onToggleReplyClick = ()=>{
    	this.SetState({replyExpand: !this.state.replyExpand});
    };

    onDeleteClick = (nodeID: string)=>{
    	ShowMessageBox({
            title: "Delete Comment",
            message: `Are you sure you want to delete this comment? It will delete all replies as well.`,
            okButtonProps : {text : "Yes"},
            cancelButtonProps : {text : "No"},
            cancelButton : true,
            onOK: async()=>{
            	await RunCommand_DeleteNode({nodeID});
            },
    	});
    }

    onEditClick = ()=>{}

    onUpvoteClick = ()=>{}

    onDownvoteClick = ()=>{}

    render() {
    	const {node, isRootNode, isLastNode} = this.props;
    	const {replyExpand, value} = this.state;
    	const user = GetUser(node.creator);
    	const nodeRevision = GetNodeRevision(node.c_currentRevision);
    	const childCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
    	const nodel2 = GetNodeL2(node);

    	const commentNodeError = (nodel2: NodeL2, isRoot: boolean)=>{
    	    const nodeChildrens = GetNodeChildren(nodel2.id).filter(n=>n.type === NodeType.comment);
    		const rootError = CheckUserCanDeleteNode(MeID(), nodel2!, {forRecursiveCommentsDelete : !isRoot, childrenToIgnore : nodeChildrens.map(n=>n.id)});
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
                <div style={{width : "30px", position: "relative"}}>
                    <MinidenticonImg username={user?.displayName} saturation="90" width="30" height="30" lightness={100} />
                    {!isRootNode && <div style={{width: "20px", height : "30px", position : "absolute", top : "-15px", left: "-19px", borderBottom: "solid gray 2px", borderLeft: "solid gray 2px", borderBottomLeftRadius: "12px"}}></div>}
                </div>
                <div style={{whiteSpace: "break-spaces", paddingLeft: "4px", width: "100%", position: "relative"}}>
                    {(!isRootNode && !isLastNode) && <div style={{width: "30px", height : "100%", position : "absolute", borderLeft: "solid gray 2px", left: "-49px"}}></div>}
                    <div style={{position: "relative"}}>
                        <div style={{display: "flex", paddingBottom: "5px"}}>
                            {(childCommentNodes.length !== 0) && <div style={{width: "30px", maxHeight: "calc(100% - 20px)", height : "100%", position : "absolute", borderLeft: "solid gray 2px", left: "-19px", top : "30px"}}></div>}
                            <div>{user?.displayName} • <TimeFromNow timestamp={node.createdAt} /></div>
                        </div>
                        <div style={{overflowWrap: "break-word", background: "rgba(255,255,255,.15)", padding: "2px 5px", borderRadius: "5px"}}>
                            <VReactMarkdown_Remarkable source={nodeRevision?.phrasing.text_base!} />
                        </div>
                        <ActionButtons disableDelete={!!commentNodeError(nodel2!, true)} onUpvoteClick={this.onUpvoteClick} onDownvoteClick={this.onDownvoteClick} onToggleReplyClick={this.onToggleReplyClick} onDeleteClick={()=>this.onDeleteClick(node.id)} onEditClick={this.onEditClick} currentNodeCreator={node.creator}/>
                        {replyExpand && (
                            <CommentInput inputType="Reply" value={value} onSubmit={this.handleSubmit} onCancel={this.clearAndCloseInput} onValueChange={this.updateValue}/>
                        )}

                    </div>
                    {childCommentNodes.map((n, i)=><CommentNode node={n} key={i} addComment={this.props.addComment} isRootNode={false} isLastNode={(childCommentNodes.length - 1) === i}/>)}
                </div>
            </div>
    	);
    }
}

class ActionButtons extends BaseComponent<{onUpvoteClick: () => void, onDownvoteClick: () => void, onToggleReplyClick: () => void, onDeleteClick: () => void, onEditClick: () => void, currentNodeCreator: string, disableDelete? : boolean}, {}> {
    render() {
    	const {onUpvoteClick, onDownvoteClick, onToggleReplyClick, onDeleteClick, onEditClick, currentNodeCreator, disableDelete} = this.props;
    	const buttonStyle = {fontSize: "12px", color: "white", height: "20px"};

    	return (
            <div style={{display: "flex", paddingTop: "5px"}}>
                <Button style={buttonStyle} p="2px 3px" mdIcon="thumb-up" enabled={true} onClick={onUpvoteClick} />
                <Button style={buttonStyle} p="2px 3px" ml={5} mdIcon="thumb-down" enabled={true} onClick={onDownvoteClick} />
                <Button style={buttonStyle} p="2px 3px" ml={5} text="Reply" enabled={true} onClick={onToggleReplyClick} />
                {currentNodeCreator === MeID() &&
    	            <Button style={buttonStyle} ml={5} mdIcon="dots-horizontal" onClick={e=>{
                    	const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
                    	ShowVMenu(
                    		{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
                    		<>
                    			<VMenuItem text="Edit" enabled={true} style={liveSkin.Style_VMenuItem()} onClick={onEditClick} />
                    			<VMenuItem text="Delete" enabled={!disableDelete} style={liveSkin.Style_VMenuItem()} onClick={onDeleteClick}/>
                    		</>,
                    	);
    	            }}/>
            }
            </div>
    	);
    }
}

const TimeFromNow = ({timestamp})=>(
    <span>{Moment(timestamp).fromNow()}</span>
);

export class CommentInput extends BaseComponent<{ inputType: "Comment" | "Reply", onSubmit: () => Promise<void>, onCancel: () => void, value: string, onValueChange: (newVal: string) => void }, {}> {
    render() {
    	const {inputType, onSubmit, onCancel, value, onValueChange} = this.props;
    	const placeholder = `Enter your ${inputType.toLowerCase()}`;

    	return (
            <div style={{paddingTop: "8px"}}>
                <TextArea
                    onChange={onValueChange}
                    value={value}
                    placeholder={placeholder}
                    style={{outline: "none", borderWidth: 0, height: "50px", borderRadius: "5px 5px 0 0"}}
                />
                <div style={{
                    display: "flex",
                    flexDirection: "row-reverse",
                    borderRadius: "0 0 5px 5px",
                    padding: "4px 4px 4px 0px",
                    background: "rgba(255,255,255,0.8)",
                }}>
                    <Button text="Comment" ml={5} enabled={true} onClick={onSubmit} />
                    <Button text="Cancel" enabled={true} onClick={onCancel} />
                </div>
            </div>
    	);
    }
}
