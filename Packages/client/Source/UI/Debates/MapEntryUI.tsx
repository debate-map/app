import {VURL, E} from "web-vcore/nm/js-vextensions.js";
import Moment from "web-vcore/nm/moment";
import {Column, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GADDemo, GADDemo_AI, GetAIPrefixInfoFromMapName} from "UI/@GAD/GAD.js";
import {ES, HSLA, Link, Observer, RunInAction} from "web-vcore";
import {store} from "Store";
import {runInAction} from "web-vcore/nm/mobx.js";
import {GetUser, Map} from "dm_common";
import {columnWidths} from "UI/Debates";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetCinzelStyleForBold} from "Utils/Styles/Skins/SLSkin";

@Observer
export class MapEntryUI extends BaseComponentPlus({} as {index: number, last: boolean, map: Map}, {}) {
	render() {
		const {index, last, map} = this.props;
		const creator = map && GetUser(map.creator);

		let mapNameToDisplay = map.name;
		if (GADDemo_AI) {
			const [matchStr, orderingNumber] = GetAIPrefixInfoFromMapName(map.name);
			if (matchStr) {
				mapNameToDisplay = mapNameToDisplay.slice(matchStr.length);
			}
		}

		const toURL = new VURL(undefined, ["debates", `${map.id}`]);
		const gadTextColor = HSLA(222, .33, .25, 1);
		return (
			<Column p="7px 10px" style={E(
				{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
				GADDemo && {
					color: gadTextColor,
					fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17,
				},
				GADDemo && GetCinzelStyleForBold(),
				last && {borderRadius: "0 0 10px 10px"},
			)}>
				<Row>
					{/* <Link text={map.name} actions={d=>d(new ACTDebateMapSelect({id: map._id}))} style={{fontSize: 17, flex: columnWidths[0]}}/> */}
					{/* <Column style={{flex: columnWidths[0]}}>
						<Link text={map.name} to={toURL.toString({domain: false})} style={{fontSize: 17}} onClick={e=> {
							e.preventDefault();
							store.dispatch(new (map.type == MapType.personal ? ACTPersonalMapSelect : ACTDebateMapSelect)({id: map._id}));
						}}/>
						<Row style={{fontSize: 13}}>{map.note}</Row>
					</Column> */}
					<Div style={{position: "relative", flex: columnWidths[0]}}>
						<Link text={mapNameToDisplay} to={toURL.toString({domain: false})} style={E({fontSize: 17}, GADDemo && {color: gadTextColor})} onClick={e=>{
							e.preventDefault();
							RunInAction("MapEntryUI.onClick", ()=>{
								store.main.page = "debates";
								store.main.debates.selectedMapID = map.id;
							});
						}}/>
						{map.note &&
							<Div style={ES(
								{fontSize: 11, color: "rgba(255,255,255,.5)", marginRight: 10, marginTop: 4},
								map.noteInline && {marginLeft: 15, float: "right"},
							)}>
								{map.note}
							</Div>}
					</Div>
					{!GADDemo && <span style={{flex: columnWidths[1]}}>{map.edits || 0}</span>}
					{!GADDemo_AI && <span style={{flex: columnWidths[2]}}>{Moment(map.editedAt).format("YYYY-MM-DD")}</span>}
					{!GADDemo_AI && <span style={{flex: columnWidths[3]}}>{creator ? creator.displayName : "..."}</span>}
				</Row>
			</Column>
		);
	}
}