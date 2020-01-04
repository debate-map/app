import {BaseComponentPlus} from "react-vextensions";
import {GetTerm} from "../../../../../Store/firebase/terms";

export class TermPlaceholder extends BaseComponentPlus({showKeyStart: true} as {refText: string, termID: string, showKeyStart?: boolean, onHover: (hovered: boolean)=>void, onClick: ()=>void}, {}) {
	render() {
		const {refText, termID, showKeyStart: showVariantNumber, onHover, onClick} = this.props;
		const term = GetTerm(termID);
		//const termVariantNumber = term ? GetTermVariantNumber(term) : null;
		const termKeyStart = term ? term._key.substr(0, 2) : null;

		// if (term == null) return <a>...</a>;
		// if (term == null) return <a>{refText}</a>;
		return (
			<a
				onMouseEnter={e=>onHover(true)}
				onMouseLeave={e=>onHover(false)}
				onClick={e=>{
					/* if (this.definitionsPanel == null) return;
						GetInnerComp(this.definitionsPanel).SetState({termFromLocalClick: GetTerm(termID)}); */
					// this.SetState({clickTermID: termID});
					onClick();
				}}>
				{/* term.name */}
				{refText}
				{showVariantNumber &&
					<sup>{termKeyStart || "?"}</sup>}
				{/* <sub>{termVariantNumber}</sub>} */}
			</a>
		);
	}
}