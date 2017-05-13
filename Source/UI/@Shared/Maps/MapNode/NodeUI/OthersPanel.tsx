import Column from "../../../../../Frame/ReactComponents/Column";
import {Div, BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {MapNodeEnhanced} from "../../../../../Store/firebase/nodes/@MapNode";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {GetLinkUnderParent, GetNodeDisplayText, IsArgumentNode} from "../../../../../Store/firebase/nodes/$node";
import {GetUserPermissionGroups, GetUserID, GetUser} from "Store/firebase/users";
import {GetParentNode, GetParentNodeID} from "Store/firebase/nodes";
import Row from "Frame/ReactComponents/Row";
import Button from "Frame/ReactComponents/Button";
import UpdateNodeDetails from "Server/Commands/UpdateNodeDetails";
import {ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import ReverseArgumentPolarity from "../../../../../Server/Commands/ReverseArgumentPolarity";

type Props = {node: MapNodeEnhanced, path: string};
@Connect((state, {node, path}: Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	creator: GetUser(node.creator),
}))
export default class OthersPanel extends BaseComponent<Props, {}> {
	render() {
		let {node} = this.props;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);

		return (
			<Column style={{position: "relative"}}>
				<Row>
					<Button text="Reverse argument polarity" enabled={IsArgumentNode(node) && creatorOrMod} onLeftClick={()=> {
						ShowMessageBox({
							title: `Reverse argument polarity?`, cancelButton: true,
							message: `Reverse polarity of argument "${GetNodeDisplayText(node)}"?\n\nAll meta-thesis ratings will be deleted.`,
							onOK: ()=> {
								new ReverseArgumentPolarity({nodeID: node._id}).Run();
							}
						});
					}}/>
				</Row>
			</Column>
		);
	}
}