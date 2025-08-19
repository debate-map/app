import {VURL, E} from "js-vextensions";
import Moment from "moment";
import {Column, Div, Row} from "react-vcomponents";
import {SLMode, SLMode_AI, GetSkinPrefixInfoFromMapName, GetMapNamePrefixFilterKey} from "UI/@SL/SL.js";
import {ES, HSLA, Link, RunInAction} from "web-vcore";
import {store} from "Store";
import {GetUser, DMap} from "dm_common";
import {columnWidths} from "UI/Debates";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetCinzelStyleForBold} from "Utils/Styles/Skins/SLSkin";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type Props = {
	index: number,
	last: boolean,
	map: DMap
};

export const MapEntryUI = observer_mgl((props: Props)=>{
	const {index, last, map} = props;
	const creator = map && GetUser(map.creator);

	let mapNameToDisplay = map.name;
	const prefixFilterKey = GetMapNamePrefixFilterKey();
	if (prefixFilterKey) {
		const [matchStr, _] = GetSkinPrefixInfoFromMapName(map.name, prefixFilterKey);
		if (matchStr) {
			mapNameToDisplay = mapNameToDisplay.slice(matchStr.length);
		}
	}

	const toURL = new VURL(undefined, ["debates", `${map.id}`]);
	const gadTextColor = HSLA(222, .33, .25, 1);

	return (
		<Column p="7px 10px" style={E(
			{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
			SLMode && {
				color: gadTextColor,
				fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17,
			},
			SLMode && GetCinzelStyleForBold(),
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
					<Link text={mapNameToDisplay} to={toURL.toString({domain: false})} style={E({fontSize: 17}, SLMode && {color: gadTextColor})} onClick={e=>{
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
				{!SLMode && <span style={{flex: columnWidths[1]}}>{map.edits || 0}</span>}
				{!SLMode_AI && <span style={{flex: columnWidths[2]}}>{Moment(map.editedAt).format("YYYY-MM-DD")}</span>}
				{!SLMode_AI && <span style={{flex: columnWidths[3]}}>{creator ? creator.displayName : "..."}</span>}
			</Row>
		</Column>
	);
});
