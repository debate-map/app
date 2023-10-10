export abstract class CG_Node {
	id: string;
	//abstract GetTitle(): string;
	static GetTitle(node: CG_Node) {
		const d = node as any;
		return d.name ?? d.questionText ?? d.position ?? d.category ?? d.claim;
	}
}

export class CG_Debate extends CG_Node {
	name: string;
	questions: CG_Question[];
}
export class CG_Question extends CG_Node {
	questionText: string;
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
	claim: string;
}