import {BaseComponent, Pre} from "../../Frame/UI/ReactGlobals";
import {Map} from "../../Store/firebase/maps/@Map";
import Column from "../../Frame/ReactComponents/Column";
import Row from "Frame/ReactComponents/Row";
import {colors} from "../../Frame/UI/GlobalStyles";
import Link from "../../Frame/ReactComponents/Link";
import {URL} from "../../Frame/General/URLs";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetUser, User} from "../../Store/firebase/users";
import {ACTDebateMapSelect} from "../../Store/main/debates";
import Moment from "moment";
import {Thread} from "../../Store/firebase/forum/@Thread";
import { columnWidths } from "UI/Forum/SubforumUI";

type Props = {index: number, last: boolean, thread: Thread} & Partial<{creator: User}>;
@Connect((state, {thread})=> ({
	creator: thread && GetUser(thread.creator),
}))
export default class ThreadEntryUI extends BaseComponent<Props, {}> {
	render() {
		let {index, last, thread, creator} = this.props;
		let toURL = new URL(null, ["forum", "threads",, thread._id+""]);
		return (
			<Column p="7px 10px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					<a href={toURL.toString({domain: false})} style={{fontSize: 17, flex: columnWidths[0]}} onClick={e=> {
						e.preventDefault();
						store.dispatch(new ACTDebateMapSelect({id: thread._id}));
					}}>
						{thread.title}
					</a>
					<span style={{flex: columnWidths[1]}}>{creator ? creator.displayName : "..."}</span>
				</Row>
			</Column>
		);
	}
}