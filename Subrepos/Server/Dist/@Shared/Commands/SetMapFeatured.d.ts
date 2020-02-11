import { Command } from "mobx-firelink";
export declare class SetMapFeatured extends Command<{
    id: string;
    featured: boolean;
}, {}> {
    Validate(): void;
    GetDBUpdates(): {
        [x: string]: boolean;
    };
}
