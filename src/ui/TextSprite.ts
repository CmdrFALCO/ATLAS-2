import * as THREE from 'three';

export interface TextSpriteOptions {
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  paddingX?: number;
  paddingY?: number;
  scale?: number;
  width?: number;
  height?: number;
}

export class TextSprite {
  readonly sprite: THREE.Sprite;
  private texture: THREE.CanvasTexture;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private material: THREE.SpriteMaterial;
  private width = 0;
  private height = 0;
  private options: Required<TextSpriteOptions>;

  constructor(text: string, options: TextSpriteOptions = {}) {
    this.options = {
      fontSize: options.fontSize ?? 28,
      fontWeight: options.fontWeight ?? 600,
      color: options.color ?? '#f8fafc',
      background: options.background ?? 'rgba(15, 23, 42, 0.55)',
      borderColor: options.borderColor ?? 'rgba(148, 163, 184, 0.7)',
      borderWidth: options.borderWidth ?? 2,
      paddingX: options.paddingX ?? 18,
      paddingY: options.paddingY ?? 12,
      scale: options.scale ?? 0.0021
    };
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.context = context;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    this.material.toneMapped = false;
    this.sprite = new THREE.Sprite(this.material);
    this.update(text);
  }

  update(text: string): void {
    const {
      fontSize,
      fontWeight,
      color,
      background,
      borderColor,
      borderWidth,
      paddingX,
      paddingY,
      scale,
      width: fixedWidth,
      height: fixedHeight
    } = this.options;
    const context = this.context;
    context.font = `${fontWeight} ${fontSize}px Segoe UI`;
    const lines = text.split('\n');
    const lineHeight = Math.ceil(fontSize * 1.25);
    const maxLineWidth = lines.reduce((max, line) => {
      const metrics = context.measureText(line);
      return Math.max(max, metrics.width);
    }, 0);
    const width = fixedWidth ?? Math.ceil(maxLineWidth + paddingX * 2);
    const height = fixedHeight ?? Math.ceil(lineHeight * lines.length + paddingY * 2);
    const resized = width !== this.width || height !== this.height;
    if (resized) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.width = width;
      this.height = height;
    }

    context.font = `${fontWeight} ${fontSize}px Segoe UI`;
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    if (borderWidth > 0) {
      context.strokeStyle = borderColor;
      context.lineWidth = borderWidth;
      context.strokeRect(
        borderWidth / 2,
        borderWidth / 2,
        width - borderWidth,
        height - borderWidth
      );
    }
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    lines.forEach((line, index) => {
      const y = paddingY + lineHeight * index + lineHeight / 2;
      context.fillText(line, width / 2, y + 1);
    });

    if (resized) {
      const oldTexture = this.texture;
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.material.map = this.texture;
      this.material.needsUpdate = true;
      oldTexture.dispose();
    } else {
      this.texture.needsUpdate = true;
    }
    this.sprite.scale.set(width * scale, height * scale, 1);
  }

  setVisible(visible: boolean): void {
    this.sprite.visible = visible;
  }

  dispose(): void {
    this.texture.dispose();
    this.material.dispose();
    this.sprite.removeFromParent();
  }
}
