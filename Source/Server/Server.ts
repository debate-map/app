import AJV from "ajv";
import AJVKeywords from "ajv-keywords";

export const ajv = AJVKeywords(new AJV()) as AJV_Extended;
G({ajv}); declare global { const ajv: AJV_Extended; }

G({Schema}); declare global { function Schema(schema); }
export function Schema(schema) {
	schema = E({additionalProperties: false}, schema);
	return schema;
}

G({AddSchema}); declare global { function AddSchema(schema, name: string); }
let schemaJSON = {};
export function AddSchema(schema, name: string) {
	schema = Schema(schema);
	schemaJSON[name] = schema;
	ajv.removeSchema(name); // for hot-reloading
	let result = ajv.addSchema(schema, name);

	if (schemaAddListeners[name]) {
		for (let listener of schemaAddListeners[name]) {
			listener();
		}
		delete schemaAddListeners[name];
	}

	return result;
}

export function GetSchemaJSON(name: string) {
	return Clone(schemaJSON[name]);
}

var schemaAddListeners = {};
export function WaitTillSchemaAddedThenRun(schemaName: string, callback: ()=>void) {
	// if schema is already added, run right away
	if (ajv.getSchema(schemaName)) {
		callback();
		return;
	}
	schemaAddListeners[schemaName] = (schemaAddListeners[schemaName] || []).concat(callback);
}

type AJV_Extended = AJV.Ajv & {
	//AddSchema(schema, name: string): void;
	FullErrorsText(): string;
};
/*AJV.prototype.AddSchema = function(this: AJV_Extended, schema, name: string) {
	return `${this.errorsText()} (${ToJSON(this.errors)})`;
};*/
AJV.prototype.FullErrorsText = function(this: AJV_Extended) {
	return `${this.errorsText()}

Details: ${ToJSON(this.errors, null, 3)}
`;
};

// validation
// ==========

G({Validate}); declare global { function Validate(schemaName: string, data); }
function Validate(schemaName: string, data, removeHelpers = true) {
	if (removeHelpers) {
		let {RemoveHelpers} = require("../Frame/Database/DatabaseHelpers");
		data = RemoveHelpers(Clone(data));
	}

	let passed = ajv.validate(schemaName, data);
	if (!passed) return ajv.FullErrorsText();

	// additional, non-ajv checks
	if (ajvExtraChecks[schemaName]) {
		for (let extraCheck of ajvExtraChecks[schemaName]) {
			let errorMessage = extraCheck(data);
			if (errorMessage) return errorMessage;
		}
	}
}
export let ajvExtraChecks = {}; // schemaName -> $index -> $validationFunc
export function AddAJVExtraCheck(schemaName: string, extraCheckFunc: (item: any)=>string) {
	ajvExtraChecks[schemaName] = ajvExtraChecks[schemaName] || [];
	ajvExtraChecks[schemaName].push(extraCheckFunc);
}

G({AssertValidate}); declare global { function AssertValidate(schemaName: string, data, failureMessage: string, addDataStr?: boolean); }
function AssertValidate(schemaName: string, data, failureMessageOrGetter: string | ((errorsText: string)=>string), addErrorsText = true, addDataStr = true) {
	let errorsText = Validate(schemaName, data, false);
	let failureMessage = IsString(failureMessageOrGetter) ? failureMessageOrGetter : failureMessageOrGetter(errorsText);
	if (addErrorsText) {
		failureMessage += `: ${errorsText}`;
	}
	if (addDataStr) {
		failureMessage += `\nData: ${ToJSON(data, null, 3)}`;
	}
	failureMessage += "\n";

	Assert(errorsText == null, failureMessage);
}