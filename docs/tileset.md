# Tileset Documentation

Each tileset consists of a JSON file that tells the website where to look for it, and either a folder of files that contain the images for the tileset, or one full spritesheet image.

## Examples

Look in `/assets/` for the existing tilesets to see how they are structured.

## **Setting up the basic tileset JSON**

**Properties:**

- `path` - the path where the files are kept
- `name` - the name of the tileset
- `type` - whether it's a spritesheet or individual files for each tile.
- `spritesheetPath` - the path to the spritesheet from the frontend directory
- `characterFile` - the path to the character file, added to the `path` property
- `imgWidth` - the width of the tiles
- `tileWidth` - the width of the spritesheet in tiles
- `tiles` - a list of each tile in the tileset

## **Individual Tiles**

Each tile in the list is an object that can have different properties.

**Required Properties**

- `id` - the id of the tile
- `name` - the name of the tile
- `type` - what type of tile it is. See the section for tile type.
- `category` - the category of tile it is
- `file` - the file to read from

**Other Properties**

- `triggerAdjacency` - whether this block should trigger adjacency for other tiles
- `mechanics` - a list of different mechanics that the block has, see the section labeled "Mechanics"
- `x` - the x position of the tile on the spritesheet, zero-based
- `y` - the y position of the tile on the spritesheet, zero-based

### Tile Categories

- `"blocks"` - main blocks
- `"collectibles"` - blocks that can be collected, like coins
- `"powerups"` - not functional yet, but you can still put your blocks here if you want
- `"hazards"` - spikes and other hazardous materials
- `"mobs"` - any mobs
- `"triggers"` - blocks that have to do with triggers
- `"mechanics"` - level mechanics like checkpoints and spawn

### Mechanics

Mechanics tell the game engine what to do with the block.

**Available Mechanics**

- `"killOnTouch"` - kill the player if they touch this block
- `"spawn"` - spawn the player wherever this block is placed
- `"checkpoint"` - respawn the player here if they touch this block and then die
- `"end"` - finish the level when the player collides with this block
- `"noCollision"` - the player won't collide with this block
- `"onePerLevel"` - limit placement to one per level (useful for spawn and end blocks)
- `"hidden"` - don't render this tile on game play
- `"bouncePad"` - throws the player into the air. NOTE: use the type of rotation here so that you can bounce the player different directions.
- `"Dissipate"` - the player will no longer collide with the block if they stand on it for more than 2 seconds
- `"Coin"` - Used for coins
- `"swapTrigger1"` & `"swapTrigger2"` - the blocks to switch between when the swap blocks trigger is triggered
- `"trigger"` - use this trigger as a block

## Tile Type

There are multiple different types of tiles, described blue-block

**Empty**

Just air. No Image needed.

**Standalone**

Consists of one image, with the same width and height

**Rotation**

Consists of a 4x1 strip of images, each rotating 90&deg; counter-clockwise

**Adjacency**

Consists of a 16x1 strip of images. The adjacency system uses 4 bits, each toggling a different side that's touching another tile. The first bit is the bottom, the next is the left, then the top, and then the left. Those bits tell us which tile in the strip to use.

## The player spritesheet

The player spritesheet is a 10x1 strip of tiles.

1. standing facing right
2. standing facing left
3. walking right first frame
4. walking left first frame
5. walking right second frame
6. walking left second frame
7. jumping right
8. jumping left
9. falling right
10. falling left

# Submitting your own tileset

To submit your own tileset, make a pull request with all the player files and the json file. Have fun!

**One final note:**

Currently switching tilesets just uses whatever tileId that the previous had, and if it doesn't have one for that id, there's no block in the level. I'm currently working on a function to automatically switch between the tilesets regardless of id, but for the time being make sure the `"id"` property of each tile matches up with the existing tilesets.
