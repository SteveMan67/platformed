# Level Editing

----------

### `api/upload`

Upload a level

**POST**

BODY

`data` - the level data

`name` - the level name, defaults to "My New Level"

`tags` - a list of tags for the level, each being a string

`description` - a description of the level

**RESPONSES:**

`200` - level was successfully created

`401` - not signed in

----------

## `api/edit`

Edit a level

**PATCH**

**BODY:**

`name` - the level name

`data` - the level data

`width` - the level width

`height` - the level height

`tags` - a list of tags

`description` - the level description

`public` - determines the visibility of the level

**RESPONSES:**

`401` - Invalid auth

`200` - level edited successfully

---------

### `api/delete`

Delete a level. BE CAREFUL!!

**DELETE**

**BODY:**

`levelId` - the level id of the level to be deleted

**RESPONSES:**

`404` - Level does not exist

`401` - um... that's not your level

`200` - level deleted successfully
