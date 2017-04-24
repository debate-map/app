export abstract class Command<Payload> {
	constructor(payload: Payload) {
		this.type = this.constructor.name;
		this.payload = payload;
		//this.Extend(payload);
		//Object.setPrototypeOf(this, Object.getPrototypeOf({}));
	}
	type: string;
	payload: Payload;

	// Run() is executed on server (well, will be later)
	abstract Run();
}