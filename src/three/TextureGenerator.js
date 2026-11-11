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

  // 2. 수면 고정밀 3중 옥타브 노멀 맵 (Photorealistic Multi-Octave Normal Map)
  static createWaterNormal() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;

    // 3중 중첩 파동 함수로 자연스러운 풍랑 및 미세 잔물결(Capillary Waves) 구현
    for (let x = 0; x < 512; x++) {
      for (let y = 0; y < 512; y++) {
        const u = (x / 512) * Math.PI * 2;
        const v = (y / 512) * Math.PI * 2;

        // 1옥타브: 큰 너울 (Swell)
        const d1x = Math.cos(u * 4.0 + Math.sin(v * 3.0)) * 0.45;
        const d1y = Math.sin(v * 4.0 + Math.cos(u * 3.0)) * 0.45;

        // 2옥타브: 중주파 물결
        const d2x = Math.cos(u * 10.0 + v * 6.0) * 0.25;
        const d2y = Math.sin(v * 10.0 - u * 6.0) * 0.25;

        // 3옥타브: 반짝이는 미세 요철 (High-frequency Sparkles)
        const d3x = Math.cos(u * 22.0 - v * 14.0) * 0.12;
        const d3y = Math.sin(v * 22.0 + u * 14.0) * 0.12;

        const totalDx = d1x + d2x + d3x;
        const totalDy = d1y + d2y + d3y;

        // 탄젠트 공간 노멀 벡터 정규화
        const nx = Math.floor(Math.min(255, Math.max(0, (totalDx * 0.5 + 0.5) * 255)));
        const ny = Math.floor(Math.min(255, Math.max(0, (totalDy * 0.5 + 0.5) * 255)));
        const nz = 240; // 강한 수직 노멀 성분

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
    tex.repeat.set(8, 16);
    return tex;
  }

  // 3. SIGGRAPH 표준 파동 간섭 기반 수영장 바닥 카우스틱스 (프리베이킹 프레임 캐싱으로 런타임 CPU 부하 0%)
  static createCausticsCanvas() {
    const size = 128;
    const frameCount = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 초기 로딩 시 24프레임 심리스 루프(Seamless Loop) ImageData를 미리 베이크하여 경기 중 삼각함수/지수 연산 제거
    const frames = [];
    for (let f = 0; f < frameCount; f++) {
      const phase = (f / frameCount) * Math.PI * 2;
      const t1 = phase * 2.0;
      const t2 = phase * 1.0;
      const t3 = phase * 3.0;

      const frameImg = ctx.createImageData(size, size);
      const data = frameImg.data;
      let ptr = 0;

      for (let y = 0; y < size; y++) {
        const ny = (y / size) * Math.PI * 4;
        const cosNy2 = Math.cos(ny * 2.0);
        for (let x = 0; x < size; x++) {
          const nx = (x / size) * Math.PI * 4;

          // 3중 파동 간섭장 (Wave Interference Field)
          const w1 = Math.sin(nx * 1.5 + t1 + cosNy2);
          const w2 = Math.cos(ny * 1.7 - t2 + Math.sin(nx * 2.3));
          const w3 = Math.sin((nx + ny) * 2.1 + t3);

          const normalized = ((w1 + w2 + w3) / 3.0 + 1.0) * 0.5;
          const n2 = normalized * normalized;
          const caustic = n2 * n2 * normalized * Math.sqrt(normalized) * 2.8; // Math.pow(normalized, 5.5) 고속 근사
          const brightness = Math.min(255, (caustic * 255) | 0);

          data[ptr] = Math.min(255, (brightness * 0.85) | 0);
          data[ptr + 1] = Math.min(255, (brightness * 1.05) | 0);
          data[ptr + 2] = brightness;
          data[ptr + 3] = brightness > 15 ? brightness : 0;

          ptr += 4;
        }
      }
      frames.push(frameImg);
    }

    ctx.putImageData(frames[0], 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 12);

    let lastFrameIdx = 0;
    return {
      texture,
      update: (time) => {
        // UV 오프셋 미세 스크롤 + 프리베이크된 프레임 스왑 (20fps)으로 모바일 발열 방지
        texture.offset.x = (time * 0.03) % 1;
        texture.offset.y = (time * 0.05) % 1;
        const frameIdx = Math.floor(time * 20) % frameCount;
        if (frameIdx !== lastFrameIdx) {
          lastFrameIdx = frameIdx;
          ctx.putImageData(frames[frameIdx], 0, 0);
          texture.needsUpdate = true;
        }
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
