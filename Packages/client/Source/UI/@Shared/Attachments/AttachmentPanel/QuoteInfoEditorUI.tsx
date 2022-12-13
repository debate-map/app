import {QuoteAttachment} from "dm_common";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {CloneWithPrototypes, GetErrorMessagesUnderElement} from "web-vcore/nm/js-vextensions.js";
import {Column, Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {GetDOM} from "web-vcore/nm/react-vextensions.js";
import {MarkdownEditor, MarkdownToolbar} from "web-vcore/nm/react-vmarkdown.js";
import {CleanUpdatedSourceChains, SourceChainsEditorUI} from "../../Maps/Node/SourceChainsEditorUI.js";

//@ApplyBasicStyles
export class QuoteInfoEditorUI extends DetailsUI_Base<QuoteAttachment, QuoteInfoEditorUI> {
	render() {
		const {baseData} = this.props;
		const {newData} = this.state;
		const {Change, enabled} = this.helpers;

		return (
			<Column>
				{/*showPreview &&
				<>
					<Row key={0}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: NodeType.claim, current: {quote: CleanUpdatedQuoteAttachment(Clone(newData))}} as any, undefined, ClaimForm.base)}
							<SubPanel_Quote attachment={newData} fontSize={15}/>
						</Pre>
					</Column>
				</>*/}
				<Column mt={/*showPreview ? 5 :*/ 0}>
					<Pre>Quote text: </Pre>
					{/* <TextInput style={ES({flex: 1})}
						value={info.text} onChange={val=>Change(info.text = val)}/> */}
					{enabled && <MarkdownToolbar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>}
					<MarkdownEditor ref="editor" toolbar={false} value={newData.content} onChange={val=>Change(newData.content = val)} options={{
						scrollbarStyle: "overlay",
						lineWrapping: true,
						readOnly: !enabled,
					}}/>
				</Column>
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={enabled} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI|n;
	GetValidationError_Extras() {
		return this.chainsEditor?.GetValidationError();
	}

	GetNewData_PostProcess(newData: QuoteAttachment) {
		CleanUpdatedQuoteAttachment(newData);
	}
}

export function CleanUpdatedQuoteAttachment(attachment: QuoteAttachment) {
	CleanUpdatedSourceChains(attachment.sourceChains);
}