import { AddSchema } from "mobx-firelink";
export class ImageAttachment {
}
AddSchema("ImageAttachment", {
    properties: {
        id: { type: "string" },
    },
    required: ["id"],
});
