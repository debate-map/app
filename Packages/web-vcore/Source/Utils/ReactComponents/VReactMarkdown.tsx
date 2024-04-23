import ReactMarkdown, {ReactMarkdownOptions} from "react-markdown";
import {BaseComponent, ShallowChanged, FilterOutUnrecognizedProps, cssHelper} from "react-vextensions";
//import {Component as BaseComponent} from "react";
import {VURL, E} from "js-vextensions";
import React from "react";
import {Segment, ParseTextForPatternMatchSegments} from "../General/RegexHelpers.js";
import {GetCurrentURL} from "../URL/URLs.js";
import {Link} from "./Link.js";
import {manager} from "../../Manager.js";

export type ReplacementFunc = (segment: Segment, index: number, extraInfo)=>JSX.Element;

// this is distinct from react-vmarkdown (this is a markdown renderer, whereas react-vmarkdown is a markdown editor)
export class VReactMarkdown extends BaseComponent
	<{source: string, replacements?: {[key: string]: ReplacementFunc}, extraInfo?, style?, addMarginsForDanglingNewLines?: boolean, containerProps?: any} & Omit<ReactMarkdownOptions, "children">,
	{}> {
	render() {
		const {source, replacements, extraInfo, style, addMarginsForDanglingNewLines, containerProps, components, ...rest} = this.props;
		const {css} = cssHelper(this);

		const containerProps_final = {...containerProps};
		containerProps_final.style = E(containerProps_final.style, style);

		const components_final = {...components} as any;
		components_final.link = components_final.link || (props=>{
			let {href, target, ...rest} = props;
			const toURL = VURL.Parse(href);
			const sameDomain = toURL.domain == GetCurrentURL().domain;

			if (target == "") target = null; // normalize falsy target
			if (target == null && sameDomain) {
				target = "_blank";
			}

			if (sameDomain) {
				const actionFunc = manager.GetLoadActionFuncForURL(toURL);
				return <Link {...FilterOutUnrecognizedProps(rest, "a")} actionFunc={actionFunc} target={target}/>;
			}
			return <Link {...FilterOutUnrecognizedProps(rest, "a")} to={href} target={target}/>;
		});

		if (replacements) {
			const patterns = replacements.VKeys().map((regexStr, index)=>({name: `${index}`, regex: new RegExp(regexStr)}));
			const segments = ParseTextForPatternMatchSegments(source, patterns);
			return (
				<div>
					{segments.map((segment, index)=>{
						if (segment.patternMatches.size == 0) {
							if (replacements.default) {
								return replacements.default(segment, index, extraInfo).VAct(a=>a.key = index.toString());
							}
							const text = segment.text.replace(/\r/g, "");
							return (
								<div style={css(!addMarginsForDanglingNewLines ? {} : {
									marginTop: text.startsWith("\n\n") ? 15 : text.startsWith("\n") ? 5 : 0,
									marginBottom: text.endsWith("\n\n") ? 15 : text.endsWith("\n") ? 5 : 0,
								})}>
									<ReactMarkdown {...rest} key={index} children={text.trim()} components={components_final}/>
								</div>
							);
						}
						const mainPatternMatched = [...segment.patternMatches.keys()][0];
						const renderFuncForReplacement = replacements.VValues()[mainPatternMatched.name] as ReplacementFunc;
						return renderFuncForReplacement(segment, index, extraInfo).VAct(a=>a.key = index.toString());
					})}
				</div>
			);
		}

		return (
			<div {...containerProps_final}>
				<ReactMarkdown {...rest} children={source} components={components_final}/>
			</div>
		);
	}
}