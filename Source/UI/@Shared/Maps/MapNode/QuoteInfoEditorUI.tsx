import {BaseComponent, FindDOM} from "react-vextensions";
import {ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
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
							{GetNodeDisplayText({type: MapNodeType.Thesis, contentNode: CleanUpdatedContentNode(Clone(newData))} as any, ThesisForm.Base)}
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
					<SourceChainsEditorUI enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
			</div>
		);
	}

	GetValidationError() {
		//return (FindDOM(this.refs.url) as HTMLInputElement).validity.valid;
		//return (FindDOM(this.refs.url) as HTMLInputElement).validationMessage;
		//for (let i = 0, urlComp; urlComp = this.refs["url_" + i]; i++) {
		/*for (let key of this.refs.VKeys().filter(a=>a.startsWith("url_"))) {
			let urlComp = this.refs[key];
			let urlDOM = FindDOM(urlComp) as HTMLInputElement;
			if (urlDOM.validationMessage)
				return urlDOM.validationMessage;
		}
		return null;*/
		let {newData} = this.state;
		for (let chain of newData.sourceChains) {
			for (let source of chain) {
				if (source.type == SourceType.Writing || source.type == SourceType.Speech) {
					if ((source.name || "").trim().length == 0 && (source.author || "").trim().length == 0) {
						return "Sources cannot be empty.";
					}
				} else if (source.type == SourceType.Webpage) {
					if ((source.link || "").trim().length == 0) {
						return "Sources cannot be empty.";
					}
				}
			}
		}
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
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