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

		const components_final = {
			// modify links to open in new tab, if they're to external sites
			link: (props=>{
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
			}),

			// disallow images by default (too easy of a means to vandalize; also, can be used to track user IPs)
			// (if caller wants to enable images, they can do so by setting components.img to undefined, enabling default renderer)
			img: (props=>{
				const {src, alt, title, ...rest} = props;
				//return <img src={src} alt={alt} title={title} {...rest}/>;
				return null;
			}),

			...components,
		} as any;

		// allow caller to reset a component's renderer to its default values, by setting it to undefined
		for (const [key, value] of Object.entries(components_final).filter(a=>a[1] === undefined)) {
			delete components_final.components[key];
		}

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