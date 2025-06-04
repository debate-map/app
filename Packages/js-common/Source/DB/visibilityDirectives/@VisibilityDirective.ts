/*import {AddSchema, MGLClass, Field} from "mobx-graphlink";

@MGLClass({table: "visibilityDirectives"})
export class VisibilityDirective {
	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	@DB((t, n)=>t.text(n).references("id").inTable(`users`).DeferRef())
	@Field({type: "string"})
	actor: string;

	@DB((t, n)=>t.float(n))
	@Field({type: "number"})
	priority: number;

	@DB((t, n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string"}})
	context: string[];

	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`maps`).DeferRef())
	@Field({type: "string"}, {opt: true})
	target_map?: string;

	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`nodes`).DeferRef())
	@Field({type: "string"}, {opt: true})
	target_node?: string;

	@DB((t, n)=>t.text(n).nullable().references("id").inTable(`nodeLinks`).DeferRef())
	@Field({type: "string"}, {opt: true})
	target_nodeLink?: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	visibility_self?: string;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	visibility_nodes?: string;
}*/