import {GetErrorMessagesUnderElement, Clone} from "js-vextensions";
import {CheckBox, Column, Pre, Row, RowLR, TextArea, TextInput} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {EquationAttachment} from "Subrepos/Server/Source/@Shared/Store/firebase/nodeRevisions/@EquationAttachment";

type Props = {baseData: EquationAttachment, creating: boolean, editing?: boolean, style?, onChange?: (newData: EquationAttachment)=>void};
// & Partial<{creator: User, variantNumber: number}>;
/* @Connect((state, {baseData, creating}: Props)=>({
	creator: !creating && GetUser(baseData.creator),
	variantNumber: !creating && GetTermVariantNumber(baseData),
})) */
export class EquationEditorUI extends BaseComponent<Props, {newData: EquationAttachment}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}

	render() {
		const {creating, editing, style, onChange} = this.props;
		const {newData} = this.state;
		const Change = (..._)=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};

		const splitAt = 100; // , width = 600;
		return (
			<Column style={style}>
				<RowLR splitAt={splitAt}>
					<Pre>LaTeX: </Pre>
					<CheckBox enabled={creating || editing} style={{width: "100%"}}
						value={newData.latex} onChange={val=>Change(val ? newData.latex = true : delete newData.latex)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Text: </Pre>
					<TextArea required enabled={creating || editing} allowLineBreaks={newData.latex} autoSize={true} style={{width: "100%"}}
						value={newData.text} onChange={val=>Change(newData.text = val)}/>
				</RowLR>
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Step in series: </Pre>
					<CheckBox enabled={editing} value={newData.isStep}
						// onChange={val=>Change(val ? newLinkData.isStep = true : delete newLinkData.isStep)}/>
						onChange={val=>Change(newData.isStep = val || null)}/>
				</Row>
				{newData.isStep &&
					<RowLR mt={5} splitAt={splitAt}>
						<Pre>Explanation: </Pre>
						<TextInput enabled={creating || editing} style={{width: "100%"}}
							value={newData.explanation} onChange={val=>Change(newData.explanation = val)}/>
					</RowLR>}
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		const result = Clone(newData) as EquationAttachment;
		if (!result.isStep) {
			delete result.explanation;
		}
		return result;
	}
}