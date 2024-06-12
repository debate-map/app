import Moment from "moment";
import {BaseComponent, BaseComponentPlus, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {Observer, VReactMarkdown_Remarkable} from "web-vcore";
import {Map, NodeL3, GetUser, NodeRevision, GetNodeRevisions, IsUserCreatorOrAdmin, HasAdminPermissions, MeID, GetNodeChildren, NodeType, NodeL1Input, AsNodeL1Input, NodeLink, ChildGroup, NodeL1, GetSystemAccessPolicyID, systemPolicy_publicUngoverned_name, NodePhrasing, GetNodePhrasings, GetNodePhrasing, GetNodeRevision} from "dm_common";
import {minidenticon} from "minidenticons";
import {RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {useMemo, useState} from "react";
import {Button, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

const MinidenticonImg = ({username, saturation, lightness, ...props})=>{
	const svgURI = useMemo(
		()=>`data:image/svg+xml;utf8,${encodeURIComponent(minidenticon(username, saturation, lightness))}`,
		[username, saturation, lightness],
	);
	return (<img src={svgURI} alt={username} {...props} />);
};

@Observer
export class CommentsPanel extends BaseComponentPlus({} as { show: boolean, map?: Map|n, node: NodeL3, path: string }, {}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {show, map, node, path} = this.props;
		const rootCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
		const nodeAccessPolicyID = (map?.nodeAccessPolicy) ?? GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name);
		const [value, updateValue] = useState("");

		const addComment = async(comment: string, parentNodeId: string)=>{

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
                parentID : parentNodeId,
                node : AsNodeL1Input(commentNode),
                revision : nodeRev,
                link : nodeLink,
                mapID : null,
			});

			console.log(res);
		};

		return (
            <ScrollView style={{position: "relative", maxHeight: 300, display: show ? "flex" : "none"}}>
                { rootCommentNodes.length === 0 ?
                    <div style={{width : "100%", height : "2rem", display :"flex", justifyContent : "center", alignItems : "center"}}><p>No Comments Yet!</p></div> :
                	rootCommentNodes.map((n, i)=><CommentNode node={n} key={i} addComment={addComment}/>)
                }
                <CommentInput input_type={"Comment"} value={value}
                onSubmit={()=>{
                	addComment(value, node.id);
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
export class CommentNode extends BaseComponent<{addComment : (comment: string, parentNodeId: string) => Promise<void>, node: NodeL1}, {}> {
	render() {
		const {addComment, node} = this.props;
		const user = GetUser(node.creator);
		const nodeRevision = GetNodeRevision(node.c_currentRevision);

		const [replyExpand, updateReplyExpand] = useState(false);
		const [value, updateValue] = useState("");
		const childCommentNodes = GetNodeChildren(node.id).filter(n=>n.type === NodeType.comment);
		const timeFromNow = (epoch_time: number)=>Moment(epoch_time).fromNow();

		const clearAndCloseInput = ()=>{
			updateValue("");
			updateReplyExpand(false);
		};

		return (
             <div style={{display : "flex", marginTop : "12px"}}>
                <div>
                    {
                       /* TODO: Make use of photoURL
                       *user?.photoURL ? <img src={user?.photoURL} alt={user?.displayName} width="30" height="30"/> :
                       */
                       <MinidenticonImg username={user?.displayName} saturation="90" width="30" height="30" lightness={100}/>
                    }
                </div>
                <div style={{whiteSpace : "break-spaces", paddingLeft : "4px", width : "100%"}}>
                    <div style={{display : "flex", paddingBottom: "5px"}}>
                        <div>{user?.displayName}{" • "}{timeFromNow(node.createdAt)}</div>
                    </div>
                    <div style={{overflowWrap : "break-word", background: "rgba(255,255,255,.15)", padding : "2px 5px", borderRadius : "5px"}}>
                        <VReactMarkdown_Remarkable source={nodeRevision?.phrasing.text_base!} />
                    </div>
                    <div style={{display: "flex", paddingTop: "5px"}}>
                        <Button style={{fontSize: "10px", color: "white", height : "20px"}} p="2px 3px" mdIcon={"thumb-up"} enabled={true} onClick={()=>{
                        	// TODO: Add upvote action
                        }}/>
                        <Button style={{fontSize: "10px", color: "white", height : "20px"}} p="2px 3px" ml={5} mdIcon={"thumb-down"} enabled={true} onClick={()=>{
                        	// TODO: Add downvote action
                        }}/>
                        <Button style={{fontSize: "10px", color: "white", height: "20px"}} p="2px 3px" ml={5} text="Reply" enabled={true} onClick={()=>{
                        	updateReplyExpand(!replyExpand);
                        }}/>
                    </div>

                    {replyExpand ? <CommentInput input_type={"Reply"} value={value}
                    onSubmit={()=>{
                    	addComment(value, node.id);
                    	// TODO: Add some sort of loading on the comment button that indicates it's going out(as the addComment returns a promise)
                    	clearAndCloseInput();
                    }} onCancel={()=>{
                    	clearAndCloseInput();
                    }} onValueChange={newVal=>{
                    	updateValue(newVal);
                    }}/> : <></>}
                    {childCommentNodes.map((n, i)=><CommentNode node={n} key={i} addComment={addComment} />)}
                </div>
             </div>
		);
	}
}

export class CommentInput extends BaseComponent<{input_type : "Comment" | "Reply", onSubmit : () => void, onCancel : () => void, value: string, onValueChange: (newVal: string) => void }, {}> {
	render() {
		const {input_type, onSubmit, onCancel, value, onValueChange} = this.props;

		return (
              <div style={{paddingTop : "8px"}}>
                  <TextArea onChange={onValueChange} value={value} placeholder={`Enter your ${input_type.toLowerCase()}`} style={{outline : "none", borderWidth : 0, height : "50px", borderRadius : "5px 5px 0 0"}}/>
                  <div style={{display: "flex", flexDirection: "row-reverse", borderRadius: "0 0 5px 5px", padding: "4px 4px 4px 0px", background: "rgba(255,255,255,0.8)"}}>
                        <Button text={"Comment"} ml={5} enabled={true} onClick={onSubmit}/>
                        <Button text={"Cancel"} enabled={true} onClick={onCancel}/>
                  </div>
              </div>
		);
	}
}
