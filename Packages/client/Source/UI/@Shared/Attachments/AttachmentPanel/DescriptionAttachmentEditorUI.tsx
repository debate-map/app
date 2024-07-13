import {DescriptionAttachment} from "dm_common";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {Column, Pre} from "react-vcomponents";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";

export class DescriptionAttachmentEditorUI extends DetailsUI_Base<DescriptionAttachment, DescriptionAttachmentEditorUI> {
	render() {
		const {baseData} = this.props;
		const {newData} = this.state;
		const {Change, enabled} = this.helpers;

		return (
			<Column>
				<Column mt={/*showPreview ? 5 :*/ 0}>
					<Pre>Quote text: </Pre>
					{enabled && <MarkdownToolbar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "quote"]}/>}
					<MarkdownEditor ref="editor" toolbar={false} value={newData.text} onChange={val=>Change(newData.text = val)} options={{
						scrollbarStyle: "overlay",
						lineWrapping: true,
						readOnly: !enabled,
					}}/>
				</Column>
			</Column>
		);
	}
}