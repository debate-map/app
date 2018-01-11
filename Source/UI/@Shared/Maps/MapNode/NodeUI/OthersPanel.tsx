import {Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {MapNodeL2, ClaimType} from "../../../../../Store/firebase/nodes/@MapNode";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {GetLinkUnderParent, GetNodeDisplayText, GetClaimType} from "../../../../../Store/firebase/nodes/$node";
import {GetUserPermissionGroups, GetUserID, GetUser} from "Store/firebase/users";
import {GetParentNode, GetParentNodeID} from "Store/firebase/nodes";
import {Pre, Row} from "react-vcomponents";
import {Button} from "react-vcomponents";
import UpdateNodeDetails from "Server/Commands/UpdateNodeDetails";
import {ShowMessageBox} from "react-vmessagebox";
import ReverseArgumentPolarity from "../../../../../Server/Commands/ReverseArgumentPolarity";
import {GetValues, GetEntries} from "../../../../../Frame/General/Enums";
import {CanConvertFromClaimTypeXToY} from "./../../../../../Server/Commands/ChangeClaimType";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {Select} from "react-vcomponents";
import ChangeClaimType from "./../../../../../Server/Commands/ChangeClaimType";
import { User } from "../../../../../Store/firebase/users";
import { GetNodeViewers } from "Store/firebase/nodeViewers";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import {Map} from "../../../../../Store/firebase/maps/@Map";

type Props = {map?: Map, node: MapNodeL2, path: string} & Partial<{creator: User, viewers: string[]}>;
@Connect((state, {node, path}: Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	creator: GetUser(node.creator),
	viewers: GetNodeViewers(node._id),
}))
export default class OthersPanel extends BaseComponent<Props, {convertToType: ClaimType}> {
	render() {
		let {map, node, path, viewers} = this.props;
		let mapID = map ? map._id : null;
		let {convertToType} = this.state;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);

		let convertToTypes = GetEntries(ClaimType).filter(pair=>CanConvertFromClaimTypeXToY(GetClaimType(node), pair.value));
		convertToType = convertToType || convertToTypes.map(a=>a.value).FirstOrX();

		return (
			<Column sel style={{position: "relative"}}>
				<Row>Path: {path}</Row>
				<Row>Parents: {node.parents == null ? "none" : node.parents.VKeys(true).join(", ")}</Row>
				<Row>Children: {node.children == null ? "none" : node.children.VKeys(true).join(", ")}</Row>
				<Row>Viewers: {viewers.length || "..."} <InfoButton text="The number of registered users who have had this node displayed in-map at some point."/></Row>
				{node.type == MapNodeType.Argument && creatorOrMod &&
					<Row>
						<Button mt={3} text="Reverse argument polarity" onLeftClick={()=> {
							ShowMessageBox({
								title: `Reverse argument polarity?`, cancelButton: true,
								message: `Reverse polarity of argument "${GetNodeDisplayText(node)}"?\n\nAll impact-premise ratings will be deleted.`,
								onOK: ()=> {
									new ReverseArgumentPolarity(E(mapID && {mapID}, {nodeID: node._id, path})).Run();
								}
							});
						}}/>
					</Row>}
				{node.type == MapNodeType.Claim && convertToTypes.length > 0 &&
					<Row>
						<Pre>Convert to: </Pre>
						<Select options={convertToTypes} value={convertToType} onChange={val=>this.SetState({convertToType: val})}/>
						<Button ml={5} text="Convert" onClick={()=> {
							new ChangeClaimType(E({mapID}, {nodeID: node._id, newType: convertToType})).Run();
						}}/>
					</Row>}
			</Column>
		);
	}
}