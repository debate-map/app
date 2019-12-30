import {GetErrorMessagesUnderElement, Clone} from "js-vextensions";
import {Column, Pre, RowLR, Spinner} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {ImageAttachment} from "../../../../Store/firebase/nodes/@MapNode";

type Props = {baseData: ImageAttachment, creating: boolean, editing?: boolean, style?, onChange?: (newData: ImageAttachment)=>void};
export class ImageAttachmentEditorUI extends BaseComponent<Props, {newData: ImageAttachment}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
		{ this.SetState({newData: Clone(props.baseData)}); }
	}

	scrollView: ScrollView;
	render() {
		const {creating, editing, style, onChange} = this.props;
		const {newData} = this.state;
		const Change = _=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};

		const splitAt = 100;
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
		const {newData} = this.state;
		return Clone(newData) as ImageAttachment;
	}
}