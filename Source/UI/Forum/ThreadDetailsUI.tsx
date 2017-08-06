import {Assert} from "../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM, GetErrorMessagesUnderElement} from "../../Frame/UI/ReactGlobals";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import TextInput from "../../Frame/ReactComponents/TextInput";
import Moment from "moment";
import {GetUser, User} from "../../Store/firebase/users";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../Frame/General/Enums";
import Select from "../../Frame/ReactComponents/Select";
import {RowLR} from "../../Frame/ReactComponents/Row";
import CheckBox from "../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../Frame/ReactComponents/Button";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../Store/firebase/terms";
import InfoButton from "../../Frame/ReactComponents/InfoButton";
import {Map, Map_nameFormat} from "../../Store/firebase/maps/@Map";
import Spinner from "../../Frame/ReactComponents/Spinner";
import {Thread} from "../../Store/firebase/forum/@Thread";

type Props = {baseData: Thread, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Thread)=>void}
	& Partial<{creator: User}>;
@Connect((state, {baseData, forNew}: Props)=>({
	creator: !forNew && GetUser(baseData.creator),
}))
export default class MapDetailsUI extends BaseComponent<Props, {newData: Thread}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}

	render() {
		let {forNew, enabled, style, onChange, creator} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		let splitAt = 170, width = 600;
		return (
			<div> {/* needed so GetInnerComp() work */}
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
								<td>{(Moment as any)(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
							</tr>
						</tbody>
					</table>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Title: </Pre>
					<TextInput required
						enabled={enabled} style={{width: "100%"}}
						value={newData.title} onChange={val=>Change(newData.title = val)}/>
				</RowLR>
			</Column>
			</div>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Thread;
	}
}