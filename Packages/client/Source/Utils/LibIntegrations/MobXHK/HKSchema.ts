export const hkSchemaStr =
// to apply, copy the text between the "==========" lines, run in browser dev-tools/console, copy that JSON string, and send it to the HK backend (at: http://localhost:5140/docs#/default/add_schema_schema_post)
// ==========
JSON.stringify({
	"@context": [
		"https://hyperknowledge.org/schemas/hyperknowledge_events.jsonld",
		{
			ex: "http://example.com/schema/v0/",
			"@vocab": "http://example.com/schema/v0/",
			"@base": "http://example.com/schema/v0/",
		},
	],
	"@id": "ex:",
	"@type": "hk:Schema",
	eventSchemas: {
		// replication of debate-map model (temporary)
		create_node: {
			"@type": "hk:EventSchema",
			attributes: [
				{name: "topic", range: "ex:node", create: true},
				{name: "title", range: "rdf:langString"},
			],
		},
		update_node: {
			"@type": "hk:EventSchema",
			attributes: [
				{name: "topic", range: "ex:node"},
				{name: "title", range: "rdf:langString"},
			],
		},
		create_link: {
			"@type": "hk:EventSchema",
			attributes: [
				{name: "topic", range: "ex:link", create: true},
				{name: "source", range: ["ex:node", "ex:link"]},
				{name: "target", range: ["ex:node", "ex:link"]},
			],
		},
		update_link: {
			"@type": "hk:EventSchema",
			attributes: [
				{name: "topic", range: "ex:link"},
				{name: "source", range: ["ex:node", "ex:link"]},
				{name: "target", range: ["ex:node", "ex:link"]},
			],
		},
	},
	projectionSchemas: {
		// replication of debate-map model (temporary)
		node: {
			attributes: [
				{name: "title", map_prop: "title", range: "rdf:langString"},
			],
		},
		link: {
			attributes: [
				{name: "source", map_prop: "source", range: ["ex:node", "ex:link"]},
				{name: "target", map_prop: "target", range: ["ex:node", "ex:link"]},
			],
		},
	},
}, null, 2);
// ==========
export const hkSchema = JSON.parse(hkSchemaStr);