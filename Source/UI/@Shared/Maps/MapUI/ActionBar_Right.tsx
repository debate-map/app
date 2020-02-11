import {FromJSON, GetEntries, ToNumber} from "js-vextensions";
import {Pre, Row, Select} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {store} from "Source/Store";
import {ShowChangesSinceType} from "Source/Store/main/maps/mapStates/@MapState";
import {runInAction} from "mobx";
import {Observer} from "vwebapp-framework";
import {GetMapState} from "Source/Store/main/maps/mapStates/$mapState";
import {Map} from "Subrepos/Server/Source/@Shared/Store/firebase/maps/@Map";
import {colors} from "../../../../Utils/UI/GlobalStyles";
import {LayoutDropDown} from "./ActionBar_Right/LayoutDropDown";
import {WeightingType} from "Subrepos/Server/Source/@Shared/Store/firebase/nodeRatings";

const changesSince_options = [];
changesSince_options.push({name: "None", value: `${ShowChangesSinceType.None}_null`});
for (let offset = 1; offset <= 5; offset++) {
	const offsetStr = [null, "", "2nd ", "3rd ", "4th ", "5th "][offset];
	changesSince_options.push({name: `Your ${offsetStr}last visit`, value: `${ShowChangesSinceType.SinceVisitX}_${offset}`});
}
changesSince_options.push({name: "All unclicked changes", value: `${ShowChangesSinceType.AllUnseenChanges}_null`});

@Observer
export class ActionBar_Right extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number}, {}) {
	render() {
		const {map, subNavBarWidth} = this.props;
		const mapState = GetMapState(map._key);
		const {showChangesSince_type} = mapState;
		const {showChangesSince_visitOffset} = mapState;
		const {weighting} = store.main.maps;

		const tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 0 10px",
				}}>
					<Row center mr={5}>
						<Pre>Show changes since: </Pre>
						<Select options={changesSince_options} value={`${showChangesSince_type}_${showChangesSince_visitOffset}`} onChange={val=>{
							runInAction("ActionBar_Right.ShowChangesSince.onChange", ()=>{
								const parts = val.split("_");
								mapState.showChangesSince_type = ToNumber(parts[0]);
								mapState.showChangesSince_visitOffset = FromJSON(parts[1]);
							});
						}}/>
						<Pre ml={5}>Weighting: </Pre>
						<Select options={GetEntries(WeightingType, name=>({ReasonScore: "Reason score"})[name] || name)} value={weighting} onChange={val=>{
							runInAction("ActionBar_Right.Weighting.onChange", ()=>{
								store.main.maps.weighting = val;
							});
						}}/>
					</Row>
					{/* <ShareDropDown map={map}/> // disabled for now, till we re-implement shareable map-views using json-based approach */}
					<LayoutDropDown map={map}/>
				</Row>
			</nav>
		);
	}
}