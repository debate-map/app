import {BaseComponent, FindDOM} from "../../../../Frame/UI/ReactGlobals";
import {ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import {Pre, Div} from "../../../../Frame/UI/ReactGlobals";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {SourcesUI, SubPanel_Inner} from "./NodeUI_Inner";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import Editor from "react-md-editor";
import Button from "../../../../Frame/ReactComponents/Button";
import {applyFormat} from "../../MarkdownEditor/Formatter";
import {Component} from "react";
import Icons from "react-md-editor/lib/icons";
import {QuoteInfo, Source} from "../../../../Store/firebase/nodes/@QuoteInfo";
import {GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";

//@ApplyBasicStyles
export default class QuoteInfoEditorUI extends BaseComponent<{info: QuoteInfo, showPreview: boolean, justShowed: boolean, onSetError: (error: string)=>void}, {}> {
	render() {
		let {info, showPreview, justShowed} = this.props;
		let Change = _=>this.Update();
		return (
			<Column>
				{showPreview && [
					<Row key={0} mt={5}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: `rgba(255,255,255,.2)`, borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Thesis, quote: info} as any, ThesisForm.Base)}
							<SubPanel_Inner quote={info} fontSize={15}/>
						</Pre>
					</Column>
				]}
				<Row mt={5}><Pre>Author: </Pre><TextInput ref={a=>a && justShowed && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
					value={info.author} onChange={val=>Change(info.author = val)}/></Row>
				<Column mt={5}>
					<Pre>Quote: </Pre>
					{/*<TextInput style={{flex: 1}}
						value={info.text} onChange={val=>Change(info.text = val)}/>*/}
					<ToolBar editor={()=>this.refs.editor} excludeCommands={["h1", "h2", "h3", "h4", "italic", "quote"]}/>
					<Editor ref="editor" value={info.text} onChange={val=>Change(info.text = val)} options={{
						scrollbarStyle: `overlay`,
						lineWrapping: true,
					}}/>
				</Column>
				<Row mt={5}>Sources:</Row>
				<Row mt={5}>
					<Column style={{flex: 1}}>
						{info.sources.FakeArray_Select((source: Source, index)=> {
							return (
								<Column key={index} mt={index == 0 ? 0 : 3} pt={index == 0 ? 0 : 3} style={E(index != 0 && {borderTop: "1px solid rgba(0,0,0,.7)"})}>
									<Row>
										<Pre style={{flex: 1}}>Name: </Pre>
										<TextInput required style={{width: "90%"}}
											value={source.name} onChange={val=>Change(info.sources[index].name = val)}/>
									</Row>
									<Row style={{flex: .5}}>
										<Pre style={{flex: 1}}>Link: </Pre>
										<Row style={{width: "90%"}}>
											<TextInput ref={"url_" + index} type="url" pattern="^(https?|ftp)://[^\\s/$.?#]+\\.[^\\s]+$" required style={{flex: 1}}
												value={source.link} onChange={val=>Change(info.sources[index].link = val)}/>
											{index != 0 && <Button text="X" ml={5} onClick={()=>Change(info.sources.FakeArray_RemoveAt(index))}/>}
										</Row>
									</Row>
								</Column>
							);
						})}
						<Button text="Add" mt={5} style={{width: 60}} onClick={()=>Change(info.sources.FakeArray_Add({name: "", link: ""}))}/>
					</Column>
				</Row>
			</Column>
		);
	}

	lastSetError = null;
	PostRender() {
		let {onSetError} = this.props;
		let error = this.GetValidationError();
		if (error != this.lastSetError) {
			onSetError(error);
			this.lastSetError = error;
		}
	}
	GetValidationError() {
		let {info} = this.props;
		//return (FindDOM(this.refs.url) as HTMLInputElement).validity.valid;
		//return (FindDOM(this.refs.url) as HTMLInputElement).validationMessage;
		for (let i = 0, urlComp; urlComp = this.refs["url_" + i]; i++) {
			let urlDOM = FindDOM(urlComp) as HTMLInputElement;
			if (urlDOM.validationMessage)
				return urlDOM.validationMessage;
		}
		return null;
	}
}

class ToolBar extends BaseComponent<{editor: ()=>any, excludeCommands?: string[]}, {}> {
	render() {
		let {editor, excludeCommands} = this.props;

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
					return <ToolBarButton key={index} editor={editor} command={command.name} label={command.label} first={index == 0}/>;
				})}
			</Row>
		);	
	}
}

class ToolBarButton extends BaseComponent<{editor: ()=>any, command: string, label: string, first?: boolean}, {}> {
	render() {
		let {editor, command, label, first} = this.props;
		let icon = Icons[command];
		return (
			<Button width={24} height={24} ml={first ? 0 : 5}
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