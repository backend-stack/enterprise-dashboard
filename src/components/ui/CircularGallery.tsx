"use client";

import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform,
  type OGLRenderingContext,
} from "ogl";
import { useEffect, useRef } from "react";

/* Curved, draggable WebGL logo carousel (OGL) - the reference
   CircularGallery adapted for brand logos: each logo is drawn centered on a
   padded tile canvas (instead of cover-cropping a photo), so marks keep
   their aspect and breathing room. Scroll, drag and touch all spin it. */

export interface GalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: GalleryItem[];
  /** Curvature - higher bends more. */
  bend?: number;
  /** Tile corner radius as a fraction (0-0.5). */
  borderRadius?: number;
  /** Tile background color behind each logo. */
  tileBg?: string;
  scrollSpeed?: number;
  scrollEase?: number;
}

/* ------------------------------------------------------------------ utils */

function debounce<T extends (...args: never[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t;
}

function createTextTexture(
  gl: OGLRenderingContext,
  text: string,
  font: string,
  color: string
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

/* Draw a logo centered on a padded tile so it never crops or stretches. */
function createLogoTile(img: HTMLImageElement, bg: string): HTMLCanvasElement {
  const W = 800;
  const H = 600;
  const tile = document.createElement("canvas");
  tile.width = W;
  tile.height = H;
  const ctx = tile.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const maxW = W * 0.5;
  const maxH = H * 0.42;
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  return tile;
}

/* ------------------------------------------------------------- OGL pieces */

interface Sizes {
  width: number;
  height: number;
}

class Title {
  constructor({
    gl,
    plane,
    text,
    textColor,
    font,
  }: {
    gl: OGLRenderingContext;
    plane: Mesh;
    text: string;
    textColor: string;
    font: string;
  }) {
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    const mesh = new Mesh(gl, { geometry, program });
    const aspect = width / height;
    const textHeight = plane.scale.y * 0.13;
    const textWidth = textHeight * aspect;
    mesh.scale.set(textWidth, textHeight, 1);
    mesh.position.y = -plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    mesh.setParent(plane);
  }
}

class Media {
  gl: OGLRenderingContext;
  geometry: Plane;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: Sizes;
  text: string;
  viewport: Sizes;
  bend: number;
  textColor: string;
  borderRadius: number;
  tileBg: string;
  font: string;
  program!: Program;
  plane!: Mesh;
  extra = 0;
  widthTotal = 0;
  width = 0;
  x = 0;
  scale = 1;
  padding = 2;
  speed = 0;
  isBefore = false;
  isAfter = false;

  constructor(opts: {
    geometry: Plane;
    gl: OGLRenderingContext;
    image: string;
    index: number;
    length: number;
    scene: Transform;
    screen: Sizes;
    text: string;
    viewport: Sizes;
    bend: number;
    textColor: string;
    borderRadius: number;
    tileBg: string;
    font: string;
  }) {
    this.geometry = opts.geometry;
    this.gl = opts.gl;
    this.image = opts.image;
    this.index = opts.index;
    this.length = opts.length;
    this.scene = opts.scene;
    this.screen = opts.screen;
    this.text = opts.text;
    this.viewport = opts.viewport;
    this.bend = opts.bend;
    this.textColor = opts.textColor;
    this.borderRadius = opts.borderRadius;
    this.tileBg = opts.tileBg;
    this.font = opts.font;
    this.createShader();
    this.createMesh();
    // Logos speak for themselves - no caption mesh under the tiles.
    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);

          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);

          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    img.onload = () => {
      // Logos get a padded tile rather than a cover-crop.
      const tile = createLogoTile(img, this.tileBg);
      texture.image = tile;
      this.program.uniforms.uImageSizes.value = [tile.width, tile.height];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });
    this.plane.setParent(this.scene);
  }

  update(scroll: { current: number; last: number }, direction: "left" | "right") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    (this.program.uniforms.uTime as { value: number }).value += 0.04;
    (this.program.uniforms.uSpeed as { value: number }).value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;

    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: Sizes; viewport?: Sizes } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1500;
    this.plane.scale.y =
      (this.viewport.height * (800 * this.scale)) / this.screen.height;
    this.plane.scale.x =
      (this.viewport.width * (620 * this.scale)) / this.screen.width;
    this.program.uniforms.uPlaneSizes.value = [
      this.plane.scale.x,
      this.plane.scale.y,
    ];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  container: HTMLElement;
  scrollSpeed: number;
  scroll: {
    ease: number;
    current: number;
    target: number;
    last: number;
    position: number;
  };
  onCheckDebounce: () => void;
  renderer!: Renderer;
  gl!: OGLRenderingContext;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  isDown = false;
  start = 0;
  screen!: Sizes;
  viewport!: Sizes;
  raf = 0;

  constructor(
    container: HTMLElement,
    opts: {
      items: GalleryItem[];
      bend: number;
      textColor: string;
      borderRadius: number;
      tileBg: string;
      font: string;
      scrollSpeed: number;
      scrollEase: number;
    }
  ) {
    this.container = container;
    this.scrollSpeed = opts.scrollSpeed;
    this.scroll = {
      ease: opts.scrollEase,
      current: 0,
      target: 0,
      last: 0,
      position: 0,
    };
    this.onCheckDebounce = debounce(() => this.onCheck(), 200);

    this.onResize = this.onResize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onTouchDown = this.onTouchDown.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchUp = this.onTouchUp.bind(this);
    this.update = this.update.bind(this);

    this.createRenderer();
    this.createCamera();
    this.scene = new Transform();
    this.onResize();
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100,
    });
    this.createMedias(opts);
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas as HTMLCanvasElement);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createMedias(opts: {
    items: GalleryItem[];
    bend: number;
    textColor: string;
    borderRadius: number;
    tileBg: string;
    font: string;
  }) {
    // Duplicate the list for a seamless loop.
    const doubled = [...opts.items, ...opts.items];
    this.medias = doubled.map(
      (data, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: data.image,
          index,
          length: doubled.length,
          scene: this.scene,
          screen: this.screen,
          text: data.text,
          viewport: this.viewport,
          bend: opts.bend,
          textColor: opts.textColor,
          borderRadius: opts.borderRadius,
          tileBg: opts.tileBg,
          font: opts.font,
        })
    );
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = "touches" in e ? e.touches[0].clientX : e.clientX;
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const distance = (this.start - x) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
  }

  onTouchUp() {
    this.isDown = false;
    this.onCheck();
  }

  onWheel(e: WheelEvent) {
    const delta = e.deltaY;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }

  onCheck() {
    if (!this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    this.medias.forEach((media) =>
      media.onResize({ screen: this.screen, viewport: this.viewport })
    );
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((media) => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update);
  }

  addEventListeners() {
    window.addEventListener("resize", this.onResize);
    window.addEventListener("wheel", this.onWheel, { passive: true });
    this.container.addEventListener("mousedown", this.onTouchDown);
    window.addEventListener("mousemove", this.onTouchMove);
    window.addEventListener("mouseup", this.onTouchUp);
    this.container.addEventListener("touchstart", this.onTouchDown, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: true });
    window.addEventListener("touchend", this.onTouchUp);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("wheel", this.onWheel);
    this.container.removeEventListener("mousedown", this.onTouchDown);
    window.removeEventListener("mousemove", this.onTouchMove);
    window.removeEventListener("mouseup", this.onTouchUp);
    this.container.removeEventListener("touchstart", this.onTouchDown);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchUp);
    const canvas = this.renderer?.gl?.canvas as HTMLCanvasElement | undefined;
    canvas?.parentNode?.removeChild(canvas);
  }
}

/* -------------------------------------------------------- React component */

export function CircularGallery({
  items = [],
  bend = 3,
  borderRadius = 0.05,
  tileBg = "#ffffff",
  scrollSpeed = 2,
  scrollEase = 0.05,
  className = "",
  ...props
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !items.length) return;

    const computedStyle = getComputedStyle(containerRef.current);
    const font = `${computedStyle.fontWeight || "bold"} ${computedStyle.fontSize || "30px"} ${computedStyle.fontFamily}`;

    const app = new App(containerRef.current, {
      items,
      bend,
      textColor: computedStyle.color || "#ffffff",
      borderRadius,
      tileBg,
      font,
      scrollSpeed,
      scrollEase,
    });

    return () => app.destroy();
  }, [items, bend, borderRadius, tileBg, scrollSpeed, scrollEase]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full cursor-grab overflow-hidden text-[30px] font-bold active:cursor-grabbing ${className}`}
      {...props}
    />
  );
}
