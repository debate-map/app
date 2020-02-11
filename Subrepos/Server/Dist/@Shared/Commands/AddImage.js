var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command, AssertV } from "mobx-firelink";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
import { HasModPermissions } from "../Store/firebase/users/$user";
let AddImage = class AddImage extends Command {
    Validate() {
        var _a;
        AssertV(HasModPermissions(this.userInfo.id), "Only moderators can add images currently. (till review/approval system is implemented)");
        const { image } = this.payload;
        this.imageID = (_a = this.imageID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        image.creator = this.userInfo.id;
        image.createdAt = Date.now();
        this.returnData = this.imageID;
        AssertValidate("Image", image, "Image invalid");
    }
    GetDBUpdates() {
        const { image } = this.payload;
        const updates = {
            // 'general/data/.lastImageID': this.imageID,
            [`images/${this.imageID}`]: image,
        };
        return updates;
    }
};
AddImage = __decorate([
    UserEdit
], AddImage);
export { AddImage };
