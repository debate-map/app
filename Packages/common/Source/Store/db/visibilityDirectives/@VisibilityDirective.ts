import {AddSchema, MGLClass, DB, Field} from "web-vcore/nm/mobx-graphlink";

// todo
type PermissionSet = any;
AddSchema("PermissionSet", {
	properties: {
	},
});

@MGLClass({table: "visibilityDirectives"})
export class VisibilityDirective {
	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}users`).DeferRef())
	@Field({type: "string"})
	actor: string;

	@DB((t,n)=>t.float(n))
	@Field({type: "number"})
	priority: number;

	@DB((t,n)=>t.specificType(n, "text[]"))
	@Field({items: {type: "string"}})
	context: string[];

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}maps`).DeferRef())
	@Field({type: "string"})
	target_map: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}nodes`).DeferRef())
	@Field({type: "string"})
	target_node: string;

	@DB((t,n)=>t.text(n).references("id").inTable(`{v}nodeParent_nodeChildren`).DeferRef())
	@Field({type: "string"})
	target_nodeParent_nodeChildren: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	visibility_self: string;
	
	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	visibility_nodes: string;
}