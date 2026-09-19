import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
for (const [name, size] of [['sample.mp4', '1280x720'], ['portrait.mp4', '360x640']]) {
  const file = path.join(import.meta.dirname, name);
  if (existsSync(file)) continue;
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=24`, '-t', '8', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '35', '-pix_fmt', 'yuv420p', '-y', file], { stdio: 'inherit' });
  if (result.status !== 0) { console.error('Local preview requires ffmpeg on PATH.'); process.exit(1); }
}
