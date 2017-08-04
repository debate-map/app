import {BaseComponent, Pre} from "../../../Frame/UI/ReactGlobals";
import {Map} from "../../../Store/firebase/maps/@Map";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "Frame/ReactComponents/Row";
import {colors} from "../../../Frame/UI/GlobalStyles";
import Link from "../../../Frame/ReactComponents/Link";
import {URL} from "../../../Frame/General/URLs";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetUser, User} from "../../../Store/firebase/users";
import {ACTDebateMapSelect} from "../../../Store/main/debates";
import { columnWidths } from "UI/Debates";
import Moment from "moment";

type Props = {map: Map} & Partial<{creator: User}>;
@Connect((state, {map})=> ({
	creator: map && GetUser(map.creator),
}))
export default class MapEntryUI extends BaseComponent<Props, {}> {
	render() {
		let {map, creator} = this.props;
		let toURL = new URL(null, ["debates", map._id+""]);
		return (
			<Column mt={10} p={10} style={{background: "rgba(0,0,0,.7)", borderRadius: 5}}>
				<Row>
					<a href={toURL.toString({domain: false})} style={{fontSize: 18, flex: columnWidths[0]}} onClick={e=> {
						e.preventDefault();
						store.dispatch(new ACTDebateMapSelect({id: map._id}));
					}}>
						{map.name}
					</a>
					<span style={{flex: columnWidths[1]}}>{map.edits || 0}</span>
					<span style={{flex: columnWidths[2]}}>{Moment(map.editedAt).format("YYYY-MM-DD")}</span>
					<span style={{flex: columnWidths[3]}}>{creator ? creator.displayName : "..."}</span>
				</Row>
			</Column>
		);
	}
}