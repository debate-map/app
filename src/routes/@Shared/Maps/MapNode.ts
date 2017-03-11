export interface MapNode {
	type: string;
	title: string;
	agrees: number;
	degree: number;
	disagrees: number;
	weight: number;
	creator: string;
	approved: boolean;
	accessLevel: number;
	voteLevel: number;
	supportChildren: any;
	opposeChildren: any;
	talkChildren: any;
}