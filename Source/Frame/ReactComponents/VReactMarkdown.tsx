import {ReactMarkdownProps} from "react-markdown";
//import {BaseComponent} from "../UI/ReactGlobals";
import {Component as BaseComponent} from "react";
import ReactMarkdown from "react-markdown";
import {Segment, ParseSegmentsForPatterns} from "../General/RegexHelpers";
import CodeMirror from "codemirror";

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

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(CodeMirror) {
  CodeMirror.defineOption("placeholder", "", function(cm, val, old) {
    var prev = old && old != CodeMirror.Init;
    if (val && !prev) {
      cm.on("blur", onBlur);
      cm.on("change", onChange);
      cm.on("swapDoc", onChange);
      onChange(cm);
    } else if (!val && prev) {
      cm.off("blur", onBlur);
      cm.off("change", onChange);
      cm.off("swapDoc", onChange);
      clearPlaceholder(cm);
      var wrapper = cm.getWrapperElement();
      wrapper.className = wrapper.className.replace(" CodeMirror-empty", "");
    }

    if (val && !cm.hasFocus()) onBlur(cm);
  });

  function clearPlaceholder(cm) {
    if (cm.state.placeholder) {
      cm.state.placeholder.parentNode.removeChild(cm.state.placeholder);
      cm.state.placeholder = null;
    }
  }
  function setPlaceholder(cm) {
    clearPlaceholder(cm);
    var elt = cm.state.placeholder = document.createElement("pre");
    elt.style.cssText = "height: 0; overflow: visible";
    elt.className = "CodeMirror-placeholder";
    var placeHolder = cm.getOption("placeholder")
    if (typeof placeHolder == "string") placeHolder = document.createTextNode(placeHolder)
    elt.appendChild(placeHolder)
    cm.display.lineSpace.insertBefore(elt, cm.display.lineSpace.firstChild);
  }

  function onBlur(cm) {
    if (isEmpty(cm)) setPlaceholder(cm);
  }
  function onChange(cm) {
    var wrapper = cm.getWrapperElement(), empty = isEmpty(cm);
    wrapper.className = wrapper.className.replace(" CodeMirror-empty", "") + (empty ? " CodeMirror-empty" : "");

    if (empty) setPlaceholder(cm);
    else clearPlaceholder(cm);
  }

  function isEmpty(cm) {
    return (cm.lineCount() === 1) && (cm.getLine(0) === "");
  }
})(CodeMirror);