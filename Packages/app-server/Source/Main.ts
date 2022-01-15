import {postgraphile} from "postgraphile";

export const serverLaunchID = "hi"; // token used to identify the server-to-server websocket
export const pgPool = null as any;

const env = process.env;
let dbURL = env.DATABASE_URL;
const inK8s = env.DB_USER != null;
if (dbURL == null) {
	if (inK8s) {
		console.log(`Connecting app-server's pg-client to: postgres://${env.DB_USER}:<redacted>@${env.DB_ADDR}:${env.DB_PORT}/debate-map`);
		dbURL = `postgres://${env.DB_USER}:${encodeURIComponent(env.DB_PASSWORD!)}@${env.DB_ADDR}:${env.DB_PORT}/debate-map`;
	} else {
		console.log(`Connecting app-server's pg-client to: postgres://${env.PGUSER}:<redacted>@localhost:5432/debate-map`);
		dbURL = `postgres://${env.PGUSER}:${encodeURIComponent(env.DBPASSWORD!)}@localhost:5432/debate-map`;
	}
}

postgraphile(dbURL, "app_public");

const startTime = new Date().toLocaleString("sv");
setInterval(()=>console.log(`Still alive. @launch:${startTime} @now:${new Date().toLocaleString("sv")}`), 1000);