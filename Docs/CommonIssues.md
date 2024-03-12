# Common Issues

This document is where various issues are logged, which have a good chance of being encountered, or which are very hard to understand if they are encountered. The intention is that when devs encounter a difficult problem, or one which they vaguely recall having dealt with before, they can quickly search here to find the "cached solution" (if one exists).

The document is split into a few categories, based on the "context" in which the error is expected to be seen. And each issue entry is split into a few sections as well.

Issue sections:
* Header: The explicit error message, if it exists (unless very unwieldy); else a summary of what the user sees having gone wrong.
* TLDR: The quick way to to solve the problem, if one exists.
* Trigger: What user/dev actions cause the issue to occur, if known.
* Reason: Explanation of what's happening behind the scenes, such that the user/dev action above causes the issue.
* Solution: If there isn't a "TLDR" way of solving the problem (or if it's not always the best way to do so), a longer explanation of how to solve it can be described here.

## Context: Error in the logs of a kubernetes pod/resource

> #### `Build Failed: Internal error occurred: failed calling webhook "validate.gateway.networking.k8s.io": failed to call webhook: Post "https://gateway-api-admission-server.default.svc:443/validate?timeout=10s": service "gateway-api-admission-server" not found`

**TLDR:** Open the k8s cluster in Lens, go to Config -> Validating Webhook Configs, then delete the stuck entry (there should only be one).

**Trigger:** When deploying to the k8s cluster, using Tilt. (only happens sometimes; unsure of the exact trigger)