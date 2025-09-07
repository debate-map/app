import {InlineMath} from "react-katex";
import {store} from "Store";
import {Term, PreProcessLatex} from "dm_common";
import {TermPlaceholder} from "./NodeBox/TermPlaceholder.js";
import React, {useEffect, useRef} from "react";
import {createRoot} from "react-dom/client";

// change InlineMath's generateHtml function to not break on katex parse-errors
const oldGenerateHtml = InlineMath.prototype.generateHtml;
InlineMath.prototype.generateHtml = function() {
	try {
		return oldGenerateHtml.apply(this, arguments);
	} catch (ex) {
		// return ex.message;
		if (ex.message.startsWith("KaTeX parse error: ")) {
			return ex.message.replace(/^KaTeX/, "LaTeX");
		}
	}
};

type NodeMathUI_Props = {
	text: string,
	onTermHover: (termID: string, hovered: boolean)=>void,
	onTermClick: (termID: string)=>void, termsToSearchFor: Term[]
}

export const NodeMathUIF = (props: NodeMathUI_Props)=>{
	let {text, onTermHover, onTermClick, termsToSearchFor} = props;
	const wrapperRef = useRef<HTMLSpanElement>(null);
	text = PreProcessLatex(text);

	useEffect(()=>{
		const dom = wrapperRef.current;
		if (!dom) return;

		const termUIs = Array.from(dom.querySelectorAll(".text")) as HTMLSpanElement[];
		for (const termUI of termUIs) {
			const termTextMatch = termUI.innerText.match(/^@term\[(.+?)\]$/);
			if (!termTextMatch) continue; // if doesn't have marker, ignore

			// the only white-space allowed in term-forms is a space, so convert any other white-space character in UI, into a space (latex renderer sometimes renders a no-break space)
			const termStr = termTextMatch[1];
			const termStr_asForm = termStr.toLowerCase().replace(/\s/g, " ");
			const term = termsToSearchFor.find(a=>a.forms.Contains(termStr_asForm));
			if (term == null) continue;

			// TODO: maybe need to unmount the the prev root (from prev render)?
			const root = createRoot(termUI);
			root.render((
				<TermPlaceholder {...{store}} refText={termStr} termIDs={[term.id]} showKeyStart={false}
					useBasicTooltip={false}
					onHover={hovered=>onTermHover(term.id, hovered)} onClick={()=>onTermClick(term.id)}/>
			));
		}
	})

	return (
		<span ref={wrapperRef}>
			<InlineMath math={text}/>
		</span>
	);
};
