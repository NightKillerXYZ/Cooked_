/**
 * Pixelated Avatar System for STUDY TRACKER
 * 8-16 bit pixel art style with customization options
 */

// ============================================
// AVATAR CONFIGURATION
// ============================================

const AVATAR_SIZE = 32; // Base size in pixels
const AVATAR_SCALE = 3; // Scale for display

// Customization options
const AVATAR_OPTIONS = {
  // Hair styles (messy/tousled pixel art)
  hair: {
    'messy': { name: 'Messy', frames: ['messy_1', 'messy_2', 'messy_3'] },
    'spiky': { name: 'Spiky', frames: ['spiky_1', 'spiky_2'] },
    'curly': { name: 'Curly', frames: ['curly_1', 'curly_2'] },
    'bob': { name: 'Bob Cut', frames: ['bob_1', 'bob_2'] },
    'long': { name: 'Long', frames: ['long_1', 'long_2'] },
  },
  
  // Hair colors
  hairColors: {
    'black': '#2C1810',
    'brown': '#5C4033',
    'blonde': '#F5D76E',
    'red': '#D95D39',
    'blue': '#4A90E2',
    'green': '#6AA84F',
    'purple': '#8A4F7D',
    'pink': '#F4A6A6',
    'white': '#F8F8F2',
  },
  
  // Skin tones
  skinTones: {
    'light': '#FFE0C8',
    'medium': '#D4A574',
    'tan': '#B38867',
    'dark': '#8C5A3B',
    'deep': '#5A3921',
  },
  
  // Eye styles
  eyes: {
    'normal': { name: 'Normal', size: 'medium' },
    'big': { name: 'Big', size: 'large' },
    'small': { name: 'Small', size: 'small' },
    'closed': { name: 'Closed', size: 'medium' },
    'wink': { name: 'Winking', size: 'medium' },
  },
  
  // Eye colors
  eyeColors: {
    'brown': '#5C4033',
    'blue': '#4A90E2',
    'green': '#6AA84F',
    'gray': '#8C8C8C',
    'black': '#2C1810',
  },
  
  // Outfit colors
  outfitColors: {
    'red': '#E74C3C',
    'blue': '#3498DB',
    'green': '#2ECC71',
    'yellow': '#F1C40F',
    'purple': '#9B59B6',
    'black': '#2C3E50',
    'white': '#ECF0F1',
    'gray': '#95A5A6',
    'pink': '#E91E63',
    'orange': '#E67E22',
  },
  
  // Pants colors
  pantsColors: {
    'jeans': '#1F618D',
    'black': '#2C3E50',
    'gray': '#7F8C8D',
    'khaki': '#BDC3C7',
    'shorts': '#E74C3C',
  },
  
  // Shoe colors
  shoeColors: {
    'white': '#ECF0F1',
    'black': '#2C3E50',
    'blue': '#3498DB',
    'red': '#E74C3C',
    'green': '#2ECC71',
  },
  
  // Accessories
  accessories: {
    'none': { name: 'None' },
    'glasses': { name: 'Glasses', type: 'face' },
    'hat': { name: 'Hat', type: 'head' },
    'headphones': { name: 'Headphones', type: 'head' },
    'backpack': { name: 'Backpack', type: 'back' },
    'tie': { name: 'Tie', type: 'chest' },
  },
  
  // Expressions
  expressions: {
    'neutral': { name: 'Neutral', mouth: 'neutral', eyes: 'normal' },
    'happy': { name: 'Happy', mouth: 'smile', eyes: 'normal' },
    'sad': { name: 'Sad', mouth: 'frown', eyes: 'sad' },
    'excited': { name: 'Excited', mouth: 'open', eyes: 'wide' },
    'confused': { name: 'Confused', mouth: 'confused', eyes: 'squint' },
    'surprised': { name: 'Surprised', mouth: 'open', eyes: 'wide' },
    'tired': { name: 'Tired', mouth: 'tired', eyes: 'half' },
    'proud': { name: 'Proud', mouth: 'smile', eyes: 'proud' },
    'angry': { name: 'Angry', mouth: 'angry', eyes: 'angry' },
  },
};

// ============================================
// PIXEL ART DEFINITIONS
// ============================================

/**
 * Pixel avatar builder - creates avatar from individual body parts
 * Each part is defined as a grid of pixels
 */

class PixelAvatar {
  constructor(customization = {}) {
    this.size = AVATAR_SIZE;
    this.scale = AVATAR_SCALE;
    this.customization = this.getDefaultCustomization();
    this.updateFromConfig(customization);
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.currentAnimation = 'idle';
    this.direction = 'front';
  }
  
  getDefaultCustomization() {
    return {
      hair: 'messy',
      hairColor: 'black',
      skin: 'medium',
      eyes: 'normal',
      eyeColor: 'brown',
      outfit: 'blue',
      pants: 'jeans',
      shoes: 'white',
      accessory: 'none',
      expression: 'neutral',
    };
  }
  
  /**
   * Set customization option
   */
  setOption(category, value) {
    if (AVATAR_OPTIONS[category] && AVATAR_OPTIONS[category][value]) {
      this.customization[category] = value;
      return true;
    }
    return false;
  }
  
  /**
   * Set animation
   */
  setAnimation(animation) {
    const validAnimations = ['idle', 'walk', 'run', 'jump', 'wave', 'sit', 'blink'];
    if (validAnimations.includes(animation)) {
      this.currentAnimation = animation;
      this.animationFrame = 0;
      return true;
    }
    return false;
  }
  
  /**
   * Set direction
   */
  setDirection(direction) {
    const validDirections = ['front', 'back', 'left', 'right'];
    if (validDirections.includes(direction)) {
      this.direction = direction;
      return true;
    }
    return false;
  }
  
  /**
   * Update animation frame
   */
  update(deltaTime) {
    this.animationTimer += deltaTime;
    
    // Animation speeds (in milliseconds)
    const animationSpeeds = {
      'idle': 2000,
      'blink': 3000,
      'walk': 200,
      'run': 150,
      'jump': 100,
      'wave': 500,
      'sit': 3000,
    };
    
    const speed = animationSpeeds[this.currentAnimation] || 2000;
    if (this.animationTimer >= speed) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % this.getFrameCount();
    }
  }
  
  /**
   * Get number of frames for current animation
   */
  getFrameCount() {
    const frameCounts = {
      'idle': 4,
      'blink': 2,
      'walk': 4,
      'run': 4,
      'jump': 3,
      'wave': 2,
      'sit': 2,
    };
    return frameCounts[this.currentAnimation] || 1;
  }
  
  /**
   * Get pixel data for a specific body part
   */
  getBodyPart(partName) {
    const parts = this.getBodyPartDefinitions();
    return parts[partName] || [];
  }
  
  /**
   * Get all body part definitions based on customization
   */
  getBodyPartDefinitions() {
    const { hair, hairColor, skin, eyes, eyeColor, outfit, pants, shoes, accessory, expression } = this.customization;
    const { direction, currentAnimation, animationFrame } = this;
    
    // Base body (skin tone)
    const body = this.getPixelGridForBody(skin, direction);
    
    // Head and face
    const head = this.getPixelGridForHead(skin, direction);
    const face = this.getPixelGridForFace(skin, eyes, eyeColor, expression, direction, animationFrame);
    
    // Hair
    const hairGrid = this.getPixelGridForHair(hair, hairColor, direction, animationFrame);
    
    // Clothing layers
    const hoodie = this.getPixelGridForHoodie(outfit, direction);
    const pantsGrid = this.getPixelGridForPants(pants, direction);
    const shoesGrid = this.getPixelGridForShoes(shoes, direction, animationFrame);
    
    // Accessories
    const accessoryGrid = this.getPixelGridForAccessory(accessory, direction);
    
    return {
      body,
      head,
      face,
      hair: hairGrid,
      hoodie,
      pants: pantsGrid,
      shoes: shoesGrid,
      accessory: accessoryGrid,
    };
  }
  
  /**
   * Get pixel grid for body
   */
  getPixelGridForBody(skinColor, direction) {
    const grids = {
      front: [
        '        ',
        '   ##   ',
        '  ####  ',
        '  ######',
        '   #### ',
        '   ##   ',
        '        ',
        '        ',
      ],
      back: [
        '        ',
        '   ##   ',
        '  ####  ',
        '  ######',
        '   #### ',
        '   ##   ',
        '        ',
        '        ',
      ],
      left: [
        '   #    ',
        '  ###   ',
        ' #####  ',
        ' #####  ',
        '  ###   ',
        '   #    ',
        '        ',
        '        ',
      ],
      right: [
        '   #    ',
        '  ###   ',
        ' #####  ',
        ' #####  ',
        '  ###   ',
        '   #    ',
        '        ',
        '        ',
      ],
    };
    
    return this.applyColorToGrid(grids[direction] || grids.front, skinColor);
  }
  
  /**
   * Get pixel grid for head
   */
  getPixelGridForHead(skinColor, direction) {
    const headGrids = {
      front: [
        '   ##    ',
        '  ####   ',
        ' ######  ',
        ' ######  ',
        ' ######  ',
        '  ####   ',
        '   ##    ',
      ],
      back: [
        '   ##    ',
        '  ####   ',
        ' ######  ',
        ' ######  ',
        ' ######  ',
        '  ####   ',
        '   ##    ',
      ],
      left: [
        '   ##   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   ##   ',
      ],
      right: [
        '   ##   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   ##   ',
      ],
    };
    
    return this.applyColorToGrid(headGrids[direction] || headGrids.front, skinColor);
  }
  
  /**
   * Get pixel grid for face with expression
   */
  getPixelGridForFace(skinColor, eyeType, eyeColor, expression, direction, frame) {
    const eyeGrids = this.getEyeGrids(eyeType, eyeColor, expression, frame);
    const mouthGrids = this.getMouthGrids(expression, frame);
    
    // Base face grid (empty)
    const faceGrids = {
      front: [
        '        ',
        '   ##   ',
        '  #  #  ',
        ' #    # ',
        ' #    # ',
        '  #  #  ',
        '   ##   ',
      ],
      back: [
        '        ',
        '   ##   ',
        '  ####  ',
        '  ####  ',
        '  ####  ',
        '  ####  ',
        '   ##   ',
      ],
      left: [
        '    #   ',
        '   ##   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   ##   ',
        '    #   ',
      ],
      right: [
        '    #   ',
        '   ##   ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   ##   ',
        '    #   ',
      ],
    };
    
    const baseGrid = faceGrids[direction] || faceGrids.front;
    
    // Overlay eyes and mouth
    const finalGrid = this.applyColorToGrid(baseGrid, skinColor);
    
    // Add eyes (position depends on direction)
    if (direction === 'front') {
      const eyeY = 2;
      const eyeX1 = 2;
      const eyeX2 = 5;
      
      if (eyeGrids.left && finalGrid[eyeY]) {
        finalGrid[eyeY] = this.overlayGridRow(finalGrid[eyeY], eyeGrids.left[0], eyeX1, eyeColor);
      }
      if (eyeGrids.right && finalGrid[eyeY]) {
        finalGrid[eyeY] = this.overlayGridRow(finalGrid[eyeY], eyeGrids.right[0], eyeX2, eyeColor);
      }
    }
    
    // Add mouth
    const mouthY = direction === 'front' ? 4 : 3;
    if (mouthGrids[0] && finalGrid[mouthY]) {
      const mouthX = direction === 'front' ? 2 : 1;
      finalGrid[mouthY] = this.overlayGridRow(finalGrid[mouthY], mouthGrids[0], mouthX, '#2C1810');
    }
    
    return finalGrid;
  }
  
  /**
   * Get eye grids based on type and expression
   */
  getEyeGrids(eyeType, eyeColor, expression, frame) {
    const eyeStyles = {
      normal: [
        [' # '],
        ['###'],
        [' # '],
      ],
      big: [
        [' ### '],
        ['#####'],
        [' ### '],
      ],
      small: [
        ['#'],
      ],
      closed: [
        ['---'],
      ],
      wink: frame % 2 === 0 ? [
        [' # '],
        ['###'],
        [' # '],
      ] : [
        ['---'],
        ['   '],
        ['---'],
      ],
    };
    
    // Adjust for expression
    if (expression === 'happy' || expression === 'proud') {
      return eyeStyles.normal;
    }
    if (expression === 'sad' || expression === 'tired') {
      return eyeStyles.small;
    }
    if (expression === 'surprised' || expression === 'excited') {
      return eyeStyles.big;
    }
    if (expression === 'confused') {
      return eyeStyles.squint || eyeStyles.normal;
    }
    
    return eyeStyles[eyeType] || eyeStyles.normal;
  }
  
  /**
   * Get mouth grids based on expression
   */
  getMouthGrids(expression, frame) {
    const mouthStyles = {
      neutral: ['---'],
      smile: [' \_/ '],
      frown: [' /_\ '],
      open: [' \___/ '],
      confused: [' ~ ~ '],
      tired: [' - - '],
      angry: [' / \\ '],
    };
    
    // Animation for some expressions
    if (expression === 'happy' && frame % 2 === 1) {
      return [' \_/ '];
    }
    if (expression === 'surprised') {
      return frame % 2 === 0 ? [' O '] : [' \___/ '];
    }
    
    return mouthStyles[expression] || mouthStyles.neutral;
  }
  
  /**
   * Get pixel grid for hair
   */
  getPixelGridForHair(hairStyle, hairColor, direction, frame) {
    const hairDefinitions = {
      messy: {
        front: [
          ' #####  ',
          '####### ',
          '##   ## ',
          '#     # ',
          '       ',
        ],
        back: [
          ' #####  ',
          '####### ',
          '##   ## ',
          '#     # ',
          '       ',
        ],
        left: [
          '  ###  ',
          ' ##### ',
          '##### ',
          '####  ',
          '       ',
        ],
        right: [
          '  ###  ',
          ' ##### ',
          '##### ',
          '####  ',
          '       ',
        ],
      },
      spiky: {
        front: [
          ' #   #  ',
          '# # # # ',
          '#  #  # ',
          '       ',
          '       ',
        ],
        back: [
          ' #   #  ',
          '# # # # ',
          '#  #  # ',
          '       ',
          '       ',
        ],
        left: [
          ' # #   ',
          '# # #  ',
          '# #    ',
          '       ',
          '       ',
        ],
        right: [
          '   # # ',
          '  # # #',
          '    # #',
          '       ',
          '       ',
        ],
      },
      curly: {
        front: [
          ' ###### ',
          '#    # ',
          '#    # ',
          ' ###### ',
          '       ',
        ],
        back: [
          ' ###### ',
          '#    # ',
          '#    # ',
          ' ###### ',
          '       ',
        ],
        left: [
          ' ###   ',
          '#   #  ',
          '#   #  ',
          ' ###   ',
          '       ',
        ],
        right: [
          '   ### ',
          '  #   #',
          '  #   #',
          '   ### ',
          '       ',
        ],
      },
      bob: {
        front: [
          ' ####  ',
          '#######',
          ' ####  ',
          '       ',
          '       ',
        ],
        back: [
          ' ####  ',
          '#######',
          ' ####  ',
          '       ',
          '       ',
        ],
        left: [
          '  ####',
          ' #### ',
          '####  ',
          '       ',
          '       ',
        ],
        right: [
          '####  ',
          ' #### ',
          '####  ',
          '       ',
          '       ',
        ],
      },
      long: {
        front: [
          '  ###  ',
          '  ###  ',
          '  ###  ',
          '  ###  ',
          '  ###  ',
          '  ###  ',
        ],
        back: [
          '  ###  ',
          '  ###  ',
          '  ###  ',
          '  ###  ',
          '  ###  ',
          '  ###  ',
        ],
        left: [
          '   ###',
          '   ###',
          '   ###',
          '   ###',
          '   ###',
          '   ###',
        ],
        right: [
          '###   ',
          '###   ',
          '###   ',
          '###   ',
          '###   ',
          '###   ',
        ],
      },
    };
    
    const style = hairDefinitions[hairStyle] || hairDefinitions.messy;
    const dirGrids = style[direction] || style.front;
    
    // Animate hair slightly
    if (hairStyle === 'messy' && frame % 4 === 0) {
      // Slight variation for messy hair
      return this.applyColorToGrid(dirGrids, hairColor);
    }
    
    return this.applyColorToGrid(dirGrids, hairColor);
  }
  
  /**
   * Get pixel grid for hoodie/outfit
   */
  getPixelGridForHoodie(outfitColor, direction) {
    const hoodieGrids = {
      front: [
        '        ',
        ' ###### ',
        '#    # ',
        '#    # ',
        ' ###### ',
        '        ',
        '        ',
      ],
      back: [
        '        ',
        ' ###### ',
        '#    # ',
        '#    # ',
        '#    # ',
        ' ###### ',
        '   ##   ',
      ],
      left: [
        '   #    ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   #    ',
        '        ',
        '        ',
      ],
      right: [
        '   #    ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   #    ',
        '        ',
        '        ',
      ],
    };
    
    return this.applyColorToGrid(hoodieGrids[direction] || hoodieGrids.front, outfitColor);
  }
  
  /**
   * Get pixel grid for pants
   */
  getPixelGridForPants(pantsColor, direction) {
    const pantsGrids = {
      front: [
        '        ',
        '        ',
        ' ###### ',
        '#    # ',
        '#    # ',
        ' ###### ',
        ' #  #  ',
      ],
      back: [
        '        ',
        '        ',
        ' ###### ',
        '#    # ',
        '#    # ',
        ' ###### ',
        ' #    # ',
      ],
      left: [
        '        ',
        '        ',
        '  ###   ',
        '  ###   ',
        '  ###   ',
        '   #    ',
        '   #    ',
      ],
      right: [
        '        ',
        '        ',
        '   ###  ',
        '   ###  ',
        '   ###  ',
        '    #   ',
        '    #   ',
      ],
    };
    
    return this.applyColorToGrid(pantsGrids[direction] || pantsGrids.front, pantsColor);
  }
  
  /**
   * Get pixel grid for shoes
   */
  getPixelGridForShoes(shoesColor, direction, frame) {
    const shoeGrids = {
      front: [
        '        ',
        '        ',
        '        ',
        '        ',
        '        ',
        ' #    # ',
        '#      #',
      ],
      back: [
        '        ',
        '        ',
        '        ',
        '        ',
        '        ',
        ' #    # ',
        '##  ##',
      ],
      left: [
        '        ',
        '        ',
        '        ',
        '        ',
        '        ',
        '   #    ',
        '  ##    ',
      ],
      right: [
        '        ',
        '        ',
        '        ',
        '        ',
        '        ',
        '    #   ',
        '    ##  ',
      ],
    };
    
    // Animate shoes for walking
    if (this.currentAnimation === 'walk' && frame % 2 === 0) {
      // Slight movement
    }
    
    return this.applyColorToGrid(shoeGrids[direction] || shoeGrids.front, shoesColor);
  }
  
  /**
   * Get pixel grid for accessories
   */
  getPixelGridForAccessory(accessory, direction) {
    if (accessory === 'none') {
      return [];
    }
    
    const accessoryGrids = {
      glasses: {
        front: [
          '        ',
          '  O  O  ',
          '   --   ',
          '        ',
        ],
      },
      hat: {
        front: [
          '  #####  ',
          ' ####### ',
          '#########',
          '        ',
        ],
      },
      headphones: {
        front: [
          '  O   O  ',
          '   ###   ',
          '  # # #  ',
          '        ',
        ],
      },
      backpack: {
        back: [
          ' ###### ',
          '#    # ',
          '###### ', 
          '#    # ',
          '###### ',
        ],
      },
      tie: {
        front: [
          '   #    ',
          '   #    ',
          '  ###   ',
          '   #    ',
        ],
      },
    };
    
    const acc = accessoryGrids[accessory] || {};
    const dirGrids = acc[direction] || acc.front || [];
    
    return this.applyColorToGrid(dirGrids, '#2C1810'); // Default accessory color
  }
  
  /**
   * Apply color to grid
   */
  applyColorToGrid(grid, color) {
    if (!Array.isArray(grid)) return grid;
    
    return grid.map(row => {
      if (typeof row === 'string') {
        return row.replace(/#/g, color);
      }
      return row;
    });
  }
  
  /**
   * Overlay one grid row onto another at specific position
   */
  overlayGridRow(baseRow, overlayRow, startX, color) {
    if (!baseRow || !overlayRow) return baseRow;
    
    const baseChars = baseRow.split('');
    const overlayChars = (Array.isArray(overlayRow) ? overlayRow.join('') : overlayRow).split('');
    
    for (let i = 0; i < overlayChars.length; i++) {
      if (overlayChars[i] === '#' && startX + i < baseChars.length) {
        baseChars[startX + i] = color;
      }
    }
    
    return baseChars.join('');
  }
  
  /**
   * Render avatar as HTML canvas element
   */
  renderAsCanvas() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const displaySize = 96;
    canvas.width = displaySize;
    canvas.height = displaySize;
    
    // Clear canvas
    ctx.clearRect(0, 0, displaySize, displaySize);
    
    // Get all body parts
    const parts = this.getBodyPartDefinitions();
    
    // Define layer order
    const layerOrder = ['body', 'pants', 'shoes', 'hoodie', 'head', 'face', 'hair', 'accessory'];
    
    // Draw each layer
    for (const layer of layerOrder) {
      const grid = parts[layer];
      if (grid && Array.isArray(grid)) {
        this.drawGridOnCanvas(ctx, grid, displaySize);
      }
    }
    
    return canvas;
  }
  
  /**
   * Render avatar as HTML element (div with pixel art)
   */
  renderAsElement() {
    const container = document.createElement('div');
    container.className = 'pixel-avatar-container';
    container.style.width = `${this.size * this.scale}px`;
    container.style.height = `${this.size * this.scale}px`;
    container.style.position = 'relative';
    container.style.display = 'inline-block';
    
    // Get all body parts
    const parts = this.getBodyPartDefinitions();
    
    // Define layer order
    const layerOrder = ['body', 'pants', 'shoes', 'hoodie', 'head', 'face', 'hair', 'accessory'];
    
    // Create pixel grid for each layer
    for (const layer of layerOrder) {
      const grid = parts[layer];
      if (grid && Array.isArray(grid)) {
        const layerElement = this.createPixelGridElement(grid);
        container.appendChild(layerElement);
      }
    }
    
    return container;
  }
  
  /**
   * Create DOM element from pixel grid
   */
  createPixelGridElement(grid) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${this.size}, ${this.scale}px)`;
    container.style.gridTemplateRows = `repeat(${grid.length}, ${this.scale}px)`;
    
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      
      for (let x = 0; x < row.length; x++) {
        const pixel = document.createElement('div');
        const char = row.charAt(x);
        
        if (char && char !== ' ') {
          pixel.style.backgroundColor = char;
        } else {
          pixel.style.backgroundColor = 'transparent';
        }
        
        pixel.style.width = `${this.scale}px`;
        pixel.style.height = `${this.scale}px`;
        container.appendChild(pixel);
      }
    }
    
    return container;
  }
  
  /**
   * Draw grid on canvas
   */
  drawGridOnCanvas(ctx, grid, displaySize) {
    const pixelSize = displaySize / 10;
    const offsetX = pixelSize / 2;
    const offsetY = pixelSize;
    
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      
      for (let x = 0; x < row.length; x++) {
        const char = row.charAt(x);
        
        if (char && char !== ' ') {
          ctx.fillStyle = char;
          ctx.fillRect(
            offsetX + x * pixelSize,
            offsetY + y * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }
  
  /**
   * Get avatar as data URL (for saving/exporting)
   */
  getDataURL() {
    const canvas = this.renderAsCanvas();
    return canvas.toDataURL('image/png');
  }
  
  /**
   * Update expression
   */
  setExpression(expression) {
    if (AVATAR_OPTIONS.expressions[expression]) {
      this.customization.expression = expression;
      return true;
    }
    return false;
  }
  
  /**
   * Get current customization
   */
  getCustomization() {
    return { ...this.customization };
  }
  
  /**
   * Set complete customization
   */
  setCustomization(customization) {
    this.customization = { ...this.customization, ...customization };
  }

  updateFromConfig(config = {}) {
    this.setCustomization({
      ...config,
      outfit: config.hoodie || config.outfit || this.customization.outfit,
    });
    if (config.direction) this.setDirection(config.direction);
    if (config.animation) this.setAnimation(config.animation);
  }

  getConfig() {
    return { ...this.customization, hoodie: this.customization.outfit };
  }

  render(ctx, width, height) {
    const avatarCanvas = this.renderAsCanvas();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(avatarCanvas, 0, 0, width, height);
  }
}

// ============================================
// AVATAR UTILITY FUNCTIONS
// ============================================

/**
 * Create a new pixel avatar with default settings
 */
function createPixelAvatar(customization) {
  return new PixelAvatar(customization);
}

/**
 * Create avatar from saved customization
 */
function createPixelAvatarFromSave(savedData) {
  const avatar = new PixelAvatar();
  avatar.setCustomization(savedData);
  return avatar;
}

/**
 * Get all available customization options
 */
function getAvatarOptions() {
  return AVATAR_OPTIONS;
}

/**
 * Generate random avatar
 */
function generateRandomAvatar() {
  const avatar = new PixelAvatar();
  const options = AVATAR_OPTIONS;
  
  const randomOption = (obj) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
  };
  
  avatar.setOption('hair', randomOption(options.hair));
  avatar.setOption('hairColor', randomOption(options.hairColors));
  avatar.setOption('skin', randomOption(options.skinTones));
  avatar.setOption('eyes', randomOption(options.eyes));
  avatar.setOption('eyeColor', randomOption(options.eyeColors));
  avatar.setOption('outfit', randomOption(options.outfitColors));
  avatar.setOption('pants', randomOption(options.pantsColors));
  avatar.setOption('shoes', randomOption(options.shoeColors));
  avatar.setOption('accessory', randomOption(options.accessories));
  avatar.setOption('expression', randomOption(options.expressions));
  
  return avatar;
}

export {
  PixelAvatar,
  createPixelAvatar,
  createPixelAvatarFromSave,
  getAvatarOptions,
  generateRandomAvatar,
  AVATAR_OPTIONS,
  AVATAR_SIZE,
  AVATAR_SCALE,
};
