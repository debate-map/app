import {BaseComponent, BaseComponentWithConnector} from "react-vextensions";
import {Div, Pre} from "react-vcomponents";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {colors} from "../../../Frame/UI/GlobalStyles";
import {Link} from "../../../Frame/ReactComponents/Link";
import {VURL} from "js-vextensions";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetUser} from "../../../Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {ACTDebateMapSelect} from "../../../Store/main/debates";
import { columnWidths } from "UI/Debates";
import Moment from "moment";
import {ACTPersonalMapSelect} from "../../../Store/main/personal";

let connector = (state, {map}: {index: number, last: boolean, map: Map})=> ({
	creator: map && GetUser(map.creator),
});
@Connect(connector)
export class MapEntryUI extends BaseComponentWithConnector(connector, {}) {
	render() {
		let {index, last, map, creator} = this.props;
		let toURL = new VURL(null, [map.type == MapType.Personal ? "personal" : "debates", map._id+""]);
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