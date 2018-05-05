import {Assert} from "js-vextensions";
import {BaseComponent, RenderSource} from "react-vextensions";
import {Pre, Row, Column, RowLR} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import Moment from "moment";
import {GetUser} from "../../../Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../Frame/General/Enums";
import {Select} from "react-vcomponents";
import {CheckBox} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {Button} from "react-vcomponents";
import TermComponent from "../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../Store/firebase/terms";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";
import {Map, Map_namePattern} from "../../../Store/firebase/maps/@Map";
import {Spinner} from "react-vcomponents";
 import {GetErrorMessagesUnderElement} from "js-vextensions";

type Props = {baseData: Map, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Map, ui: MapDetailsUI)=>void}
	& Partial<{creator: User}>;
@Connect((state, {baseData, forNew}: Props)=>({
	creator: !forNew && GetUser(baseData.creator),
}))
export default class MapDetailsUI extends BaseComponent<Props, {newData: Map}> {
	static defaultProps = {enabled: true};
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}

	render() {
		let {forNew, enabled, style, onChange, creator} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange) onChange(this.GetNewData(), this);
			this.Update();
		};

		let splitAt = 170, width = 600;
		return (
			<Column style={style}>
				{!forNew &&
					<table className="selectableAC" style={{/*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
						<thead>
							<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>{newData._id}</td>
								<td>{creator ? creator.displayName : `n/a`}</td>
								<td>{Moment(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
							</tr>
						</tbody>
					</table>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name: </Pre>
					<TextInput
						pattern={Map_namePattern} required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Note: </Pre>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Inline note: </Pre>
					<CheckBox enabled={enabled} style={{width: "100%"}}
						checked={newData.noteInline} onChange={val=>Change(newData.noteInline = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Default expand depth: </Pre>
					<Spinner min={1} max={3} enabled={enabled}
						value={newData.defaultExpandDepth|0} onChange={val=>Change(newData.defaultExpandDepth = val)}/>
				</RowLR>
				{/*!forNew &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Root-node ID: </Pre>
						<Spinner enabled={enabled} style={{width: "100%"}}
							value={newData.rootNode} onChange={val=>Change(newData.rootNode = val)}/>
					</RowLR>*/}
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Map;
	}
}