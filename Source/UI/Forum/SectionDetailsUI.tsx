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
import {Section} from "../../Store/firebase/forum/@Section";

type Props = {baseData: Section, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Section)=>void}
	& Partial<{creator: User}>;
export default class SectionDetailsUI extends BaseComponent<Props, {newData: Section}> {
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
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name: </Pre>
					<TextInput required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
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
		return Clone(newData) as Section;
	}
}