import Column from "../../../Frame/ReactComponents/Column";
import {BaseComponent, Div} from "../../../Frame/UI/ReactGlobals";
import {Post} from "Store/firebase/forum/@Post";
import Row from "Frame/ReactComponents/Row";
import {User, GetUser} from "../../../Store/firebase/users";
import {Connect} from "Frame/Database/FirebaseConnect";
import Button from "Frame/ReactComponents/Button";
import Moment from "moment";
import {ShowMessageBox} from "../../../Frame/UI/VMessageBox";
import DeletePost from "Server/Commands/DeletePost";

var Markdown = require("react-remarkable");

type Props = {index: number, post: Post} & Partial<{creator: User}>;
@Connect((state, {post}: Props)=> ({
	creator: GetUser(post.creator),
}))
export class PostUI extends BaseComponent<Props, {}> {
	render() {
		let {index, post, creator} = this.props;
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
				<Column p={10}>
					<Row style={{width: "100%"}}>
						{/*post.text*/}
						<Markdown container="div" source={post.text ? post.text : "*This post has been deleted.*"}/>
					</Row>
					<Row mt="auto">
						<span style={{opacity: .5}}>{creator ? creator.displayName : "..."}, at {Moment(post.createdAt).format("YYYY-MM-DD HH:mm:ss")}</span>
						<Button ml={5} text="Edit"/>
						{index != 0 && <Button ml={5} text="Delete" onClick={()=> {
							ShowMessageBox({
								title: `Delete post`, cancelButton: true,
								message: `Delete this post?`,
								onOK: async ()=> {
									await new DeletePost({postID: post._id}).Run();
								}
							});
						}}/>}
					</Row>
				</Column>
			</Row>
		);
	}
}