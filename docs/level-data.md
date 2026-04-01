# Level Data

This file details the level data storage scheme.

## Metadata

This is the information that the level share uses to display levels:

- `id:` - the id of the level
- `public`- the visibility of the level, Boolean
- `data` - the level data described below
- `name` - the name of the level
- `description` - a description of the level
- `width`  - the level width
- `height` - the level height
- `owner` - the id of the level owner
- `tags` - a list of tags
- `image_url` - currently doesn't do anything
- `approvals` - how many people have rated this level thumbs up
- `disapprovals` - how many people have rated this level thumbs down
- `approval_percentage` - the percentage of people who have rated it thumbs up versus thumbs down
- `total_plays` - how many times the level has been played
- `finished_plays` - how many times the level has been finished
- `owned` - is the user who requested this level the owner
- `username` - the username of the owner

## Level Data

- `width`  - the level width, max: 200, min: 10
- `height` - the level height, max: 100, min: 10
- `jumpHeight` - how far the player should jump in tiles
- `wallJump` - what type of walljump the level should have, either `"none"`, `"off"`, or `"up"`
- `bouncePadHeight` - the height in tiles the bounce pads should propel you
- `zoom` - how many pixels should be used to display a block
- `tilesetPath` - the path to the tileset
- `layers` - an array of the different layers of the level
- `spawn` an object with x and y properties showing where the player should spawn
- `triggers` - a list of triggers in the level

## Layers

Each layer has a `"type"` property that determines what type of layer it is. There can only be one type of each layer. They also have a `data` property that stores the actual data of that layer in an array.

## **RLE Encoding**

RLE, or run length encoding compresses data by storing runs of numbers instead of each number individually. For example, instead of storing

`[0, 0, 0, 0, 0, 5, 6, 1, 1, 1, 0]`

RLE would encode that as:

`[[0, 5], 5, 6, [1, 3], 0]`

This takes a level down to about 4KB.

**Layer Types**

`"tileLayer"` - stores the tileIds of every single block in the level

This uses RLE to store each

`"rotation"` - stores rotation of the blocks in the level
