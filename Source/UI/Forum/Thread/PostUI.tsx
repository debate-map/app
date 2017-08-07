import Column from "../../../Frame/ReactComponents/Column";
import {BaseComponent, Div} from "../../../Frame/UI/ReactGlobals";
import {Post} from "Store/firebase/forum/@Post";
import Row from "Frame/ReactComponents/Row";
import {User, GetUser} from "../../../Store/firebase/users";
import {Connect} from "Frame/Database/FirebaseConnect";

type Props = {index: number, post: Post} & Partial<{creator: User}>;
@Connect((state, {post}: Props)=> ({
	creator: GetUser(post.creator),
}))
export class PostUI extends BaseComponent<Props, {}> {
	render() {
		let {index, post, creator} = this.props;
		return (
			<Row sel mt={index != 0 ? 20 : 0} style={{flexShrink: 0, background: "rgba(0,0,0,.7)", borderRadius: 10, alignItems: "flex-start", cursor: "auto"}}>
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
						{post.text}
					</Row>
				</Column>
			</Row>
		);
	}
}