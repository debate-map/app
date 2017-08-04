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

type Props = {index: number, last: boolean, map: Map} & Partial<{creator: User}>;
@Connect((state, {map})=> ({
	creator: map && GetUser(map.creator),
}))
export default class MapEntryUI extends BaseComponent<Props, {}> {
	render() {
		let {index, last, map, creator} = this.props;
		let toURL = new URL(null, ["debates", map._id+""]);
		return (
			<Column p={10} style={E(
				{background: index % 2 == 0 ? "rgba(25,25,25,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
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