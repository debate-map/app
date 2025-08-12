import {CheckBox, Column, Pre, Row, RowLR, TextArea, TextInput} from "react-vcomponents";
import {EquationAttachment} from "dm_common";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base";
import React from "react";

export const EquationEditorUI = (props: DetailsUIBaseProps<EquationAttachment, {}>)=>{
	const {phase, style, onChange} = props;
	const {newData, helpers} = useDetailsUI<EquationAttachment>({
		baseData: props.baseData,
		phase,
		onChange,
		getNewDataPostProcess: nD=>{ if (!nD.isStep) delete nD.explanation; }
	});
	const {Change, enabled} = helpers;

	const splitAt = 100;
	return (
		<Column style={style}>
			<RowLR splitAt={splitAt}>
				<Pre>LaTeX: </Pre>
				<CheckBox enabled={enabled} style={{width: "100%"}} value={newData.latex ?? false} onChange={val=>Change(val ? newData.latex = true : delete newData.latex)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Text: </Pre>
				<TextArea required enabled={enabled} allowLineBreaks={newData.latex} autoSize={true} style={{width: "100%"}} value={newData.text} onChange={val=>Change(newData.text = val)}/>
			</RowLR>
			<Row mt={5} style={{display: "flex", alignItems: "center"}}>
				<Pre>Step in series: </Pre>
				<CheckBox enabled={enabled} value={newData.isStep ?? false} onChange={val=>Change(newData.isStep = val)}/>
			</Row>
			{newData.isStep &&
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Explanation: </Pre>
					<TextInput enabled={enabled} style={{width: "100%"}} value={newData.explanation} onChange={val=>Change(newData.explanation = val)}/>
				</RowLR>}
		</Column>
	);
};
