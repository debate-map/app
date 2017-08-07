import Column from "../../../Frame/ReactComponents/Column";
import {BaseComponent} from "../../../Frame/UI/ReactGlobals";
import {Post} from "Store/firebase/forum/@Post";

export class PostUI extends BaseComponent<{post: Post}, {}> {
	render() {
		let {post} = this.props;
		return (
			<Column>
				{post.text}
			</Column>
		);
	}
}