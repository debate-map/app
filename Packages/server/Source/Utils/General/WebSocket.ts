/*import {WebSocketClient} from "websocket";

// Wrapper for Worlize WebSocketNode to emulate the browser WebSocket object.
export class WebSocket {
	constructor(uri) {
		this.socket.on("connect", connection=>{
			this.connection = connection;

			connection.on("error", error=>{
				this.onerror();
			});

			connection.on("close", ()=>{
				this.onclose();
			});

			connection.on("message", message=>{
				if (message.type === "utf8") {
					this.onmessage({data: message.utf8Data});
				}
			});

			this.onopen();
		});
		this.socket.connect(uri);
	}
	connection = null;
	socket = new WebSocketClient();
	send(data) {
		this.connection.sendUTF(data);
	}
}*/