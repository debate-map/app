import {Global} from "../../Frame/General/Globals_Free";

@Global
export default class NotificationMessage {
	static lastID = -1;
	
	/*constructor(error: Error) {
		this.id = ++NotificationMessage.lastID;
		//this.text = "An error has occurred: " + (error.message || error);
		//this.text = "An error has occurred: " + error.stack;
		this.text = "An error has occurred: " + error.toString() + "\n" + error.stack;
	}*/
	constructor(text: string) {
		this.id = ++NotificationMessage.lastID;
		this.text = text;
	}

	id: number;
	text: string;
}