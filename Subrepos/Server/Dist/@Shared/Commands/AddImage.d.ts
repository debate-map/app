import { Command } from "mobx-firelink";
import { Image } from "../Store/firebase/images/@Image";
export declare class AddImage extends Command<{
    image: Image;
}, string> {
    imageID: string;
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: Image;
    };
}
