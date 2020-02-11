import { AddSchema } from "mobx-firelink";
export class EquationAttachment {
    constructor() {
        this.text = "";
        this.isStep = true;
        this.explanation = null;
    }
}
AddSchema("EquationAttachment", {
    properties: {
        latex: { type: "boolean" },
        text: { type: "string" },
        isStep: { type: ["null", "boolean"] },
        explanation: { type: ["null", "string"] },
    },
    required: ["text"],
});
