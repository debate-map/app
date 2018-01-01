import {BaseComponent} from "react-vextensions";
import {Map} from "../../Store/firebase/maps/@Map";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {colors} from "../../Frame/UI/GlobalStyles";
import Link from "../../Frame/ReactComponents/Link";
import {VURL} from "js-vextensions";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetUser, User} from "../../Store/firebase/users";
import {ACTDebateMapSelect} from "../../Store/main/debates";
import Moment from "moment";
import {Thread} from "../../Store/firebase/forum/@Thread";
import { columnWidths } from "UI/Forum/SubforumUI";
import {ACTThreadSelect} from "../../Store/main/forum";
import {GetThreadPosts} from "../../Store/firebase/forum";
import {Post} from "Store/firebase/forum/@Post";

type Props = {index: number, last: boolean, thread: Thread} & Partial<{creator: User, posts: Post[]}>;
@Connect((state, {thread})=> ({
	creator: thread && GetUser(thread.creator),
	posts: thread && GetThreadPosts(thread),
}))
export default class ThreadEntryUI extends BaseComponent<Props, {}> {
	render() {
		let {index, last, thread, creator, posts} = this.props;
		let toURL = new VURL(null, ["forum", "threads", thread._id+""]);
		return (
			<Column p="7px 10px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					<Link text={thread.title} actions={d=>d(new ACTThreadSelect({id: thread._id}))} style={{fontSize: 17, flex: columnWidths[0]}}/>
					<span style={{flex: columnWidths[1]}}>{creator ? creator.displayName : "..."}</span>
					<span style={{flex: columnWidths[2]}}>{posts ? posts.length : "..."}</span>
				</Row>
			</Column>
		);
	}
}