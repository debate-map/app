import {TransformRatingForContext} from "../../../../Store/firebase/nodeRatings";
import {Assert} from "../../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM, GetErrorMessagesUnderElement} from "../../../../Frame/UI/ReactGlobals";
import {Term, TermType, Term_nameFormat, Term_disambiguationFormat} from "../../../../Store/firebase/terms/@Term";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import Moment from "moment";
import {GetUser, User} from "../../../../Store/firebase/users";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../Frame/General/Enums";
import Select from "../../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../../Frame/ReactComponents/Row";
import CheckBox from "../../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../../Frame/ReactComponents/Button";
import TermComponent from "../../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../../Store/firebase/terms";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import {Equation} from "../../../../Store/firebase/nodes/@Equation";
import {TextArea_AutoSize} from "../../../../Frame/ReactComponents/TextArea";
import {ImageAttachment} from "../../../../Store/firebase/nodes/@MapNode";
import Spinner from "../../../../Frame/ReactComponents/Spinner";

type Props = {baseData: ImageAttachment, creating: boolean, editing?: boolean, style?, onChange?: (newData: ImageAttachment)=>void};
export default class ImageAttachmentEditorUI extends BaseComponent<Props, {newData: ImageAttachment}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}

	scrollView: ScrollView;
	render() {
		let {creating, editing, style, onChange} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		let splitAt = 100;
		return (
			<div> {/* needed so GetInnerComp() works */}
			<Column style={style}>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Image ID: </Pre>
					<Spinner min={1} enabled={creating || editing} style={{width: "100%"}}
						value={newData.id} onChange={val=>Change(newData.id = val)}/>
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
		return Clone(newData) as ImageAttachment;
	}
}