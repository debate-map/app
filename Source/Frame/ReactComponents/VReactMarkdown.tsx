import {ReactMarkdownProps} from "react-markdown";
//import {BaseComponent} from "../UI/ReactGlobals";
import {Component as BaseComponent} from "react";
import * as ReactMarkdown from "react-markdown";

export default class VReactMarkdown extends BaseComponent<{} & ReactMarkdownProps, {}> {
	render() {
		let {...rest} = this.props;
		return (
			<ReactMarkdown {...rest}/>
		);
	}
}