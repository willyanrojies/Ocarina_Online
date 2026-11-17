import * as THREE from 'three';
import type { OcarinaStickerId } from './ocarinaCustomization';

function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawRupeeShape(
  ctx: CanvasRenderingContext2D,
  light: string,
  mid: string,
  dark: string,
): void {
  const pts: [number, number][] = [
    [128, 30],
    [186, 78],
    [186, 178],
    [128, 226],
    [70, 178],
    [70, 78],
  ];
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = mid;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1b0d00';
  ctx.stroke();

  // Faceta superior clara
  ctx.beginPath();
  ctx.moveTo(128, 38);
  ctx.lineTo(178, 82);
  ctx.lineTo(152, 102);
  ctx.lineTo(128, 84);
  ctx.lineTo(104, 102);
  ctx.lineTo(78, 82);
  ctx.closePath();
  ctx.fillStyle = light;
  ctx.fill();

  // Faceta inferior escura
  ctx.beginPath();
  ctx.moveTo(128, 218);
  ctx.lineTo(178, 174);
  ctx.lineTo(152, 154);
  ctx.lineTo(128, 172);
  ctx.lineTo(104, 154);
  ctx.lineTo(78, 174);
  ctx.closePath();
  ctx.fillStyle = dark;
  ctx.fill();

  // Face interna da gema
  ctx.beginPath();
  ctx.moveTo(128, 84);
  ctx.lineTo(152, 102);
  ctx.lineTo(152, 154);
  ctx.lineTo(128, 172);
  ctx.lineTo(104, 154);
  ctx.lineTo(104, 102);
  ctx.closePath();
  ctx.fillStyle = light;
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function createOcarinaStickerTexture(stickerId: OcarinaStickerId): THREE.CanvasTexture | null {
  if (stickerId === 'none') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const goldGrad = ctx.createLinearGradient(40, 30, 210, 225);
  goldGrad.addColorStop(0, '#fff7a8');
  goldGrad.addColorStop(0.45, '#ffd228');
  goldGrad.addColorStop(1, '#c97600');

  switch (stickerId) {
    case 'triforce': {
      const tris: [number, number, number, number, number, number][] = [
        [128, 42, 80, 126, 176, 126],
        [80, 126, 32, 210, 128, 210],
        [176, 126, 128, 210, 224, 210],
      ];
      for (const [x1, y1, x2, y2, x3, y3] of tris) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fillStyle = goldGrad;
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#331700';
        ctx.stroke();
      }
      break;
    }

    case 'royal-crest': {
      // Asas reais + brasão central + mini Triforce
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#2b1300';
      ctx.lineWidth = 7;
      ctx.lineJoin = 'round';

      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.translate(128, 134);
        ctx.scale(dir, 1);
        ctx.beginPath();
        ctx.moveTo(16, -4);
        ctx.quadraticCurveTo(58, -58, 108, -52);
        ctx.lineTo(84, -22);
        ctx.lineTo(98, -14);
        ctx.lineTo(68, 4);
        ctx.lineTo(78, 14);
        ctx.lineTo(44, 20);
        ctx.quadraticCurveTo(28, 12, 16, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Losango central do corpo + cauda
      ctx.beginPath();
      ctx.moveTo(128, 118);
      ctx.lineTo(148, 152);
      ctx.lineTo(128, 206);
      ctx.lineTo(108, 152);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Triforce acima das asas
      const mini: [number, number, number, number, number, number][] = [
        [128, 46, 106, 84, 150, 84],
        [106, 84, 84, 122, 128, 122],
        [150, 84, 128, 122, 172, 122],
      ];
      for (const [x1, y1, x2, y2, x3, y3] of mini) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'music-note': {
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#2b1300';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(138, 164);
      ctx.lineTo(138, 50);
      ctx.quadraticCurveTo(188, 66, 186, 108);
      ctx.quadraticCurveTo(164, 90, 148, 86);
      ctx.lineTo(148, 164);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(110, 176, 40, 29, -0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'treble-clef': {
      ctx.strokeStyle = '#2b1300';
      ctx.lineWidth = 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const drawClefPath = () => {
        ctx.beginPath();
        ctx.moveTo(136, 148);
        ctx.bezierCurveTo(168, 140, 172, 184, 134, 186);
        ctx.bezierCurveTo(96, 188, 92, 134, 126, 108);
        ctx.bezierCurveTo(160, 80, 158, 36, 134, 34);
        ctx.bezierCurveTo(116, 32, 118, 72, 126, 116);
        ctx.lineTo(134, 206);
        ctx.bezierCurveTo(134, 224, 106, 224, 104, 204);
      };

      drawClefPath();
      ctx.stroke();

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 13;
      drawClefPath();
      ctx.stroke();
      break;
    }

    case 'pixel-heart': {
      const grid = [
        '.XX..XX.',
        'XXXX.XXX',
        'XXXXXXXX',
        'XXXXXXXX',
        '.XXXXXX.',
        '..XXXX..',
        '...XX...',
      ];
      const cell = 24;
      const startX = (size - grid[0].length * cell) / 2;
      const startY = (size - grid.length * cell) / 2 + 4;
      ctx.fillStyle = '#240406';
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === 'X') {
            ctx.fillRect(startX + c * cell - 4, startY + r * cell - 4, cell + 8, cell + 8);
          }
        }
      }
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === 'X') {
            ctx.fillStyle = r < 2 && c < 3 ? '#ff6978' : r > 4 ? '#b8101c' : '#ee1c2b';
            ctx.fillRect(startX + c * cell, startY + r * cell, cell, cell);
          }
        }
      }
      break;
    }

    case 'fairy': {
      // Orbe brilhante azul da fada + 4 asas brancas translúcidas
      ctx.fillStyle = 'rgba(235, 248, 255, 0.94)';
      ctx.strokeStyle = '#1b356e';
      ctx.lineWidth = 5;
      for (const dir of [-1, 1]) {
        // Asa superior
        ctx.save();
        ctx.translate(128, 128);
        ctx.scale(dir, 1);
        ctx.beginPath();
        ctx.moveTo(16, -6);
        ctx.quadraticCurveTo(86, -82, 98, -42);
        ctx.quadraticCurveTo(78, 0, 22, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Asa inferior
        ctx.beginPath();
        ctx.moveTo(18, 10);
        ctx.quadraticCurveTo(74, 18, 72, 54);
        ctx.quadraticCurveTo(38, 52, 16, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      const orbGrad = ctx.createRadialGradient(128, 128, 8, 128, 128, 54);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.45, '#7de6ff');
      orbGrad.addColorStop(1, '#1270ff');
      ctx.beginPath();
      ctx.arc(128, 128, 38, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#082468';
      ctx.stroke();
      break;
    }

    case 'kokiri-emerald': {
      // Brasão clássico em espiral verde
      ctx.strokeStyle = '#092608';
      ctx.lineWidth = 28;
      ctx.lineCap = 'round';
      const drawSpiral = () => {
        ctx.beginPath();
        for (let t = 0; t <= 4.6 * Math.PI; t += 0.08) {
          const r = 6 + t * 5.8;
          const x = 128 + Math.cos(t - 0.7) * r;
          const y = 132 + Math.sin(t - 0.7) * r;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      };
      drawSpiral();
      ctx.stroke();

      const greenGrad = ctx.createLinearGradient(50, 50, 200, 200);
      greenGrad.addColorStop(0, '#a6ff7a');
      greenGrad.addColorStop(0.55, '#2ec93d');
      greenGrad.addColorStop(1, '#126e1d');
      ctx.strokeStyle = greenGrad;
      ctx.lineWidth = 17;
      drawSpiral();
      ctx.stroke();
      break;
    }

    case 'red-rupee':
      drawRupeeShape(ctx, '#ff7d87', '#e01b2c', '#820714');
      break;

    case 'blue-rupee':
      drawRupeeShape(ctx, '#87e5ff', '#167dff', '#083696');
      break;

    case 'green-rupee':
      drawRupeeShape(ctx, '#9aff8a', '#19c235', '#0a6318');
      break;

    case 'gold-star': {
      drawStarPolygon(ctx, 128, 130, 5, 90, 40);
      ctx.fillStyle = goldGrad;
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2b1300';
      ctx.stroke();
      break;
    }

    case 'moon-crescent': {
      ctx.beginPath();
      ctx.arc(134, 128, 76, 0.35 * Math.PI, 1.65 * Math.PI, false);
      ctx.arc(166, 128, 60, 1.5 * Math.PI, 0.5 * Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = goldGrad;
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#2b1300';
      ctx.stroke();
      break;
    }

    case 'sun-emblem': {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.save();
        ctx.translate(128 + Math.cos(a) * 74, 128 + Math.sin(a) * 74);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-10, -14);
        ctx.lineTo(-10, 14);
        ctx.closePath();
        ctx.fillStyle = goldGrad;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#2b1300';
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(128, 128, 44, 0, Math.PI * 2);
      ctx.fillStyle = goldGrad;
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#2b1300';
      ctx.stroke();
      break;
    }

    case 'double-note': {
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#2b1300';
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(96, 170);
      ctx.lineTo(96, 62);
      ctx.lineTo(186, 44);
      ctx.lineTo(186, 152);
      ctx.lineTo(170, 152);
      ctx.lineTo(170, 74);
      ctx.lineTo(112, 86);
      ctx.lineTo(112, 170);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(80, 178, 30, 22, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(162, 160, 30, 22, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'korok-leaf': {
      ctx.beginPath();
      ctx.moveTo(56, 198);
      ctx.quadraticCurveTo(56, 86, 196, 52);
      ctx.quadraticCurveTo(180, 176, 56, 198);
      ctx.closePath();
      const leafGrad = ctx.createLinearGradient(56, 52, 196, 198);
      leafGrad.addColorStop(0, '#c0ff45');
      leafGrad.addColorStop(0.55, '#59bf14');
      leafGrad.addColorStop(1, '#266b05');
      ctx.fillStyle = leafGrad;
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#122e03';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(64, 190);
      ctx.quadraticCurveTo(126, 130, 184, 66);
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#245905';
      ctx.stroke();
      break;
    }

    case 'ocarina-crest': {
      ctx.fillStyle = goldGrad;
      ctx.strokeStyle = '#2b1300';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(50, 170);
      ctx.bezierCurveTo(44, 120, 95, 76, 154, 72);
      ctx.lineTo(146, 46);
      ctx.lineTo(176, 42);
      ctx.lineTo(186, 72);
      ctx.bezierCurveTo(214, 78, 222, 118, 196, 154);
      ctx.bezierCurveTo(166, 194, 88, 206, 50, 170);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2b1300';
      for (const [hx, hy] of [
        [104, 146],
        [130, 126],
        [158, 112],
        [184, 108],
      ]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'diamond-ice': {
      ctx.beginPath();
      ctx.moveTo(128, 32);
      ctx.lineTo(206, 128);
      ctx.lineTo(128, 224);
      ctx.lineTo(50, 128);
      ctx.closePath();
      const iceGrad = ctx.createLinearGradient(50, 32, 206, 224);
      iceGrad.addColorStop(0, '#e8ffff');
      iceGrad.addColorStop(0.5, '#3ee4ff');
      iceGrad.addColorStop(1, '#0d70d4');
      ctx.fillStyle = iceGrad;
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#06265c';
      ctx.stroke();
      break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
