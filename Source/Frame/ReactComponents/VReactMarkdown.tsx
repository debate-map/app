import {ReactMarkdownProps} from "react-markdown";
//import {BaseComponent} from "../UI/ReactGlobals";
import {Component as BaseComponent} from "react";
import * as ReactMarkdown from "react-markdown";
import {Segment, ParseSegmentsForPatterns} from "../General/RegexHelpers";

export type ReplacementFunc = (segment: Segment, index: number)=>JSX.Element;
export default class VReactMarkdown extends BaseComponent
		<{source: string, replacements?: {[key: string]: ReplacementFunc}} & ReactMarkdownProps,
		{}> {
	render() {
		let {source, replacements, ...rest} = this.props;

		if (replacements) {
			let patterns = replacements.VKeys().map((regexStr, index)=>({name: index+"", regex: new RegExp(regexStr)}));
			let segments = ParseSegmentsForPatterns(source, patterns);
			return (
				<div>
					{segments.map((segment, index)=> {
						if (segment.patternMatched == null) {
							if (replacements.default) {
								return replacements.default(segment, index).VAct(a=>a.key = index);
							}
							return <ReactMarkdown {...rest} key={index} source={segment.textParts[0]}/>;
						}
						let renderFuncForReplacement = replacements.VValues()[segment.patternMatched];
						return renderFuncForReplacement(segment, index).VAct(a=>a.key = index);
					})}
				</div>
			);
		}

		return (
			<ReactMarkdown {...rest} source={source}/>
		);
	}
}