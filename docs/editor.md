## Using the Editor

Platformed includes a feature rich editor that you can use to create unique levels. 


## Getting Started

### Selecting blocks 

You can use the sidebar to select blocks. Each icon in the bottom section of the sidebar is a category. In order: 

- Mechanics - level mechanics such as spawn, checkpoints, bouncepads, and end flags
- Triggers - Blocks related to triggers
- Mobs - incomplete, currently there is one mob that is goomba-esque and is just a black box.
- Hazards - Mainly different types of spikes
- Powerups - tbd
- Collectibles - just coins so far
- Blocks - base blocks, along with signs

Instead of clicking the category, you can press keys `1-7` to switch categories (1 is blocks, 7 is mechanics). You can also use `<shift><scroll>` to switch blocks within a category.

### Getting around

You can __move__ with WASD, middle mouse button drag, or two finger touch on the trackpad. __Zoom in__ with either `<Ctrl><scroll>` or pinch on trackpads.

### The Minimap 

The minimap shows an overview of the level, along with a box showing where the camera is in the level. Click (or drag) anywhere on it to move the camera.


### Placing Tiles

left click anywhere on the level to place the selected block. You can view information about the selected block in the bottom bar such as the tileId and the name of the block.

### Rotating Tiles

There are several tiles such as spikes and signs that are able to be rotated. You can change the rotation of a placed tile by hovering over it and pressing `R`. If you just want to change the rotation of the selected tile, you can do so by pressing `R`. This will change what rotation tiles will be placed in when you place a block.

### Bottom Bar

The bottom bar displays useful information. On the left is the tileId and name of the selected block, and on the right is the x and y position of the cursor.

### Selection Box

The selection box is a powerful tool that allows you to create levels quickly. hold shift and then click and drag to select something. Once you have a selection, there are a few things you can do with it:

- Move Selection - Click and drag on the selection to move it around the level. If you want to move it somewhere that's off screen, don't worry! The camera will automatically move if your on the edge of the screen. 
- Fill selection - Press `F` to fill the selection with the currently selected tile
- Erase selection - Press `E` to erase everything within the selection. 
- Rotate selection - press `R` to rotate every tile able to be rotated within a selection by 90&deg;
- Exit Selection - Press `<Esc>` to exit the selection

### Undo/Redo

I took the time to build a functioning history system. To use it, just press `Ctrl-Z` to undo and `Ctrl-Shift-Z` to redo. 

## Triggers

Triggers add whole layer of complexity to your levels. There are different functions they can do, such as teleporting the player, changing a block, and more. 

To start, place a trigger in the level and then right click on it. This will show a dialog where you can add the trigger steps. An explanation of each:

- Swap red and blue - Switches between the red and blue blocks found in the triggers category
- Teleport Player - Teleports the player to a given x and y position. Refer to the bottom bar to figure out the coordinates of the desired position. Checking `instant` makes the teleport instant, otherwise it will have a camera animation
- Rotate Block - rotates a block x, y a given amount of degrees counter-clockwise
- Change Block - Change a block at x, y to a specific tile
- Delay - pause execution for a given amount of milliseconds

### TriggerScript

TriggerScript is a minimal scripting language I made in order to make more complex triggers. You can access it from the typical trigger dialog by pressing Edit with TriggerScript. For a full reference, see [`/docs/TriggerScript.md`](https://github.com/SteveMan67/platformed/blob/main/docs/TriggerScript.md).
