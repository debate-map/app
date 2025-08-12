import {DescriptionAttachment} from "dm_common";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base.js";
import {Column, Pre} from "react-vcomponents";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";
import {useRef} from "react";
import React from "react";

export const DescriptionAttachmentEditorUI = (props: DetailsUIBaseProps<DescriptionAttachment, {}>)=>{
	const {phase, baseData, onChange} = props;
	const {newData, helpers} = useDetailsUI<DescriptionAttachment>({
		baseData,
		phase,
		onChange,
	});
	const {enabled, Change} = helpers;
	const editorRef = useRef<MarkdownEditor>(null);

	return (
		<Column>
			<Column mt={0}>
				<Pre>Quote text: </Pre>
				{enabled && <MarkdownToolbar editor={()=>editorRef.current} excludeCommands={["h1", "h2", "h3", "h4", "quote"]}/>}
				<MarkdownEditor ref={editorRef} toolbar={false} value={newData.text} onChange={val=>Change(newData.text = val)} options={{
					scrollbarStyle: "overlay",
					lineWrapping: true,
					readOnly: !enabled,
				}}/>
			</Column>
		</Column>
	);
}
