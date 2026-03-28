# Level browse

---------

### `api/level`

**URL Parameters:**

`levelId` - the levelId to fetch

**GET**

**RESPONSES:**

`404` - level not found

`200` - Request OK

----------

### `api/browse`

Returns levels by increments of 50

**URL Parameters:**

`page` - the page to get. Defaults to 1

`sortBy` - how to sort the levels

Available options:

- `"date"` - sort by the date created
- `"plays"` - sort by the number of plays
- `"finishes"` - sort by the finishes of the level
- `"rating"` - sort by the rating

**GET**

RESPONSES

`200` - Returns the list of levels

---------

### `api/search`

Searches the levels by name and sorts by similarity to the search prompt

**URL Parameters:**

`page` - the page to get. Defaults to 1

`search` - the search term

**GET**

**RESPONSES:**

`200` - Returns the list of levels

----------

### `api/play`

Play a level!

**POST**

**BODY**

`levelId` - the id of the level which to play

`finished` - specifies whether the level was finished

**RESPONSES:**

`200` - updated play counter

----------

### `api/myLevels`

Get all of your created levels

**GET**

**RESPONSES:**

`401` - not signed increments

`404` - no levels found

`200` - Returns the list of levels

----------

#### `api/rate`

Rate a level thumbs up or thumbs down

**URL Parameters**

`levelid` - the level to rate

`rating` - what to rate it. `true`: thumbs up; `false`: thumbs down

**GET**

**RESPONSES**

`400` - a parameter is missing

`200` - rated successfully
