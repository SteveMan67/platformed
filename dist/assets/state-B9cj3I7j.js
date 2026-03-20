export const state = {
  user: {
    id: null
  },
  colorSchemes: [
    {
      name: "Cream",
      id: "cream",
      colors: {
        bgPrimary: '#EAE2D0',
        bgAccent: '#cbc3b0',
        bgLevel: '#B5D4F0',
        action: '#2D2A26',
        border: '#2D2A26',
        textOnPrimary: '#2D2A26',
        textOnAccent: '#2D2A26',
        textOnAction: '#EAE2D0',
        selection: '#2D2A26'
      }
    },
    {
      name: "Blue",
      id: "blue",
      colors: {
        bgPrimary: '#95B2E9',
        bgAccent: '#647EC2',
        bgLevel: '#BCD4E6',
        action: '#2D313F',
        border: '#2D313F',
        textOnPrimary: '#2D313F',
        textOnAccent: '#2D313F',
        textOnAction: '#BCD4E6',
        selection: '#2D313F'
      }
    },
    {
      name: "Coffee",
      id: "coffee",
      colors: {
        bgPrimary: '#2F271B',
        bgAccent: '#765D41',
        bgLevel: '#765D41',
        action: '#DAD0B0',
        border: '#DAD0B0',
        textOnPrimary: '#DAD0B0',
        textOnAccent: '#DAD0B0',
        textOnAction: '#2A2722',
        selection: 'black'
      }
    },
    {
      name: "Midnight",
      id: 'sailor',
      colors: {
        bgPrimary: '#0D0D32',
        bgAccent: '#D7C0A7',
        bgLevel: "#D7C0A7",
        action: '#D7C0A7',
        border: "#D7C0A7",
        textOnPrimary: '#D7C0A7',
        textOnAccent: '#0D0D32',
        textOnAction: '#D7C0A7',
        selection: 'black'
      }
    },
    {
      name: "Mahogany",
      id: 'mahogany',
      colors: {
        bgPrimary: '#2A0C0D',
        bgAccent: '#551C1D',
        bgLevel: "#D2BAA5",
        action: '#D2BAA5',
        border: "#D2BAA5",
        textOnPrimary: '#D2BAA5',
        textOnAccent: '#D2BAA5',
        textOnAction: '#2A0C0D',
        selection: '#2A0C0D'
      }
    },
    {
      name: "Black and White",
      id: "blackandwhite",
      colors: {
        bgPrimary: 'black',
        bgAccent: '#303030',
        bgLevel: 'white',
        action: 'white',
        border: 'white',
        textOnPrimary: 'white',
        textOnAccent: 'white',
        textOnAction: 'black',
        selection: 'black'
      }
    }
  ],
  player: {
    movingBlocks: [],
    physicsVersion: 2,
    slidiness: 0.8,
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
    onMovingPlatform: false,
    stopThreshold: 0.4,
    grounded: false,
    coyoteTime: 5,
    coyoteTimer: 0,
    wallCoyoteTime: 1,
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
