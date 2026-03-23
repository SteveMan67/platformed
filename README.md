# Platformed
Platformed is an in depth platformer game with a fully functioning trigger system, built in level editor, online level sharing, built from the ground up in javascript.

## Level Editor
The level editor is probably the most powerful part of this project and has many features to help make designing levels easier. 

**Some Hightlights:**
- Fully functioning **Trigger System** that can change any block, teleport the player, or swap two different types of tiles
- The **selection box** allows you to pick up and move sections of tiles around the level, fill the selection, or delete it.
- Working **undo/redo** functionailty
- Test the level from within the level editor
- **Minimap** that you can use to move around

Full Documentation at [/docs/editor.md](https://github.com/SteveMan67/platformed/blob/main/docs/editor.md)

## Level Share
An online level share means you can share your creation with the world (or at least the internet). 

## The platformer
The platformer is complete with 3 different tilesets (16x16 being the most complete). It has **Spawn**, **Checkpoint**, **End**, **Trigger**, **Walljump**, functionalites, along with many more.

__Features__
-Triggers
It also has mobile support, with a fullscreen mode for the level page and working mobile controls. And if you want to connect a gamepad, that works too! 

## Trigger System

Platformed includes an in depth trigger system that you can use to make fully interactive levels and immerse the player in the game's experience. 

## Trigger Script

TriggerScript is a minimal language that can be used in place of the ui to code triggers.

Full documentation at [/docs/TriggerScript.md](https://github.com/SteveMan67/platformed/blob/main/docs/TriggerScript.md)

## Want some levels to play?

Here are some of the levels I've made over the course of this project:
- [Trigger Happy](https://platformed.jmeow.net/level/44) - a level showing off the extensive trigger system
- [Level 2](https://platformed.jmeow.net/level/28) - beware...
- [Part 1](https://platformed.jmeow.net/level/1) - just another level

# Optimization

### **The game loop**

**Data Storage**

All the tiles in the level are stored in a `Uint16Array`, which is an unsigned 16 bit array. The first 4 bits of each entry store rotation data and adjacency data. This unsigned array makes it super super fast to run.

An example entry: 

`const entry = 0000000001010011`

**Decoding it**

First we get the tileId, which is everything after the first 4 bits. we can do `entry >> 4` to grab these bits. For this entry, it would be `101`, which is `5`, so our tileId is `5`.

Next we grab the corresponding entry from the tileset, `const tile = editor.tileset[tileId]`. If `tile.type` is `"adjacency"` or `"rotation"`, then we need to grab 

The first 4 bits, `0011` store rotation data or adjacency data. We can do that with `entry & 15`, wich is `0011`. `0011` is 3, so that's the image we use from `tileset[tileId].images`, which we then render on the canvas every frame.

### **Vite***

For javascript size optimization, I build the site using vite. Vite automatically does things like tree shaking and minification to reduce file sizes. It also puts the svgs directly into the css so we don't have to run seperate fetches for each of them. Minification is very headache inducing to look at. 


### **Level Storage**

When we need to save the level, instead of just saving the plain Uint16Array in the json, we can do some stuff to make it smaller. 

First of all, we don't need the adjacency data to be stored. That can be calculated when we load the level, so instead we store just the tileId. We do want to store rotation data, so we create a seperate array of rotation data and store that. 

We still have an array with a length of 5000 for a 100x50 dimension level. In order to shrink that down, we use **Run Length Encoding**. What that does is instead of storing the plain array, we store an array of arrays, each with two numbers. the first is the value of the run, and the second is how long that run goes on. 

For example, say we have this list: `[1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 4, 1, 1, 1]`. Instead of storing that in the json, we store `[[1, 6], [0, 4], 4, [1, 3]]`. This takes the file size down to ~4KB. 