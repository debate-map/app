import ReactMarkdown, {ReactMarkdownProps} from "react-markdown";
import {BaseComponent, ShallowChanged} from "../UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import {Segment, ParseSegmentsForPatterns} from "../General/RegexHelpers";
import {URL, GetCurrentURL} from "../General/URLs";
import Link from "./Link";

export type ReplacementFunc = (segment: Segment, index: number)=>JSX.Element;

export default class VReactMarkdown extends BaseComponent
		<{source: string, replacements?: {[key: string]: ReplacementFunc}, style?} & ReactMarkdownProps,
		{}> {
	render() {
		let {source, replacements, style, containerProps, renderers, ...rest} = this.props;

		let containerProps_final = {...containerProps};
		containerProps_final.style = E(containerProps_final.style, style);

		let renderers_final = {...renderers};
		renderers_final.Link = renderers_final.Link || (props=> {
			let {href, target, ...rest} = props;
			let toURL = URL.Parse(href);
			if (target == null && toURL.domain != GetCurrentURL().domain) {
				target = "_blank";
			}
			return <Link {...rest} to={href} target={target}/>;
		});

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
							return <ReactMarkdown {...rest} key={index} source={segment.textParts[0]} renderers={renderers_final}/>;
						}
						let renderFuncForReplacement = replacements.VValues()[segment.patternMatched];
						return renderFuncForReplacement(segment, index).VAct(a=>a.key = index);
					})}
				</div>
			);
		}

		return <ReactMarkdown {...rest} source={source} containerProps={containerProps_final} renderers={renderers_final}/>;
	}
}