import {GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {CheckBox, Column, Pre, Row, RowLR, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {Attachment, EquationAttachment} from "dm_common";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base";

export class EquationEditorUI extends DetailsUI_Base<EquationAttachment, {newData: EquationAttachment}> {
	render() {
		const {phase, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, enabled} = this.helpers;

		const splitAt = 100; // , width = 600;
		return (
			<Column style={style}>
				<RowLR splitAt={splitAt}>
					<Pre>LaTeX: </Pre>
					<CheckBox enabled={enabled} style={{width: "100%"}}
						value={newData.latex ?? false} onChange={val=>Change(val ? newData.latex = true : delete newData.latex)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Text: </Pre>
					<TextArea required enabled={enabled} allowLineBreaks={newData.latex} autoSize={true} style={{width: "100%"}}
						value={newData.text} onChange={val=>Change(newData.text = val)}/>
				</RowLR>
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Step in series: </Pre>
					<CheckBox enabled={enabled} value={newData.isStep ?? false}
						// onChange={val=>Change(val ? newLinkData.isStep = true : delete newLinkData.isStep)}/>
						onChange={val=>Change(newData.isStep = val)}/>
				</Row>
				{newData.isStep &&
					<RowLR mt={5} splitAt={splitAt}>
						<Pre>Explanation: </Pre>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newData.explanation} onChange={val=>Change(newData.explanation = val)}/>
					</RowLR>}
			</Column>
		);
	}

	GetNewData_PostProcess(newData: EquationAttachment) {
		if (!newData.isStep) {
			delete newData.explanation;
		}
	}
}