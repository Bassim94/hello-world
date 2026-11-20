import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Line, OrbitControls, RoundedBox } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { byId, ROPE_COLORS, woodDisplayColor } from '../domain/materials';
import type { Part, ProductConfig, RoomDims, Vec3 } from '../domain/types';

const S = 0.01; // cm -> m
const m = (v: Vec3): Vec3 => [v[0] * S, v[1] * S, v[2] * S];

/* ---------- canvas snapshot (used for saved previews / quotation) ---------- */
let canvasEl: HTMLCanvasElement | null = null;
export function takeSnapshot(maxWidth = 900): string | undefined {
  if (!canvasEl || canvasEl.width === 0) return undefined;
  try {
    const scale = Math.min(1, maxWidth / canvasEl.width);
    const out = document.createElement('canvas');
    out.width = Math.round(canvasEl.width * scale);
    out.height = Math.round(canvasEl.height * scale);
    out.getContext('2d')!.drawImage(canvasEl, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', 0.82);
  } catch (err) {
    console.error('Wonder: snapshot failed', err);
    return undefined;
  }
}

export type ViewPreset = 'iso' | 'front' | 'side' | 'top';

/* ------------------------------ part rendering ------------------------------ */
const AXIS_ROT: Record<'x' | 'y' | 'z', Vec3> = {
  x: [0, 0, Math.PI / 2],
  y: [0, 0, 0],
  z: [Math.PI / 2, 0, 0],
};

function PartMesh({ part, color }: { part: Part; color: string }) {
  const pos = m(part.position);
  if (part.shape === 'box') {
    const size = m(part.size);
    const radius = Math.min(0.012, Math.min(...size) / 3); // rounded edges
    return (
      <RoundedBox args={size} radius={radius} smoothness={3} position={pos} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.72} metalness={0} />
      </RoundedBox>
    );
  }
  const metal = part.materialClass === 'metal';
  return (
    <mesh position={pos} rotation={AXIS_ROT[part.axis ?? 'y']} castShadow receiveShadow>
      <cylinderGeometry args={[(part.size[0] * S) / 2, (part.size[0] * S) / 2, part.size[1] * S, 20]} />
      <meshStandardMaterial
        color={color}
        roughness={metal ? 0.35 : part.materialClass === 'rope' ? 0.95 : 0.6}
        metalness={metal ? 0.8 : 0}
      />
    </mesh>
  );
}

/* --------------------------- dimension indicators --------------------------- */
/** Text pill drawn into the scene itself, so it also appears in snapshots. */
function DimLabel({ position, text }: { position: Vec3; text: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 288;
    c.height = 88;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2f5d50';
    g.beginPath();
    g.roundRect(2, 2, c.width - 4, c.height - 4, 42);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = '600 44px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 3);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[0.62, 0.19, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
}

function DimLine({ from, to, label }: { from: Vec3; to: Vec3; label: string }) {
  const a = m(from);
  const b = m(to);
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <group>
      <Line points={[a, b]} color="#2f5d50" lineWidth={1.5} />
      {[a, b].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshBasicMaterial color="#2f5d50" />
        </mesh>
      ))}
      <DimLabel position={mid} text={label} />
    </group>
  );
}

function Dimensions({ W, D, H }: { W: number; D: number; H: number }) {
  const off = 28;
  return (
    <group>
      <DimLine from={[-W / 2, 1, D / 2 + off]} to={[W / 2, 1, D / 2 + off]} label={`${W} cm`} />
      <DimLine from={[W / 2 + off, 1, -D / 2]} to={[W / 2 + off, 1, D / 2]} label={`${D} cm`} />
      <DimLine from={[-W / 2 - off, 0, D / 2]} to={[-W / 2 - off, H, D / 2]} label={`${H} cm`} />
    </group>
  );
}

/* ------------------------------- room outline ------------------------------- */
function RoomOutline({ room }: { room: { width: number; depth: number; height: number } }) {
  const w = (room.width * S) / 2;
  const d = (room.depth * S) / 2;
  const h = room.height * S;
  const floor: Vec3[] = [[-w, 0.004, -d], [w, 0.004, -d], [w, 0.004, d], [-w, 0.004, d], [-w, 0.004, -d]];
  const ceil = floor.map(([x, , z]) => [x, h, z] as Vec3);
  return (
    <group>
      <Line points={floor} color="#c96f45" lineWidth={2} />
      <Line points={ceil} color="#c96f45" lineWidth={1} dashed dashSize={0.12} gapSize={0.08} />
      {floor.slice(0, 4).map((p, i) => (
        <Line key={i} points={[p, [p[0], h, p[2]]]} color="#c96f45" lineWidth={1} dashed dashSize={0.12} gapSize={0.08} />
      ))}
      {/* back wall, faint */}
      <mesh position={[0, h / 2, -d]}>
        <planeGeometry args={[w * 2, h]} />
        <meshBasicMaterial color="#c96f45" transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------ camera presets ------------------------------ */
function CameraRig({
  preset,
  presetTick,
  size,
  controls,
}: {
  preset: ViewPreset;
  presetTick: number;
  size: Vec3;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);
  useEffect(() => {
    const [W, D, H] = m(size);
    // distance that keeps the model in frame; pull back on narrow viewports
    const dist = Math.max(W, H * 1.4, D) * 1.7 * Math.max(1, 1.5 / aspect) + 1.2;
    const cy = H / 2;
    const dirs: Record<ViewPreset, Vec3> = {
      iso: [0.62, 0.38, 0.72],
      front: [0, 0.08, 1],
      side: [1, 0.08, 0],
      top: [0, 1, 0.001],
    };
    const [dx, dy, dz] = dirs[preset];
    const len = Math.hypot(dx, dy, dz);
    camera.position.set((dx / len) * dist, cy + (dy / len) * dist, (dz / len) * dist);
    controls.current?.target.set(0, cy, 0);
    controls.current?.update();
    // only re-run when a preset button is pressed, not on every dimension change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, presetTick]);
  return null;
}

/* ---------------------------------- viewer ---------------------------------- */
export interface ViewerProps {
  parts: Part[];
  config: ProductConfig;
  room?: RoomDims | null;
  hidden?: Record<string, boolean>;
  showDims?: boolean;
  showGrid?: boolean;
  showRoom?: boolean;
  preset?: ViewPreset;
  presetTick?: number;
}

export default function Viewer3D({
  parts,
  config,
  room,
  hidden = {},
  showDims = true,
  showGrid = true,
  showRoom = true,
  preset = 'iso',
  presetTick = 0,
}: ViewerProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { width: W, depth: D, height: H } = config.dims;

  const colors = useMemo(() => {
    const wood = woodDisplayColor(config.woodId, config.finishId);
    return {
      wood,
      dowel: woodDisplayColor('beech', config.finishId),
      rope: byId(ROPE_COLORS, config.ropeColorId).color,
      metal: '#6f7478',
    };
  }, [config.woodId, config.finishId, config.ropeColorId]);

  const visible = parts.filter((p) => !hidden[p.group]);
  const hasRoom = !!room && room.width != null && room.depth != null && room.height != null;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4, 2.6, 4.6], fov: 38, near: 0.1, far: 80 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        canvasEl = gl.domElement;
      }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#f4efe6']} />
      <hemisphereLight args={['#ffffff', '#d8cdb8', 1.1]} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} />

      <group>
        {visible.map((p) => (
          <PartMesh key={p.id} part={p} color={colors[p.materialClass]} />
        ))}
      </group>

      {/* floor reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#efe8db" roughness={1} />
      </mesh>
      {showGrid && (
        <Grid
          position={[0, 0.002, 0]}
          args={[20, 20]}
          cellSize={0.1}
          cellThickness={0.6}
          cellColor="#d9cfbd"
          sectionSize={1}
          sectionThickness={1.1}
          sectionColor="#b9ab92"
          fadeDistance={16}
          fadeStrength={1.5}
          infiniteGrid
        />
      )}

      {showDims && <Dimensions W={W} D={D} H={H} />}
      {showRoom && hasRoom && (
        <RoomOutline room={{ width: room!.width!, depth: room!.depth!, height: room!.height! }} />
      )}

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        target={[0, (H * S) / 2, 0]}
        minDistance={1}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2 - 0.03}
      />
      <CameraRig preset={preset} presetTick={presetTick} size={[W, D, H]} controls={controls} />
    </Canvas>
  );
}
