Trigger script allows you to code what a trigger should do when triggered with code. 

## How it works
Each line is a command with options following it. It is case insensitive.

## Commands

### CHANGE

#### Syntax: 

`CHANGE <x> <y> BLOCK <tileId> ROTATE <rotation>`

#### Options:

`<x> <y>` - the position of the block to be altered

`BLOCK <tileId>` - change the block to this tileId

`ROTATE <rotation>` - rotate the block 90&deg; `<rotation>` amount

---

### TELEPORT

#### Syntax:

`TELEPORT <x> <y> INSTANT`

#### Options:

`<x> <y>` - where to teleport the player

`INSTANT` - Include to make the teleport instant

--- 

### DELAY

#### Syntax:

`DELAY <ms>`

#### Options:

`<ms>` - how long to delay in milliseconds

---

### FILL

#### Syntax: 

`FILL <x1> <y1> <x2> <y2> BLOCK <tileId>`

#### Options:

`<x1> <y1> <x2> <y2>` - The start and end coordinates of where to fill

`BLOCK <tileId>` - Sets the tileId of the tile fill with

--- 

### IF

#### Syntax:

`IF BLOCK <x> <y> IS <property> <value>`

#### Options

`BLOCK <x> <y>` - The block to check

`<property>` - What about the block to check, Can be `TILEID`, `ROTATION`, or `TYPE`

---

### ELSE 

#### Syntax:

`ELSE`

--- 

### END

#### Syntax:

`END`

--- 

## Example Scripts

__Toggles a tile between ground and air__
```
if block 2 9 is tileid 1 then
change 2 9 block 0
else 
change 2 9 block 1
end
```

__Teleport to (1, 10)__
```
teleport 1 10 instant
```

__Fills from (1, 4) to (2, 5), waits half a second, then deletes it__
```
fill 1 4 2 5 block 1
delay 500
fill 1 4 2 5 block 0
```

__Changes block (1, 4) to tileId 4 and rotates it twice__
```
change 1 4 block 4 rotate 2
```

__Changes block (1, 5) to tileId 0 (air)__
```
change 1 5 block 0 
```