import { Command } from "mobx-firelink";
import { Image } from "../Store/firebase/images/@Image";
export declare class UpdateImageData extends Command<{
    id: string;
    updates: Partial<Image>;
}, {}> {
    oldData: Image;
    newData: Image;
    Validate(): void;
    GetDBUpdates(): any;
}
