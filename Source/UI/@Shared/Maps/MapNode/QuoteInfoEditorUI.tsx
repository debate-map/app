import {BaseComponent, FindDOM} from "../../../../Frame/UI/ReactGlobals";
import {ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import {Pre, Div} from "../../../../Frame/UI/ReactGlobals";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {SourcesUI, SubPanel_Inner} from "./NodeUI_Inner";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import * as Editor from "react-md-editor";
import Button from "../../../../Frame/ReactComponents/Button";
import {applyFormat} from "../../MarkdownEditor/Formatter";
import {Component} from "react";
import * as Icons from "react-md-editor/lib/icons";
import {GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";
import {GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "../../../../Store/firebase/contentNodes/$contentNode";
import Select from "../../../../Frame/ReactComponents/Select";
import {SourceType, SourceChain, Source, ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {GetEntries} from "../../../../Frame/General/Enums";
//import {ButtonProps} from "../../../../Frame/ReactComponents/Button"; // "import" approach causes typescript rebuilds to fail

//@ApplyBasicStyles
export default class QuoteInfoEditorUI extends BaseComponent
		<{
			editing?: boolean, contentNode: ContentNode, showPreview: boolean, justShowed: boolean, onChange?: (newData: ContentNode)=>void,
		},
		{contentNodeCopy: ContentNode}> {
	constructor(props) {
		super(props);
		let {contentNode} = this.props;
		this.state = {contentNodeCopy: FromJSON(ToJSON(contentNode))};
	}
	
	render() {
		let {editing, showPreview, justShowed, onChange} = this.props;
		let {contentNodeCopy: contentNode} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		return (
			<Column>
				{showPreview && [
					<Row key={0} mt={5}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: `rgba(255,255,255,.2)`, borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Thesis, contentNode: CleanUpdatedContentNode(Clone(contentNode))} as any, ThesisForm.Base)}
							<SubPanel_Inner contentNode={contentNode} fontSize={15}/>
						</Pre>
					</Column>
				]}
				<Column mt={5}>
					<Pre>Quote text: </Pre>
					{/*<TextInput style={{flex: 1}}
						value={info.text} onChange={val=>Change(info.text = val)}/>*/}
					{editing && <ToolBar enabled={editing} editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>}
					<Editor ref="editor" value={contentNode.content} onChange={val=>Change(contentNode.content = val)} options={{
						scrollbarStyle: `overlay`,
						lineWrapping: true,
						readOnly: !editing,
					}}/>
				</Column>
				<Row mt={5}>Source chains:</Row>
				<Row mt={5}>
					<Column style={{flex: 1}}>
						{contentNode.sourceChains.map((chain, chainIndex)=> {
							return (
								<Column key={chainIndex} mt={chainIndex == 0 ? 0 : 10} pt={chainIndex == 0 ? 0 : 10} style={E(chainIndex != 0 && {borderTop: "1px solid rgba(0,0,0,.7)"})}>
									{chain.map((source, sourceIndex)=> {
										return (
											<Row key={sourceIndex}>
												<Select enabled={editing} options={GetEntries(SourceType)}
													value={source.type} onChange={val=>Change(source.type = val)}/>
												{source.type != SourceType.Webpage &&
													<TextInput enabled={editing} style={{width: "90%"}} placeholder={GetSourceNamePlaceholderText(source.type)}
														value={source.name} onChange={val=>Change(source.name = val)}/>}
												{source.type != SourceType.Webpage &&
													<TextInput enabled={editing} style={{width: "90%"}} placeholder={GetSourceAuthorPlaceholderText(source.type)}
														value={source.author} onChange={val=>Change(source.author = val)}/>}
												{source.type == SourceType.Webpage &&
													<TextInput ref={"url_" + chainIndex + "_" + sourceIndex} enabled={editing} type="url"
															//pattern="^(https?|ftp)://[^\\s/$.?#]+\\.[^\\s]+$" required style={{flex: 1}}
															pattern="^https?://[^\\s/$.?#]+\\.[^\\s]+$" required style={{flex: 1}}
															value={source.link} onChange={val=>Change((()=> {
																if (val.endsWith("@bible")) {
																	var reference = val.replace("@bible", "").replace(/:/g, ".").replace(/ /g, "%20");
																	val = `https://biblia.com/bible/nkjv/${reference}`;
																} else if (val.endsWith("@quran")) {
																	var reference = val.replace("@quran", "").replace(/:/g, "/").replace(/ /g, "%20");
																	val = `http://www.quran.com/${reference}`;
																}
																source.link = val;
															})())}/>}
												{sourceIndex != 0 && editing && <Button text="X" ml={5} onClick={()=>Change(chain.RemoveAt(sourceIndex))}/>}
											</Row>
										);
									})}
									{editing &&
										<Row>
											<Button text="Add source to this chain" mt={5} onClick={()=>Change(chain.push(new Source()))}/>
											{chainIndex > 0 && <Button text="Remove this source chain" ml={5} mt={5} onClick={()=>Change(contentNode.sourceChains.RemoveAt(chainIndex))}/>}
										</Row>}
								</Column>
							);
						})}
						{editing && <Button text="Add source chain" mt={10} style={{alignSelf: "flex-start"}} onClick={()=>Change(contentNode.sourceChains.push(new SourceChain()))}/>}
					</Column>
				</Row>
			</Column>
		);
	}

	/*lastSetError = null;
	PostRender() {
		let {onSetError} = this.props;
		let error = this.GetValidationError();
		if (error != this.lastSetError) {
			onSetError(error);
			this.lastSetError = error;
		}
	}*/
	GetValidationError() {
		let {contentNode} = this.props;
		//return (FindDOM(this.refs.url) as HTMLInputElement).validity.valid;
		//return (FindDOM(this.refs.url) as HTMLInputElement).validationMessage;
		//for (let i = 0, urlComp; urlComp = this.refs["url_" + i]; i++) {
		for (let key of this.refs.VKeys().filter(a=>a.startsWith("url_"))) {
			let urlComp = this.refs[key];
			let urlDOM = FindDOM(urlComp) as HTMLInputElement;
			if (urlDOM.validationMessage)
				return urlDOM.validationMessage;
		}
		return null;
	}
	GetNewData() {
		let {contentNodeCopy: contentNode} = this.state;
		return CleanUpdatedContentNode(Clone(contentNode));
	}
}

export function CleanUpdatedContentNode(contentNode: ContentNode) {
	// clean data
	for (let chain of contentNode.sourceChains) {
		for (let source of chain) {
			if (source.type == SourceType.Speech) {
				delete source.link;
			} else if (source.type == SourceType.Writing) {
				delete source.link;
			} else if (source.type == SourceType.Webpage) {
				delete source.name;
				delete source.author;
			}
		}
	}
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