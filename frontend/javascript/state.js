export const state = {
  user: {
    id: null
  },
  colorSchemes: [
    {
      name: "Cream",
      id: "cream",
      colors: {
        bgPrimary: '#f1e8d4',
        bgAccent: '#cbc3b0',
        bgLevel: '#cae3f6',
        action: 'black',
        border: 'black',
        textOnPrimary: 'black',
        textOnAccent: 'black',
        textOnAction: '#f1e8d4'
      }
    },
    {
      name: "Blue",
      id: "blue",
      colors: {
        bgPrimary: '#a8b7d3',
        bgAccent: '#94a1c5',
        bgLevel: '#a3c9e5',
        action: 'black',
        border: 'black',
        textOnPrimary: 'black',
        textOnAccent: 'black',
        textOnAction: '#a8b7d3'
      }
    }
  ],
  player: {
    triggers: [],
    standingOnTrigger: false,
    toggledTile: true,
    dieCameraTime: 30, // frames
    dieCameraTimer: 30,
    dieCameraStart: {},
    died: false,
    collectedCoins: 0,
    collectedCoinList: [],
    cam: { x: 0, y: 0 },
    vy: 0,
    vx: 0,
    jumpHeight: 2.5,
    yInertia: 1,
    jumpWidth: 7,
    xInertia: 1.5,
    bouncePadHeight: 8,
    x: 0,
    y: 0,
    w: 30,
    h: 30,
    stopThreshold: 0.4,
    grounded: false,
    coyoteTime: 5,
    coyoteTimer: 0,
    wallCoyoteTime: 10,
    wallCoyoteTimer: 0,
    lastWallSide: 0,
    jumpBuffer: 10,
    jumpBufferTimer: 0,
    tileSize: 64,
    lastCheckpointSpawn: { x: 0, y: 0 },
    facingLeft: 1,
    AnimationFrame: 0,
    AnimationFrameCounter: 0,
    wallJump: "up",
    decreaseAirControl: true,
    autoJump: false,
    controlTimer: 0,
    controlMultiplier: 1,
    hasKeyboard: true,
    dissipations: [],
    triggerTimeouts: []
  },
  editor: {
    colorTheme: {
      bgPrimary: '#E6D6B2',
      bgAccent: '#E6D6B2',
      bgLevel: '#CAD9E5',
      action: 'black',
      textOnPrimary: 'black',
      textOnAccent: 'black',
      textOnAction: '#E6d6b2'
    },
    showTriggerHighlights: true,
    cam: {
      x: 0,
      y: 0
    },
    tx: 0,
    ty: 0,
    level: { id: null, owner: null },
    dirty: false,
    currentRotation: 0,
    playerSpawn: { x: 0, y: 0 },
    tileSize: 32,
    selectedTile: 1,
    lastSelectedTiles: [2, 1], // [1] is the current selected tile
    map: {
      w: 100,
      h: 50,
      tiles: new Uint16Array(100 * 50)
    },
    width: 100,
    height: 50,
    tileset: [],
    limitedPlacedTiles: [],
    tilesetPath: "/assets/medium.json",
    dissipateTime: 2 * 60,
    dissipateDelay: 2 * 60,
    history: [],
    future: [],
    selectionLayer: new Uint16Array(100 * 50),
    selection: {
      active: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      hasFloatingTiles: false,
      triggers: []
    },
  },
};
