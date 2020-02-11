import { Command } from "mobx-firelink";
import { Image } from "../Store/firebase/images/@Image";
export declare class DeleteImage extends Command<{
    id: string;
}, {}> {
    oldData: Image;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: any;
    };
}
