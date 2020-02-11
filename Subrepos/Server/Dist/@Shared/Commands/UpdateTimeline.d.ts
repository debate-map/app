import { Command } from "mobx-firelink";
import { Timeline } from "../Store/firebase/timelines/@Timeline";
declare type MainType = Timeline;
export declare class UpdateTimeline extends Command<{
    id: string;
    updates: Partial<MainType>;
}, {}> {
    oldData: MainType;
    newData: MainType;
    Validate(): void;
    GetDBUpdates(): {};
}
export {};
