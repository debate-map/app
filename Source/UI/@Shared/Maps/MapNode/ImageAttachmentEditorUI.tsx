import {TransformRatingForContext} from "../../../../Store/firebase/nodeRatings";
import {Assert} from "js-vextensions";
import {BaseComponent, RenderSource} from "react-vextensions";
import {Pre, RowLR} from "react-vcomponents";
import {Term, TermType, Term_nameFormat, Term_disambiguationFormat} from "../../../../Store/firebase/terms/@Term";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import Moment from "moment";
import {GetUser} from "../../../../Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../Frame/General/Enums";
import {Select} from "react-vcomponents";
import {CheckBox} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {Button} from "react-vcomponents";
import TermComponent from "../../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../../Store/firebase/terms";
import {InfoButton} from "../../../../Frame/ReactComponents/InfoButton";
import {Equation} from "../../../../Store/firebase/nodes/@Equation";
import {ImageAttachment} from "../../../../Store/firebase/nodes/@MapNode";
import {Spinner} from "react-vcomponents";
 import {GetErrorMessagesUnderElement} from "js-vextensions";

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
			<Column style={style}>
				<RowLR splitAt={splitAt}>
					<Pre>Image ID: </Pre>
					<Spinner min={1} enabled={creating || editing} style={{width: "100%"}}
						value={newData.id} onChange={val=>Change(newData.id = val)}/>
				</RowLR>
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as ImageAttachment;
	}
}