import { AddSchema } from "mobx-firelink";
export class User_Private {
}
AddSchema("User_Private", {
    properties: {
        //displayName: {type: "string"},
        //avatarUrl: {type: "string"},
        email: { type: "string" },
        providerData: { type: "array" },
        // custom
        backgroundID: { type: "string" },
        backgroundCustom_enabled: { type: "boolean" },
        backgroundCustom_color: { type: ["null", "string"] },
        backgroundCustom_url: { type: "string" },
        backgroundCustom_position: { type: "string" },
    },
});
