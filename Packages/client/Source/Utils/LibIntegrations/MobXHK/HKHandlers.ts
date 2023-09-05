export const hkHandlersStr =
// to apply, copy the text between the "==========" lines, run in browser dev-tools/console, copy that JSON string, and send it to the HK backend (at: http://localhost:5140/docs#/default/add_handlers_handler_post)
// ==========
JSON.stringify({
	"@context": {
		ex: "http://example.com/schema/v0/",
	},
	handlers: [
		{
			event_type: "ex:create_node",
			target_role: "topic",
			target_range: "ex:node",
			code_text: function handler(event, existing) {
				return {...event.data, "@id": event.data.topic, topic: undefined};
			}.toString(),
		},
		{
			event_type: "ex:update_node",
			target_role: "topic",
			target_range: "ex:node",
			code_text: function handler(event, existing) {
				delete event.data.topic;
				return Object.assign(existing.topic || {}, event.data);
			}.toString(),
		},
		{
			event_type: "ex:create_link",
			target_role: "topic",
			target_range: "ex:link",
			code_text: function handler(event, existing) {
				return {...event.data, "@id": event.data.topic, topic: undefined};
			}.toString(),
		},
		{
			event_type: "ex:update_link",
			target_role: "topic",
			target_range: "ex:link",
			code_text: function handler(event, existing) {
				delete event.data.topic;
				return Object.assign(existing.topic || {}, event.data);
			}.toString(),
		},
	],
}, null, 2);
// ==========
export const hkHandlers = JSON.parse(hkHandlersStr);