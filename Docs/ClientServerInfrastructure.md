# Client/server infrastructure

## Overview

The [client](https://github.com/debate-map/app/tree/master/Packages/client) and [server](https://github.com/debate-map/app/tree/master/Packages/app-server) are both written in Javascript. They share the same definitions for document types and such, by both importing the [common](https://github.com/debate-map/app/tree/master/Packages/js-common) package.

Because of the "common" package, the validation code for [commands](https://github.com/debate-map/app/tree/master/Packages/js-common/Source/Commands) is usable from both the frontend and backend. This lets the frontend verify inputs from the user without those inputs even needing to be sent to the server (though the server also verifies it once it is submitted, of course).

## Type definitions

Unfortunately, there is quite a bit of redundancy here:
* Definition 1: Typescript interface (for compile-time checking of property accesses, etc.)
* Definition 2: JSON Schema interface (for server-side validation of shape, email address format, etc.)
* Definition 3: The GraphQL types (so that people inspecting the GraphQL API can know the shape, using the standard GraphIQL interface)
* Definition 4: The PostgreSQL column types (so that the database can guarantee its data to be valid internally, and for performance/indexing reasons)
* Partial definition 5: Derivations of the above, eg. for "UpdateX" commands (you can pass in just certain fields to update, without passing an entire valid entry)

I try to automatically derive these things from each other where possible, and make things easy to maintain, but it's still not "ideal".

Currently I have:
* Definition 1: declared manually
* Definition 2: declared manually, but using a small field decorator right next to the Typescript field declaration (easing maintenance)
* Definition 3: derived automatically from the PostgreSQL column types (by Postgraphile)
* Definition 4: declared manually, but using a small field decorator right next to the Typescript field declaration (easing maintenance)
* Partial definition 5: derived automatically from definition 2 (for both the JSON schema and GraphQL schema)