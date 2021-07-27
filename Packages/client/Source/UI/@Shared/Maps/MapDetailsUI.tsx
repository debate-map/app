import {AddMap, GetDefaultAccessPolicyID_ForMap, GetDefaultAccessPolicyID_ForMedia, IsUserCreatorOrMod, Map, MapNodeRevision_Defaultable_DefaultsForMap, Map_namePattern, MeID} from "dm_common";
import {InfoButton} from "web-vcore";
import {CloneWithPrototypes, DEL, GetErrorMessagesUnderElement, ToNumber} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink";
import {CheckBox, Column, Pre, Row, RowLR, Spinner, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {IDAndCreationInfoUI} from "../CommonPropUIs/IDAndCreationInfoUI.js";
import {DetailsUI_Base} from "../DetailsUI_Base.js";
import {PermissionsPanel} from "./MapNode/NodeDetailsUI/PermissionsPanel.js";

export class MapDetailsUI extends DetailsUI_Base<Map, MapDetailsUI> {
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;

		const creatorOrMod = IsUserCreatorOrMod(MeID(), newData);

		const splitAt = 230;
		const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<IDAndCreationInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={100} style={{width}}>
					<Pre>Name:</Pre>
					<TextInput
						pattern={Map_namePattern} required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={100} style={{width}}>
					<Pre>Note:</Pre>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={100} style={{width}}>
					<Pre>Inline note:</Pre>
					<CheckBox enabled={enabled} style={{width: "100%"}}
						value={newData.noteInline ?? false} onChange={val=>Change(newData.noteInline = val)}/>
				</RowLR>
				{/*newData.type == MapType.private && !forNew && creatorOrMod &&
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Row center>
						<Pre>Visibility:</Pre>
						<InfoButton ml={5} text={`
							Visible: Shown publicly in the list of maps. (the private/public map-types relate to who can edit the map, not who can view)
							Unlisted: Hidden in map list (other than to map editors and mods), but still accessible through: 1) direct map link, 2) node searches, 3) reading raw db contents. (so not guarantee of privacy)
						`.AsMultiline(0)}/>
					</Row>
					<Select options={GetEntries(MapVisibility)} enabled={enabled} value={newData.visibility} onChange={val=>Change(newData.visibility = val)}/>
				</RowLR>*/}
				{!creating &&
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Default expand depth:</Pre>
					<Spinner min={1} max={3} enabled={enabled}
						value={ToNumber(newData.defaultExpandDepth, 0)} onChange={val=>Change(newData.defaultExpandDepth = val)}/>
				</RowLR>}
				{/*!forNew &&
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Default timeline:</Pre>
					<TextInput enabled={enabled} value={newData.defaultTimelineID} onChange={val=>Change(newData.defaultTimelineID = val)}/>
				</RowLR>*/}
				{/* <RowLR mt={5} splitAt={splitAt} style={{ width }}>
					<Row center>
						<Pre>Allow public nodes:</Pre>
						<InfoButton ml={5} text=""/>
					</Row>
					<CheckBox enabled={enabled} value={newData.allowPublicNodes} onChange={(val) => Change(newData.allowPublicNodes = val)}/>
				</RowLR> */}
				{/*! forNew &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Root-node ID: </Pre>
						<Spinner enabled={enabled} style={{width: "100%"}}
							value={newData.rootNode} onChange={val=>Change(newData.rootNode = val)}/>
					</RowLR> */}
				{!creating && // we don't want to overwhelm new users trying to create their own map...
				<Column mt={10}>
					<CheckBox text="Node defaults:" enabled={creatorOrMod} value={newData.nodeDefaults != null} onChange={val=>{
						const defaultNodeDefaults = MapNodeRevision_Defaultable_DefaultsForMap();
						newData.VSet("nodeDefaults", val ? defaultNodeDefaults : DEL);
						this.Update();
					}}/>
					{newData.nodeDefaults != null &&
					<Column ml={20}>
						<PermissionsPanel newRevisionData={newData.nodeDefaults} enabled={enabled} forDefaultsInMap={true} Change={()=>{
							/*if (newData.nodeDefaults.permission_edit.type == PermissionInfoType.creator && newData.requireMapEditorsCanEdit) {
								newData.nodeDefaults.permission_edit.type = PermissionInfoType.mapEditors;
							}*/
							this.Update();
						}}/>
					</Column>}
				</Column>}
			</Column>
		);
	}
}

export async function ShowAddMapDialog() {
	const prep = await GetAsync(()=>{
		return {
			accessPolicy: GetDefaultAccessPolicyID_ForMap(),
		};
	});

	let newMap = new Map({
		accessPolicy: prep.accessPolicy,
		name: "",
		editors: [MeID.NN()],
	});

	let error = null;
	const Change = (..._)=>boxController.UpdateUI();
	const boxController = ShowMessageBox({
		title: "Add map", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: error == null};
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MapDetailsUI baseData={newMap} phase="create" onChange={(val, _, ui)=>Change(newMap = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=>{
			new AddMap({map: newMap}).RunOnServer();
		},
	});
}