import ReactMarkdown, {Options as ReactMarkdownOptions} from "react-markdown";
import {FilterOutUnrecognizedProps} from "react-vextensions";
import {VURL, E} from "js-vextensions";
import React from "react";
import {Segment, ParseTextForPatternMatchSegments} from "../General/RegexHelpers.js";
import {GetCurrentURL} from "../URL/URLs.js";
import {Link} from "./Link.js";
import {manager} from "../../Manager.js";
import {css2} from "../UI/Styles.js";

export type ReplacementFunc = (segment: Segment, index: number, extraInfo: any)=>React.JSX.Element;
export type VReactMarkdownProps = {
	source: string,
	replacements?: {[key: string]: ReplacementFunc},
	extraInfo?: any,
	style?: any,
	addMarginsForDanglingNewLines?: boolean,
	containerProps?: any
} & Omit<ReactMarkdownOptions, "children">;

/**
 * A Markdown renderer component.
 * Note:
 * - This is distinct from `react-vmarkdown`, which is a Markdown *editor*.
 * - This component is intended only for rendering Markdown to React elements.
 */
export const VReactMarkdown = (props: VReactMarkdownProps)=>{
	const {source, replacements, extraInfo, style, addMarginsForDanglingNewLines, containerProps, components, ...rest} = props;
	const css = css2;
	const containerPropsFinal = {...containerProps};
	containerPropsFinal.style = E(containerPropsFinal.style, style);

	const componentsFinal = {
		// modify links to open in new tab, if they're to external sites
		link: (linkProps=>{
			let {href, target, ...linkRest} = linkProps;
			const toURL = VURL.Parse(href);
			const sameDomain = toURL.domain == GetCurrentURL().domain;

			// normalize falsy target
			if (target == "") target = null;
			if (target == null && sameDomain) {
				target = "_blank";
			}

			if (sameDomain) {
				const actionFunc = manager.GetLoadActionFuncForURL(toURL);
				return <Link {...FilterOutUnrecognizedProps(linkRest, "a")} actionFunc={actionFunc} target={target}/>;
			}

			return <Link {...FilterOutUnrecognizedProps(linkRest, "a")} to={href} target={target}/>;
		}),

		// disallow images by default (too easy of a means to vandalize; also, could be used to track user IPs)
		// (if caller wants to enable images, they can do so by setting components.img to undefined, enabling default renderer)
		img: (()=>{
			return null;
		}),

		...components,
	} as any;

	// allow caller to reset a component's renderer to its default values, by setting it to undefined
	for (const kv of Object.entries(componentsFinal).filter(a=>a[1] === undefined)) {
		const key = kv[0];
		delete componentsFinal[key];
	}

	if (replacements) {
		const patterns = replacements.VKeys().map((regexStr, index)=>({name: `${index}`, regex: new RegExp(regexStr)}));
		const segments = ParseTextForPatternMatchSegments(source, patterns);
		return (
			<div {...containerPropsFinal}>
				{segments.map((segment, index)=>{
					if (segment.patternMatches.size == 0) {
						if (replacements.default) {
							return replacements.default(segment, index, extraInfo).VAct(a=>a.key = index.toString());
						}
						const text = segment.text.replace(/\r/g, "");
						return (
							<div key={index} style={css(!addMarginsForDanglingNewLines ? {} : {
								marginTop: text.startsWith("\n\n") ? 15 : text.startsWith("\n") ? 5 : 0,
								marginBottom: text.endsWith("\n\n") ? 15 : text.endsWith("\n") ? 5 : 0,
							})}>
								<ReactMarkdown {...rest} components={componentsFinal}>
									{text.trim()}
								</ReactMarkdown>
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
		<div {...containerPropsFinal}>
			<ReactMarkdown {...rest} components={componentsFinal}>
				{source}
			</ReactMarkdown>
		</div>
	);
};
