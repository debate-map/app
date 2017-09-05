import {BaseComponent, Pre, Div} from "../../../Frame/UI/ReactGlobals";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
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
import {ACTPersonalMapSelect} from "../../../Store/main/personal";

type Props = {index: number, last: boolean, map: Map} & Partial<{creator: User}>;
@Connect((state, {map}: Props)=> ({
	creator: map && GetUser(map.creator),
}))
export default class MapEntryUI extends BaseComponent<Props, {}> {
	render() {
		let {index, last, map, creator} = this.props;
		let toURL = new URL(null, [map.type == MapType.Personal ? "personal" : "debates", map._id+""]);
		return (
			<Column p="7px 10px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					{/*<Link text={map.name} actions={d=>d(new ACTDebateMapSelect({id: map._id}))} style={{fontSize: 17, flex: columnWidths[0]}}/>*/}
					{/*<Column style={{flex: columnWidths[0]}}>
						<Link text={map.name} to={toURL.toString({domain: false})} style={{fontSize: 17}} onClick={e=> {
							e.preventDefault();
							store.dispatch(new (map.type == MapType.Personal ? ACTPersonalMapSelect : ACTDebateMapSelect)({id: map._id}));
						}}/>
						<Row style={{fontSize: 13}}>{map.note}</Row>
					</Column>*/}
					<Div style={{position: "relative", flex: columnWidths[0]}}>
						<Link text={map.name} to={toURL.toString({domain: false})} style={{fontSize: 17}} onClick={e=> {
							e.preventDefault();
							store.dispatch(new (map.type == MapType.Personal ? ACTPersonalMapSelect : ACTDebateMapSelect)({id: map._id}));
						}}/>
						{map.note &&
							<Div style={E(
								{fontSize: 11, color: "rgba(255,255,255,.5)", marginRight: 10, marginTop: 4},
								map.noteInline && {marginLeft: 15, float: "right"},
							)}>
								{map.note}
							</Div>}
					</Div>
					<span style={{flex: columnWidths[1]}}>{map.edits || 0}</span>
					<span style={{flex: columnWidths[2]}}>{Moment(map.editedAt).format("YYYY-MM-DD")}</span>
					<span style={{flex: columnWidths[3]}}>{creator ? creator.displayName : "..."}</span>
				</Row>
			</Column>
		);
	}
}