export abstract class CG_Node {
	id: string;
	narrative?: string;

	//abstract GetTitle(): string;
	/** Get the regular, "standalone" text of the claim. (stored in debate-map as text_base) */
	static GetTitle_Main(node: CG_Node): string {
		const d = node as any;
		const result_raw = d.name ?? (d.questionText ?? d.question) ?? d.position ?? d.category ?? d.claim ?? d.argument;
		const result = (result_raw ?? "").trim(); // fsr, some json files contain line-breaks at start or end, so clean this up
		return result.length ? result : null;
	}
	/** Get the "narrative" text of the claim, as displayed in the papers app. (stored in debate-map as text_narration) */
	static GetTitle_Narrative(node: CG_Node) {
		const result = (node.narrative ?? "").trim(); // fsr, some json files contain line-breaks at start or end, so clean this up
		return result.length ? result : null;
	}
}

export class CG_Debate extends CG_Node {
	name: string;
	questions: CG_Question[];
}
export class CG_Question extends CG_Node {
	// v1
	questionText?: string;
	// v2
	question?: string;

	positions: CG_Position[];
}
export class CG_Position extends CG_Node {
	position: string;
	categories: CG_Category[];
}
export class CG_Category extends CG_Node {
	category: string;
	claims: CG_Claim[];
}
export class CG_Claim extends CG_Node {
	// v1
	claim?: string;

	// v2
	argument?: string;
	/*generated?: string;
	valid?: boolean;
	similarity?: boolean;
	edited?: boolean;*/

	// v2 (tool extending claim-gen)
	arguments?: string[];
}