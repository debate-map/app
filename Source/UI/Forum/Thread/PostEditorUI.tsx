import {BaseComponent, FindDOM, GetErrorMessagesUnderElement} from "../../../Frame/UI/ReactGlobals";
import {ThesisForm} from "../../../Store/firebase/nodes/@MapNode";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import {Pre, Div} from "../../../Frame/UI/ReactGlobals";
import {MapNodeType} from "../../../Store/firebase/nodes/@MapNodeType";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import Editor from "react-md-editor";
import Button from "../../../Frame/ReactComponents/Button";
import {Component} from "react";
import Icons from "react-md-editor/lib/icons";
import {GetNodeDisplayText} from "../../../Store/firebase/nodes/$node";
import {GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "../../../Store/firebase/contentNodes/$contentNode";
import Select from "../../../Frame/ReactComponents/Select";
import {ContentNode} from "../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {GetEntries} from "../../../Frame/General/Enums";
import { MarkdownToolbar } from "UI/@Shared/MarkdownEditor/MarkdownToolbar";
import {Post} from "../../../Store/firebase/forum/@Post";
import Link from "../../../Frame/ReactComponents/Link";

export default class PostEditorUI extends BaseComponent
		<{forNew?: boolean, enabled?: boolean, baseData: Post, options?: any, onChange?: (newData: Post, comp: PostEditorUI)=>void},
		{newData: Post}> {
	static defaultProps = {enabled: true};
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}
	
	render() {
		let {forNew, enabled, onChange, options} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange) onChange(this.GetNewData(), this);
			this.Update();
		};

		return (
			<div style={{width: "100%"}}> {/* needed so GetInnerComp() works */}
			<Column>
				<Column>
					{enabled &&
						<MarkdownToolbar editor={()=>this.refs.editor}>
							<Link to="https://guides.github.com/features/mastering-markdown" style={{marginLeft: 10}}>How to add links, images, etc.</Link>
						</MarkdownToolbar>}
					<Editor ref="editor" value={newData.text || ""} onChange={val=>Change(newData.text = val)}
						options={E({
							scrollbarStyle: "overlay",
							lineWrapping: true,
							readOnly: !enabled,
							placeholder: "Write your reply..."
						}, options)}/>
				</Column>
			</Column>
			</div>
		);
	}

	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}
	GetNewData() {
		let {newData} = this.state;
		return Clone(newData);
	}
}