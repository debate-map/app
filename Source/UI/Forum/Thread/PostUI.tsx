import Column from "../../../Frame/ReactComponents/Column";
import {BaseComponent, Div, GetInnerComp, Span} from "../../../Frame/UI/ReactGlobals";
import {Post} from "Store/firebase/forum/@Post";
import Row from "Frame/ReactComponents/Row";
import {User, GetUser} from "../../../Store/firebase/users";
import {Connect} from "Frame/Database/FirebaseConnect";
import Button from "Frame/ReactComponents/Button";
import Moment from "moment";
import {ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import DeletePost from "Server/Commands/DeletePost";
import {GetUserID} from "Store/firebase/users";
import PostEditorUI from "./PostEditorUI";
import {GetUpdates} from "../../../Frame/General/Others";
import { UpdatePost } from "Server/Commands/UpdatePost";

var Markdown = require("react-remarkable");

type Props = {index: number, post: Post} & Partial<{creator: User}>;
@Connect((state, {post}: Props)=> ({
	creator: GetUser(post.creator),
}))
export class PostUI extends BaseComponent<Props, {editing: boolean, dataError: string}> {
	postEditorUI: PostEditorUI;
	render() {
		let {index, post, creator} = this.props;
		let {editing, dataError} = this.state;

		if (editing) {
			return (
				<Column sel mt={index != 0 ? 20 : 0} style={{flexShrink: 0, background: "rgba(0,0,0,.7)", borderRadius: 10, padding: 10, alignItems: "flex-start", cursor: "auto"}}>
					<PostEditorUI ref={c=>this.postEditorUI = GetInnerComp(c) as any} baseData={post}
						onChange={(newData, comp)=> {
							this.SetState({dataError: comp.GetValidationError()});
						}}/>
					<Row mt={5}>
						<Button text="Save" enabled={dataError == null} onLeftClick={async ()=> {
							let postUpdates = GetUpdates(post, this.postEditorUI.GetNewData());
							await new UpdatePost({postID: post._id, postUpdates: postUpdates}).Run();
							this.SetState({editing: false, dataError: null});
						}}/>
						<Button ml={5} text="Cancel" onLeftClick={async ()=> {
							this.SetState({editing: false, dataError: null});
						}}/>
					</Row>
				</Column>
			)
		}

		return (
			<Row sel mt={index != 0 ? 20 : 0} style={{flexShrink: 0, background: "rgba(0,0,0,.7)", borderRadius: 10, alignItems: "initial", cursor: "auto"}}>
				<Column style={{width: 125}}>
					<Div p="5px 5px 0 5px" style={{textAlign: "center"}}>
						{creator ? creator.displayName : "..."}
					</Div>
					<Row p="3px 10px 10px 10px">
						<img src={creator ? creator.avatarUrl : ""} style={{margin: "auto", maxWidth: 105, maxHeight: 105}}/>
					</Row>
				</Column>
				<Column p={10} style={{flex: 1}}>
					<Row style={{width: "100%"}}>
						{/*post.text*/}
						<Markdown container="div" source={post.text != null ? post.text : "*This post has been deleted.*"}/>
					</Row>
					<Row mt="auto">
						<span style={{color: "rgba(255,255,255,.5)"}}>{creator ? creator.displayName : "..."}, at {Moment(post.createdAt).format("YYYY-MM-DD HH:mm:ss")}</span>
						{post.creator == GetUserID() &&
							<Button ml={5} text="Edit" onClick={()=> {
								this.SetState({editing: true});
							}}/>}
						{post.creator == GetUserID() && index != 0 && post.text != null &&
							<Button ml={5} text="Delete" onClick={()=> {
								ShowMessageBox({
									title: `Delete post`, cancelButton: true,
									message: `Delete this post?`,
									onOK: async ()=> {
										await new DeletePost({postID: post._id}).Run();
									}
								});
							}}/>}
						{post.editedAt && <Span ml="auto" style={{color: "rgba(255,255,255,.5)"}}>
							{post.text != null ? "edited" : "deleted"} at {Moment(post.editedAt).format("YYYY-MM-DD HH:mm:ss")}
						</Span>}
					</Row>
				</Column>
			</Row>
		);
	}
}