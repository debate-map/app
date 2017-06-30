import {BaseComponent, FindDOM, GetErrorMessagesUnderElement} from "../../../../Frame/UI/ReactGlobals";
import {ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import {Pre, Div} from "../../../../Frame/UI/ReactGlobals";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import { SourcesUI, SubPanel_Quote } from "./NodeUI_Inner";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import Editor from "react-md-editor";
import Button from "../../../../Frame/ReactComponents/Button";
import {applyFormat} from "../../MarkdownEditor/Formatter";
import {Component} from "react";
import Icons from "react-md-editor/lib/icons";
import {GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";
import {GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "../../../../Store/firebase/contentNodes/$contentNode";
import Select from "../../../../Frame/ReactComponents/Select";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {GetEntries} from "../../../../Frame/General/Enums";
//import {ButtonProps} from "../../../../Frame/ReactComponents/Button"; // "import" approach causes typescript rebuilds to fail
import {CleanUpdatedSourceChains} from "./SourceChainsEditorUI";
import SourceChainsEditorUI from "./SourceChainsEditorUI";

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
			<div> {/* needed so GetInnerComp() work */}
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
					{(creating || editing) && <ToolBar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>}
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
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}
	GetNewData() {
		let {newData: contentNode} = this.state;
		return CleanUpdatedContentNode(Clone(contentNode));
	}
}

export function CleanUpdatedContentNode(contentNode: ContentNode) {
	CleanUpdatedSourceChains(contentNode.sourceChains);
	return contentNode;
}

class ToolBar extends BaseComponent<{enabled?: boolean, editor: ()=>any, excludeCommands?: string[]}, {}> {
	render() {
		let {enabled, editor, excludeCommands} = this.props;

		let commands = [
			{name: "h1", label: "H1"},
			{name: "h2", label: "H2"},
			{name: "h3", label: "H3"},
			{name: "h4", label: "H4"},
			{name: "bold", label: "b"},
			{name: "italic", label: "i"},
			{name: "oList", label: "ol"},
			{name: "uList", label: "ul"},
			{name: "quote", label: "q"},
			//{name: "link", label: "a"},
		];
		return (
			<Row mt={3} mb={3}>
				{commands.filter(a=>!excludeCommands.Contains(a.name)).map((command, index)=> {
					return <ToolBarButton key={index} enabled={enabled} editor={editor} command={command.name} label={command.label} first={index == 0}/>;
				})}
			</Row>
		);	
	}
}

type ButtonProps = {enabled: boolean}; // "import" approach causes typescript rebuilds to fail (for some reason)
class ToolBarButton extends BaseComponent<{editor: ()=>any, command: string, label: string, first?: boolean} & ButtonProps, {}> {
	render() {
		let {editor, command, label, first, ...rest} = this.props;
		let icon = Icons[command];
		return (
			<Button {...rest as any} width={24} height={24} ml={first ? 0 : 5}
					//pt={icon ? 0 : 1}
					style={{paddingTop: icon ? 0 : 1}}
					onClick={()=> {
						applyFormat(editor().codeMirror, command);
					}}>
				{icon
					? <span dangerouslySetInnerHTML={{__html: icon}} className="MDEditor_toolbarButton_icon"/>
					: label}
			</Button>
		);
	}
}