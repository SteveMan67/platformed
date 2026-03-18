## This file explains the optimizations that go into my project

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