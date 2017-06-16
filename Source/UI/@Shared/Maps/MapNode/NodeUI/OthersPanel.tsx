import Column from "../../../../../Frame/ReactComponents/Column";
import {Div, BaseComponent, Pre} from "../../../../../Frame/UI/ReactGlobals";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {MapNodeEnhanced, ThesisType} from "../../../../../Store/firebase/nodes/@MapNode";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {GetLinkUnderParent, GetNodeDisplayText, IsArgumentNode, GetThesisType} from "../../../../../Store/firebase/nodes/$node";
import {GetUserPermissionGroups, GetUserID, GetUser} from "Store/firebase/users";
import {GetParentNode, GetParentNodeID} from "Store/firebase/nodes";
import Row from "Frame/ReactComponents/Row";
import Button from "Frame/ReactComponents/Button";
import UpdateNodeDetails from "Server/Commands/UpdateNodeDetails";
import {ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import ReverseArgumentPolarity from "../../../../../Server/Commands/ReverseArgumentPolarity";
import {GetValues, GetEntries} from "../../../../../Frame/General/Enums";
import {CanConvertFromThesisTypeXToY} from "../../../../../Server/Commands/ChangeThesisType";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import Select from "../../../../../Frame/ReactComponents/Select";
import ChangeThesisType from "../../../../../Server/Commands/ChangeThesisType";

type Props = {node: MapNodeEnhanced, path: string};
@Connect((state, {node, path}: Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	creator: GetUser(node.creator),
}))
export default class OthersPanel extends BaseComponent<Props, {convertToType: ThesisType}> {
	render() {
		let {node, path} = this.props;
		let {convertToType} = this.state;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);

		let convertToTypes = GetEntries(ThesisType).filter(pair=>CanConvertFromThesisTypeXToY(GetThesisType(node), pair.value));
		convertToType = convertToType || convertToTypes.map(a=>a.value).FirstOrX();

		return (
			<Column sel style={{position: "relative"}}>
				<Row>Parents: {node.parents == null ? "none" : node.parents.VKeys(true).join(", ")}</Row>
				<Row>Children: {node.children == null ? "none" : node.children.VKeys(true).join(", ")}</Row>
				<Row>Path: {path}</Row>
				{IsArgumentNode(node) && creatorOrMod &&
					<Row>
						<Button mt={3} text="Reverse argument polarity" onLeftClick={()=> {
							ShowMessageBox({
								title: `Reverse argument polarity?`, cancelButton: true,
								message: `Reverse polarity of argument "${GetNodeDisplayText(node)}"?\n\nAll meta-thesis ratings will be deleted.`,
								onOK: ()=> {
									new ReverseArgumentPolarity({nodeID: node._id}).Run();
								}
							});
						}}/>
					</Row>}
				{node.type == MapNodeType.Thesis && convertToTypes.length > 0 &&
					<Row>
						<Pre>Convert to: </Pre>
						<Select options={convertToTypes} value={convertToType} onChange={val=>this.SetState({convertToType: val})}/>
						<Button ml={5} text="Convert" onClick={()=> {
							new ChangeThesisType({nodeID: node._id, newType: convertToType}).Run();
						}}/>
					</Row>}
			</Column>
		);
	}
}