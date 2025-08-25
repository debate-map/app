import {CleanUpdatedSourceChains, QuoteAttachment} from "dm_common";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base.js";
import {Column, Pre, Row} from "react-vcomponents";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";
import {SourceChainsEditorUI, SourceChainsEditorUIElem} from "../../Maps/Node/SourceChainsEditorUI.js";
import React from "react";

export const QuoteInfoEditorUI = (props: DetailsUIBaseProps<QuoteAttachment, {}>)=>{
	const {phase, onChange, baseData} = props;

	const editorRef = React.useRef<MarkdownEditor>(null);
	const chainsEditorRef = React.useRef<SourceChainsEditorUIElem>(null);

	const {newData, helpers, containerRef} = useDetailsUI<QuoteAttachment>({
		baseData,
		phase,
		onChange,
		getNewDataPostProcess: nD=>CleanUpdatedQuoteAttachment(nD),
		getValidationErrorExtras: ()=>chainsEditorRef.current?.getValidationError(),
	});
	const {Change, enabled} = helpers;

	return (
		<Column ref={containerRef as any}>
			<Column mt={0}>
				<Pre>Quote text: </Pre>
				{enabled && <MarkdownToolbar editor={()=>editorRef.current} excludeCommands={["h1", "h2", "h3", "h4", "quote"]}/>}
				<MarkdownEditor ref={editorRef} toolbar={false} value={newData.content} onChange={val=>Change(newData.content = val)} options={{
					scrollbarStyle: "overlay",
					lineWrapping: true,
					readOnly: !enabled,
				}}/>
			</Column>
			<Row mt={5}>
				<SourceChainsEditorUI ref={chainsEditorRef} enabled={enabled} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
			</Row>
		</Column>
	);
}

export const CleanUpdatedQuoteAttachment = (attachment: QuoteAttachment)=>{
	CleanUpdatedSourceChains(attachment.sourceChains);
};
