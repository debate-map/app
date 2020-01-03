import {GetErrorMessagesUnderElement, Clone} from "js-vextensions";
import {Column, Pre, Row} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";
import {QuoteAttachment} from "../../../../Store/firebase/nodeRevisions/@QuoteAttachment";
import {GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";
import {ClaimForm} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {SubPanel_Quote} from "./NodeUI_Inner/SubPanel";
import {SourceChainsEditorUI, CleanUpdatedSourceChains} from "./SourceChainsEditorUI";

// @ApplyBasicStyles
export class QuoteInfoEditorUI extends BaseComponent
		<{
			creating?: boolean, editing?: boolean, baseData: QuoteAttachment, showPreview: boolean, justShowed: boolean, onChange?: (newData: QuoteAttachment)=>void,
		},
		{newData: QuoteAttachment}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
		{ this.SetState({newData: Clone(props.baseData)}); }
	}

	render() {
		const {creating, editing, showPreview, justShowed, onChange} = this.props;
		const {newData} = this.state;
		const Change = _=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};

		return (
			<Column>
				{showPreview && [
					<Row key={0}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Claim, contentNode: CleanUpdatedContentNode(Clone(newData))} as any, null, ClaimForm.Base)}
							<SubPanel_Quote contentNode={newData} fontSize={15}/>
						</Pre>
					</Column>,
				]}
				<Column mt={showPreview ? 5 : 0}>
					<Pre>Quote text: </Pre>
					{/* <TextInput style={ES({flex: 1})}
						value={info.text} onChange={val=>Change(info.text = val)}/> */}
					{(creating || editing) && <MarkdownToolbar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>}
					<MarkdownEditor ref="editor" toolbar={false} value={newData.content} onChange={val=>Change(newData.content = val)} options={{
						scrollbarStyle: "overlay",
						lineWrapping: true,
						readOnly: !(creating || editing),
					}}/>
				</Column>
				<Row mt={5}>Source chains:</Row>
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		const {newData} = this.state;
		return CleanUpdatedContentNode(Clone(newData));
	}
}

export function CleanUpdatedContentNode(contentNode: QuoteAttachment) {
	CleanUpdatedSourceChains(contentNode.sourceChains);
	return contentNode;
}