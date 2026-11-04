import * as THREE from 'three';

/**
 * 고품질 올림픽 수영장 절차적 텍스처 생성기 (Procedural Texture Generator)
 * - 세라믹 아쿠아 타일 (줄눈, 광택, 미세 요철)
 * - 수영장 바닥 햇빛 카우스틱스 (Caustics 애니메이션 캔버스)
 * - 수면 잔물결 노멀맵 (Water Normal Map)
 * - 경기장 데크 타일 및 스타트 블록 텍스처
 */

export class TextureGenerator {
  // 1. 올림픽 공식 세라믹 타일 텍스처 (1024x1024)
  static createPoolTiles() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 맑고 시원한 코발트 아쿠아 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#075985');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const tileSize = 64;
    const grout = 3;

    for (let x = 0; x < 1024; x += tileSize) {
      for (let y = 0; y < 1024; y += tileSize) {
        // 타일마다 미세한 색상 편차로 자연스러운 세라믹 질감
        const noise = (Math.random() - 0.5) * 12;
        const r = Math.min(255, Math.max(0, 2 + noise));
        const g = Math.min(255, Math.max(0, 132 + noise));
        const b = Math.min(255, Math.max(0, 199 + noise));

        ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
        ctx.fillRect(x + grout, y + grout, tileSize - grout * 2, tileSize - grout * 2);

        // 타일 모서리 하이라이트 (3D 광택감)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(x + grout, y + grout, tileSize - grout * 2, 2);
        ctx.fillRect(x + grout, y + grout, 2, tileSize - grout * 2);

        // 타일 하단 음영
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x + grout, y + tileSize - grout - 2, tileSize - grout * 2, 2);
        ctx.fillRect(x + tileSize - grout - 2, y + grout, 2, tileSize - grout * 2);
      }
    }

    // 어두운 줄눈 (Grout)
    ctx.strokeStyle = '#082f49';
    ctx.lineWidth = grout;
    for (let x = 0; x <= 1024; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 32);
    return tex;
  }

  // 2. 수면 노멀 맵 (Normal Map - 수면의 굴절과 반사광 입체화)
  static createWaterNormal() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;

    // 합성 사인파로 매끄러운 수면 노멀맵 생성
    for (let x = 0; x < 512; x++) {
      for (let y = 0; y < 512; y++) {
        const u = (x / 512) * Math.PI * 8;
        const v = (y / 512) * Math.PI * 8;

        const dx = Math.cos(u * 1.5 + Math.sin(v)) * 0.4 + Math.cos(u * 3.0) * 0.2;
        const dy = Math.sin(v * 1.5 + Math.cos(u)) * 0.4 + Math.sin(v * 3.0) * 0.2;

        // 노멀 벡터 (dx, dy, 1.0)를 RGB로 변환 (R: X, G: Y, B: Z)
        const nx = Math.floor((dx * 0.5 + 0.5) * 255);
        const ny = Math.floor((dy * 0.5 + 0.5) * 255);
        const nz = 230; // 푸른빛 노멀 축

        const idx = (y * 512 + x) * 4;
        data[idx] = nx;
        data[idx + 1] = ny;
        data[idx + 2] = nz;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 12);
    return tex;
  }

  // 3. 햇빛 카우스틱스 텍스처 (Caustics - 바닥에 일렁이는 영롱한 빛망울)
  static createCausticsCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    function drawCaustics(time) {
      ctx.clearRect(0, 0, 512, 512);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.filter = 'blur(6px)';

      // 보로노이/물결 망 형태의 광선 그물망
      for (let i = 0; i < 28; i++) {
        const cx = 256 + Math.sin(time * 0.8 + i * 0.7) * 200;
        const cy = 256 + Math.cos(time * 0.9 + i * 0.5) * 200;
        const r = 40 + Math.sin(time * 1.5 + i) * 20;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'none';
    }

    drawCaustics(0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 10);

    return {
      texture,
      update: (time) => {
        drawCaustics(time);
        texture.needsUpdate = true;
      }
    };
  }

  // 4. 데크 세라믹 타일 (Deck Tiles)
  static createDeckTiles() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#e2e8f0'; // 연회색 데크
    ctx.fillRect(0, 0, 512, 512);

    const size = 32;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;

    for (let x = 0; x < 512; x += size) {
      for (let y = 0; y < 512; y += size) {
        ctx.strokeRect(x, y, size, size);
        // 논슬립 요철 점
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + size - 7, y + size - 7, 3, 3);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 24);
    return tex;
  }
}
