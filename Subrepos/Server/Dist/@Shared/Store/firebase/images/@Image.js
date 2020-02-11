import { GetValues_ForSchema, CE } from "js-vextensions";
import { AddSchema } from "mobx-firelink";
import { Source } from "../nodeRevisions/@SourceChain";
export var ImageType;
(function (ImageType) {
    ImageType[ImageType["Photo"] = 10] = "Photo";
    ImageType[ImageType["Illustration"] = 20] = "Illustration";
})(ImageType || (ImageType = {}));
AddSchema("ImageType", { oneOf: GetValues_ForSchema(ImageType) });
export function GetNiceNameForImageType(type) {
    return ImageType[type].toLowerCase();
}
export class Image {
    constructor(initialData) {
        this.url = "";
        this.sourceChains = [
            { sources: [new Source()] },
        ];
        CE(this).VSet(initialData);
        // this.createdAt = Date.now();
    }
}
export const Image_namePattern = '^[a-zA-Z0-9 ,\'"%\\-()\\/]+$';
export const Image_urlPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+\\.(jpg|jpeg|gif|png)$";
AddSchema("Image", {
    properties: {
        name: { type: "string", pattern: Image_namePattern },
        type: { $ref: "ImageType" },
        // url: { pattern: Image_urlPattern },
        url: { type: "string" },
        description: { type: "string" },
        previewWidth: { type: ["number", "null"] },
        sourceChains: { items: { $ref: "SourceChain" } },
        creator: { type: "string" },
        createdAt: { type: "number" },
    },
    required: ["name", "type", "url", "description", "sourceChains", "creator", "createdAt"],
});
