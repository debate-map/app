# General Conventions

## Overview

To be written.

## Database Classes (those marked @MGLClass)

* Every row-level class (MapNode, MapNodeRevision, etc.) should have a jsonb `extras` field; this is to enable experimentations with the addition/removal of data-structures without having to perform database migrations.
	* The root fields within these jsonb objects should also all be optional; because TypeScript warns about possibly-null values, this results in the codebase being able to handle the `extras` field being empty, making the codebase more robust to being run against multiple database versions.