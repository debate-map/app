// Note: These schemas can be added to a project without carrying the rest of web-vcore with it (eg. for node-js server).
// Example: import {AddVectorSchemas} from "web-vcore/Dist/Utils/General/WVCSchemas.js";

//import {AddSchema, GetSchemaJSON} from "mobx-graphlink";
export function AddWVCSchemas(AddSchema: (schemaName: string, schema: any)=>any) {
	AddSchema("Vector2", {
		properties: {
			x: {type: "number"},
			y: {type: "number"},
		},
	});
	//console.log("Added Vector2:", schemaEntryJSONs.get("Vector2"));
	AddSchema("Vector3", {
		properties: {
			x: {type: "number"},
			y: {type: "number"},
			z: {type: "number"},
		},
	});
	AddSchema("VRect", {
		properties: {
			x: {type: "number"},
			y: {type: "number"},
			width: {type: "number"},
			height: {type: "number"},
		},
	});
	AddSchema("VBounds", {
		properties: {
			position: {$ref: "Vector3"},
			size: {$ref: "Vector3"},
		},
	});
}