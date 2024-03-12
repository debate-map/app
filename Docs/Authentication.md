# Authentication

## Example

Sign in:
1) Sign in button in frontend navigates to Google auth page. (with config set with correct origins and redirect uris)
2) Google auth page redirects to "/app-server/auth/google/callback".
3) In server handler, server reads/adds user in db, then tells frontend to redirect to homepage.

Regular operation:
1) Frontend sends user-data/JWT to backend through http-request.
2) Server creates a temporary connection-id (with user-data stored for it) that it sends back to the frontend. [preferred over using the http-only cookie, because cookies are only sent on initial websocket handshake, meaning you can't set or change the user-id through it after the initial point without recreating the websocket connection]
3) Frontend sends its connection-id to the server through the existing websocket connection; the user-data is now associated with the websocket connection.
4) When postgraphile makes a Postgres query (to respond to a GraphQL request from the client), it uses the user-data associated with the websocket connection to set a variable accessible within Postgres.
5) Postgres verifies that the GraphQL request-maker has the correct permissions, through use of a Row-Level Security policy. (comparing row data with user-id variable)

As for executing commands/mutations on the server, that requires even more auth handling, because the execution of the commands/mutations has to read data from the DB first, which involves a server-to-server websocket connection for Apollo to use, requiring the caller's user-data to be associated with those secondary websocket requests as well (temporarily, during each command's execution).