import {BaseComponentPlus} from "react-vextensions";
import {GetTerm, GetTermVariantNumber} from "../../../../../Store/firebase/terms";

export class TermPlaceholder extends BaseComponentPlus({showVariantNumber: true} as {refText: string, termID: string, showVariantNumber?: boolean, onHover: (hovered: boolean)=>void, onClick: ()=>void}, {}) {
	render() {
		const {refText, termID, showVariantNumber, onHover, onClick} = this.props;
		const term = GetTerm(termID);
		const termVariantNumber = term ? GetTermVariantNumber(term) : null;

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
					<sup>{termVariantNumber || "?"}</sup>}
				{/* <sub>{termVariantNumber}</sub>} */}
			</a>
		);
	}
}