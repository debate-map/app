const config = require("../Config");
const server = require("../Server");
const debug = require("debug")("app:bin:server");
const port = config.server_port;

server.listen(port);
debug(`Server is now running at http://localhost:${port}.`);