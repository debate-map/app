# Debate Map (Server)

This repository contains the code for both:
1) The "server": the NodeJS server, called by clients for db-writes, through which all db-writes are performed. (see Source/Server)
2) The "server link": a module (see Source/Link), used by clients for db-reads and command-validation, containing the core code shared between server and client. (see Source/@Shared)