import {Polarity, MapNodeL3} from "../../../../../Store/firebase/nodes/@MapNode";
import {BaseComponent} from "react-vextensions";
import {Button} from "react-vcomponents";
import {GetNodeColor, MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {GetUserID} from "Store/firebase/users";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import {ShowAddChildDialog} from "../NodeUI_Menu/AddChildDialog";

export class AddArgumentButton extends BaseComponent<{map: Map, node: MapNodeL3, path: string, polarity: Polarity, style?}, {}> {
	render() {
		let {map, node, path, polarity, style} = this.props;
		let backgroundColor = GetNodeColor({type: MapNodeType.Argument, finalPolarity: polarity} as MapNodeL3);
		
		return (
			<Button text="Add argument" title={`Add ${Polarity[polarity].toLowerCase()} argument`}
				//text={`Add ${Polarity[polarity].toLowerCase()} argument`}
				style={E(
					{
						alignSelf: "flex-end", backgroundColor: backgroundColor.css(),
						border: "none", boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
						//width: 150, padding: "2px 12px",
						width: 90, padding: "2px 12px",
						":hover": {backgroundColor: backgroundColor.Mix("white", .05).alpha(.9).css()},
					},
					/*polarity == Polarity.Supporting && {marginBottom: 5},
					polarity == Polarity.Opposing && {marginTop: 5},*/
					{height: 17, fontSize: 11, padding: "0 12px"}, // vertical
					//{fontSize: 18, padding: "0 12px"}, // horizontal
					style,
				)}
				onClick={e=> {
					if (e.button != 0) return;
					if (GetUserID() == null) return ShowSignInPopup();
					
					ShowAddChildDialog(node, path, MapNodeType.Argument, polarity, GetUserID(), map._id);
				}}/>
		);
	}
}