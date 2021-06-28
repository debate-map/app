import {GetEntries} from "web-vcore/nm/js-vextensions";
import {CheckBox, Row, RowLR, Select, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {GetOpenMapID} from "Store/main";
import {InfoButton} from "web-vcore";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI";
import {MapNodeRevision_Defaultable, GetMap, PermissionInfoType, HasModPermissions, MeID, AccessLevel, GetUserAccessLevel, HasAdminPermissions, MapType} from "dm_common";

// @Observer
// export class PermissionsOptions extends BaseComponent<Pick<SharedProps, 'newData' | 'newRevisionData' | 'enabled' | 'Change'> & {forDefaultsInMap?: boolean}, {}> {
export class PermissionsPanel extends BaseComponent<Pick<NodeDetailsUI_SharedProps, "enabled" | "Change"> & {newRevisionData: MapNodeRevision_Defaultable, forDefaultsInMap?: boolean}, {}> {
	render() {
		/*const {newRevisionData, enabled, Change, forDefaultsInMap} = this.props;
		const openMapID = GetOpenMapID();
		const openMap = GetMap(openMapID);

		// probably temp
		if (newRevisionData.permission_edit == null) {
			newRevisionData.permission_edit = {type: PermissionInfoType.Creator};
		}
		if (newRevisionData.permission_contribute == null) {
			newRevisionData.permission_contribute = {type: PermissionInfoType.Anyone};
		}

		const splitAt = 80;
		return (
			<>
				{!forDefaultsInMap &&
				<Row center style={{fontSize: 13, opacity: .5}}>
					<Text>Note: In addition to the groups listed below, mods and admins always have full permissions.</Text>
				</Row>}
				{HasModPermissions(MeID()) &&
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>View:</Text>
					<Select options={GetEntries(AccessLevel).filter(a=>a.value <= GetUserAccessLevel(MeID()))} enabled={enabled}
						value={newRevisionData.accessLevel || AccessLevel.Basic}
						// onChange={val => Change(val == AccessLevel.Basic ? delete newRevisionData.accessLevel : newRevisionData.accessLevel = val)}/>
						onChange={val=>Change(newRevisionData.accessLevel = val)}/>
					<InfoButton ml={5} text="Allows viewing/accessing the node -- both in maps, and when directly linked. (creator always allowed)"/>
				</RowLR>}
				{HasAdminPermissions(MeID()) &&
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>Rate:</Text>
					<CheckBox enabled={enabled} value={newRevisionData.votingEnabled} onChange={val=>Change(newRevisionData.votingDisabled = val ? null : true)}/>
				</RowLR>}
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>Edit:</Text>
					<Select options={GetEntries(PermissionInfoType)} enabled={enabled}
						value={newRevisionData.permission_edit.type}
						onChange={val=>Change(newRevisionData.permission_edit.type = val)}/>
					<InfoButton ml={5} text={`
						Allows changing values in ${forDefaultsInMap ? "the node's" : "this"} Details panel.
						* Creator: Only the node creator is allowed.
						* MapEditors: Only editors of the current map (and node creator) are allowed.
						* Anyone: Any signed-in user is allowed.
					`.AsMultiline(0)}/>
					{/* newRevisionData.permission_edit.type == PermissionInfoType.mapEditors &&
						<Text ml={5} sel style={{ opacity: 0.5 }}>(of map: {newData.ownerMapID})</Text> *#/}
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>Contribute:</Text>
					<Select options={GetEntries(PermissionInfoType).filter(a=>(openMap?.type != MapType.private && !HasModPermissions(MeID()) ? a.value == PermissionInfoType.Anyone : true))} enabled={enabled}
						value={newRevisionData.permission_contribute.type}
						// onChange={val => Change(val == AccessLevel.Basic ? delete newRevisionData.accessLevel : newRevisionData.accessLevel = val)}/>
						onChange={val=>Change(newRevisionData.permission_contribute.type = val)}/>
					<InfoButton ml={5} text={`
						Allows adding children nodes (and removing the entries one has added).
						* Creator: Only the node creator is allowed.
						* MapEditors: Only editors of the current map (and node creator) are allowed.
						* Anyone: Any signed-in user is allowed. (required for public/global maps)
					`.AsMultiline(0)}/>
					{/* newRevisionData.permission_contribute.type == PermissionInfoType.mapEditors &&
						<Text ml={5} sel style={{ opacity: 0.5 }}>(of map: {newData.ownerMapID})</Text> *#/}
				</RowLR>
			</>
		);*/
		return null;
	}
}