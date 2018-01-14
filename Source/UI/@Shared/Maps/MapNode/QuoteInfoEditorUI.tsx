import {BaseComponent, FindDOM} from "react-vextensions";
import {ClaimForm} from "../../../../Store/firebase/nodes/@MapNode";
import {Column} from "react-vcomponents";
import {Row, Pre} from "react-vcomponents";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {TextInput} from "react-vcomponents";
import Editor from "react-md-editor";
import {Button} from "react-vcomponents";
import {applyFormat} from "../../MarkdownEditor/Formatter";
import {Component} from "react";
import Icons from "react-md-editor/lib/icons";
import {GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";
import {GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "../../../../Store/firebase/contentNodes/$contentNode";
import {Select} from "react-vcomponents";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {GetEntries} from "../../../../Frame/General/Enums";
//import {ButtonProps} from "../../../../Frame/ReactComponents/Button"; // "import" approach causes typescript rebuilds to fail
import {CleanUpdatedSourceChains} from "./SourceChainsEditorUI";
import SourceChainsEditorUI from "./SourceChainsEditorUI";
import {SubPanel_Quote} from "./NodeUI_Inner/SubPanel";
import { MarkdownToolbar } from "UI/@Shared/MarkdownEditor/MarkdownToolbar";
 import {GetErrorMessagesUnderElement} from "js-vextensions";

//@ApplyBasicStyles
export default class QuoteInfoEditorUI extends BaseComponent
		<{
			creating?: boolean, editing?: boolean, baseData: ContentNode, showPreview: boolean, justShowed: boolean, onChange?: (newData: ContentNode)=>void,
		},
		{newData: ContentNode}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}
	
	render() {
		let {creating, editing, showPreview, justShowed, onChange} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		return (
			<div> {/* needed so GetInnerComp() works */}
			<Column>
				{showPreview && [
					<Row key={0} mt={5}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: `rgba(255,255,255,.2)`, borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Claim, contentNode: CleanUpdatedContentNode(Clone(newData))} as any, null, ClaimForm.Base)}
							<SubPanel_Quote contentNode={newData} fontSize={15}/>
						</Pre>
					</Column>
				]}
				<Column mt={5}>
					<Pre>Quote text: </Pre>
					{/*<TextInput style={{flex: 1}}
						value={info.text} onChange={val=>Change(info.text = val)}/>*/}
					{(creating || editing) && <MarkdownToolbar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>}
					<Editor ref="editor" value={newData.content} onChange={val=>Change(newData.content = val)} options={{
						scrollbarStyle: `overlay`,
						lineWrapping: true,
						readOnly: !(creating || editing),
					}}/>
				</Column>
				<Row mt={5}>Source chains:</Row>
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
			</div>
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		let {newData} = this.state;
		return CleanUpdatedContentNode(Clone(newData));
	}
}

export function CleanUpdatedContentNode(contentNode: ContentNode) {
	CleanUpdatedSourceChains(contentNode.sourceChains);
	return contentNode;
}