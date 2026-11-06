import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

/**
 * 리얼 올림픽 50m 10레인 수영장 3D 아레나 환경 (Realistic Olympic Aquatics Arena)
 * - 50m * 25m 올림픽 규격 10개 레인 (가운데 1~8번 레인 사용, 0/9번 완충)
 * - 고해상도 세라믹 아쿠아 타일 & 바닥 T자 올림픽 가이드라인
 * - 바닥 실시간 햇빛 카우스틱스 (Caustics) 일렁임
 * - 투명 수중 틴트와 2중 스크롤 노멀맵 수면 셰이딩
 * - 파도 감쇄 도넛 디스크형 올림픽 레인 부표 로프 (Wave-damping Discs)
 * - 오메가 스타일 킥플레이트 스타트 블록 & 전자 감응 터치패드
 * - 상공 강철 트러스 지붕 프레임 & 방송용 투광등 조명 클러스터
 */

export class PoolEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.poolLength = 50.0;
    this.laneWidth = 2.5;
    this.laneCount = 10;
    this.poolWidth = this.laneWidth * this.laneCount; // 25.0m
    this.poolDepth = 2.6;

    this.waterMesh = null;
    this.causticsObj = null;
    this.waterNormalTex = null;
    this.scoreboardCanvas = null;
    this.scoreboardTexture = null;
    this.touchPads = [];
    this.laneCenters = [];

    // 0~9번 레인의 X 중심 좌표 계산
    for (let i = 0; i < this.laneCount; i++) {
      const x = -this.poolWidth / 2 + (i + 0.5) * this.laneWidth;
      this.laneCenters.push(x);
    }

    this.buildRealisticPool();
  }

  getLaneX(laneNumber) {
    return this.laneCenters[laneNumber];
  }

  buildRealisticPool() {
    this.loadTextures();
    this.createPoolStructure();
    this.createCausticsFloor();
    this.createWaveDampingLaneLines();
    this.createOlympicStartingBlocks();
    this.createOlympicTouchPads();
    this.createRealisticWater();
    this.createArenaArchitecture();
    this.createArenaRoofTruss();
    this.createAudienceFlashes();
    this.createScoreboard();
    this.setupBroadcastLighting();
  }

  loadTextures() {
    this.tileTexture = TextureGenerator.createPoolTiles();
    this.deckTexture = TextureGenerator.createDeckTiles();
    this.waterNormalTex = TextureGenerator.createWaterNormal();
    this.causticsObj = TextureGenerator.createCausticsCanvas();

    // 1. 타일 PBR 재질 (반짝이는 세라믹 유광 재질)
    this.tileMaterial = new THREE.MeshPhysicalMaterial({
      map: this.tileTexture,
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 0.8
    });

    // 2. 데크 재질
    this.deckMaterial = new THREE.MeshStandardMaterial({
      map: this.deckTexture,
      roughness: 0.45,
      metalness: 0.05
    });

    // 3. 레인 마커용 짙은 네이비 블루
    this.laneMarkerMaterial = new THREE.MeshStandardMaterial({
      color: 0x051b3b,
      roughness: 0.3
    });
  }

  createPoolStructure() {
    const poolGroup = new THREE.Group();

    // 1. 수영장 바닥 (Y = -this.poolDepth)
    const floorGeo = new THREE.PlaneGeometry(this.poolWidth, this.poolLength);
    const floor = new THREE.Mesh(floorGeo, this.tileMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -this.poolDepth, this.poolLength / 2);
    floor.receiveShadow = true;
    poolGroup.add(floor);

    // 올림픽 규격 바닥 T자 가이드 라인 (각 레인 중앙 46m 선과 끝단 2m 지점 T자)
    for (let i = 0; i < this.laneCount; i++) {
      const lx = this.getLaneX(i);

      // 중심 46m 레인 라인 (두께 0.25m)
      const lineGeo = new THREE.PlaneGeometry(0.25, 46);
      const line = new THREE.Mesh(lineGeo, this.laneMarkerMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(lx, -this.poolDepth + 0.003, this.poolLength / 2);
      poolGroup.add(line);

      // 양 끝 2m 지점 T자 크로스바 (길이 1.25m, 두께 0.25m)
      const t1Geo = new THREE.PlaneGeometry(1.25, 0.25);
      const t1 = new THREE.Mesh(t1Geo, this.laneMarkerMaterial);
      t1.rotation.x = -Math.PI / 2;
      t1.position.set(lx, -this.poolDepth + 0.004, 2.0);
      poolGroup.add(t1);

      const t2Geo = new THREE.PlaneGeometry(1.25, 0.25);
      const t2 = new THREE.Mesh(t2Geo, this.laneMarkerMaterial);
      t2.rotation.x = -Math.PI / 2;
      t2.position.set(lx, -this.poolDepth + 0.004, this.poolLength - 2.0);
      poolGroup.add(t2);
    }

    // 2. 수영장 4면 벽면 (좌, 우, 스타트 벽, 피니시 벽)
    const sideWallGeo = new THREE.PlaneGeometry(this.poolLength, this.poolDepth);
    const leftWall = new THREE.Mesh(sideWallGeo, this.tileMaterial);
    leftWall.position.set(-this.poolWidth / 2, -this.poolDepth / 2, this.poolLength / 2);
    leftWall.rotation.y = Math.PI / 2;
    poolGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, this.tileMaterial);
    rightWall.position.set(this.poolWidth / 2, -this.poolDepth / 2, this.poolLength / 2);
    rightWall.rotation.y = -Math.PI / 2;
    poolGroup.add(rightWall);

    const endWallGeo = new THREE.PlaneGeometry(this.poolWidth, this.poolDepth);
    const startWall = new THREE.Mesh(endWallGeo, this.tileMaterial);
    startWall.position.set(0, -this.poolDepth / 2, 0);
    poolGroup.add(startWall);

    const finishWall = new THREE.Mesh(endWallGeo, this.tileMaterial);
    finishWall.position.set(0, -this.poolDepth / 2, this.poolLength);
    finishWall.rotation.y = Math.PI;
    poolGroup.add(finishWall);

    // 3. 풀장 주변 워크웨이 데크 (Deck)
    const deckH = 0.3;
    const startDeck = new THREE.Mesh(new THREE.BoxGeometry(this.poolWidth + 14, deckH, 8), this.deckMaterial);
    startDeck.position.set(0, deckH / 2, -4);
    poolGroup.add(startDeck);

    const finishDeck = new THREE.Mesh(new THREE.BoxGeometry(this.poolWidth + 14, deckH, 8), this.deckMaterial);
    finishDeck.position.set(0, deckH / 2, this.poolLength + 4);
    poolGroup.add(finishDeck);

    const leftDeck = new THREE.Mesh(new THREE.BoxGeometry(6, deckH, this.poolLength), this.deckMaterial);
    leftDeck.position.set(-this.poolWidth / 2 - 3, deckH / 2, this.poolLength / 2);
    poolGroup.add(leftDeck);

    const rightDeck = new THREE.Mesh(new THREE.BoxGeometry(6, deckH, this.poolLength), this.deckMaterial);
    rightDeck.position.set(this.poolWidth / 2 + 3, deckH / 2, this.poolLength / 2);
    poolGroup.add(rightDeck);

    this.scene.add(poolGroup);
  }

  // 바닥 및 측면 벽면에 일렁이는 햇빛 카우스틱스 그물망 (Photorealistic Caustic Projection)
  createCausticsFloor() {
    const causticMat = new THREE.MeshBasicMaterial({
      map: this.causticsObj.texture,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // 1. 수영장 바닥
    const floorGeo = new THREE.PlaneGeometry(this.poolWidth, this.poolLength);
    const floorCaustics = new THREE.Mesh(floorGeo, causticMat);
    floorCaustics.rotation.x = -Math.PI / 2;
    floorCaustics.position.set(0, -this.poolDepth + 0.015, this.poolLength / 2);
    this.scene.add(floorCaustics);

    // 2. 좌우 측면 타일 벽면 카우스틱스 (물속 깊이감 극대화)
    const wallGeo = new THREE.PlaneGeometry(this.poolLength, this.poolDepth);
    const leftCaustics = new THREE.Mesh(wallGeo, causticMat);
    leftCaustics.position.set(-this.poolWidth / 2 + 0.015, -this.poolDepth / 2, this.poolLength / 2);
    leftCaustics.rotation.y = Math.PI / 2;
    this.scene.add(leftCaustics);

    const rightCaustics = new THREE.Mesh(wallGeo, causticMat);
    rightCaustics.position.set(this.poolWidth / 2 - 0.015, -this.poolDepth / 2, this.poolLength / 2);
    rightCaustics.rotation.y = -Math.PI / 2;
    this.scene.add(rightCaustics);
  }

  // 올림픽 파도 감쇄 도넛 디스크형 부표 로프 (Wave-damping Lane Lines)
  createWaveDampingLaneLines() {
    const laneGroup = new THREE.Group();

    for (let i = 0; i <= this.laneCount; i++) {
      const x = -this.poolWidth / 2 + i * this.laneWidth;

      // 올림픽 레인 컬러 규격:
      // 0, 10번 외곽: 녹색
      // 1, 9번: 주황/노랑
      // 2, 3, 7, 8번: 청색
      // 4, 5, 6번 중앙: 노랑
      let baseColor = 0x2563eb;
      if (i === 0 || i === this.laneCount) baseColor = 0x10b981;
      else if (i === 1 || i === 9) baseColor = 0xf59e0b;
      else if (i === 4 || i === 5 || i === 6) baseColor = 0xfacc15;

      const ropeMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.25,
        metalness: 0.15
      });
      const redMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.25
      });

      // 중심 와이어 케이블
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, this.poolLength, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
      );
      cable.rotation.x = Math.PI / 2;
      cable.position.set(x, 0.035, this.poolLength / 2);
      laneGroup.add(cable);

      // 도넛 디스크 부표 인스턴스 (실제 올림픽 수영장의 파도 흡수 톱니 디스크 링)
      const discCount = 100;
      const step = this.poolLength / discCount;

      for (let d = 0; d < discCount; d++) {
        const z = d * step + step / 2;
        // 5m, 15m, 25m 지점은 빨간색 부표
        const isRed = (z <= 5.0) || (z >= this.poolLength - 5.0) || (z >= 14.5 && z <= 15.5) || (z >= 24.5 && z <= 25.5);

        const discGeo = new THREE.TorusGeometry(0.065, 0.024, 6, 12);
        const disc = new THREE.Mesh(discGeo, isRed ? redMat : ropeMat);
        disc.position.set(x, 0.035, z);
        laneGroup.add(disc);
      }
    }

    this.scene.add(laneGroup);
  }

  // 올림픽 OMEGA 규격 스타트대 (Track Start Blocks)
  createOlympicStartingBlocks() {
    const blocksGroup = new THREE.Group();

    for (let i = 0; i < this.laneCount; i++) {
      const lx = this.getLaneX(i);
      const block = new THREE.Group();

      // 메인 바디 (화이트/다크 메탈 프레임)
      const baseGeo = new THREE.BoxGeometry(0.72, 0.52, 0.85);
      const baseMat = new THREE.MeshStandardMaterial({
        color: (i === 0 || i === 9) ? 0x64748b : 0x0f172a,
        roughness: 0.35,
        metalness: 0.2
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(0, 0.26, -0.55);
      block.add(base);

      // 상단 경사 발판 (10도 경사각, 논슬립 로열 블루)
      const topGeo = new THREE.BoxGeometry(0.74, 0.08, 0.88);
      const topMat = new THREE.MeshStandardMaterial({
        color: (i === 0 || i === 9) ? 0x475569 : 0x0284c7,
        roughness: 0.15,
        metalness: 0.1
      });
      const topPlate = new THREE.Mesh(topGeo, topMat);
      topPlate.rotation.x = -0.18; // 10도 올림픽 경사각
      topPlate.position.set(0, 0.56, -0.52);
      block.add(topPlate);

      // 뒷발 킥플레이트 (Kick Plate)
      const kickGeo = new THREE.BoxGeometry(0.7, 0.12, 0.15);
      const kickMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
      const kickPlate = new THREE.Mesh(kickGeo, kickMat);
      kickPlate.rotation.x = 0.5;
      kickPlate.position.set(0, 0.65, -0.85);
      block.add(kickPlate);

      // 크롬 백스트로크 핸들바 (Backstroke Handle)
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.1 });
      const barH = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 12), handleMat);
      barH.rotation.z = Math.PI / 2;
      barH.position.set(0, 0.18, -0.1);
      block.add(barH);

      // 디지털 레인 번호 LED 디스플레이 (전면 및 측면 부착)
      const numCanvas = document.createElement('canvas');
      numCanvas.width = 128;
      numCanvas.height = 128;
      const nctx = numCanvas.getContext('2d');
      nctx.fillStyle = '#060b14';
      nctx.fillRect(0, 0, 128, 128);
      nctx.fillStyle = (i === 0 || i === 9) ? '#94a3b8' : '#facc15';
      nctx.font = 'bold 84px Outfit, sans-serif';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(i.toString(), 64, 64);

      const numTex = new THREE.CanvasTexture(numCanvas);
      const numMat = new THREE.MeshBasicMaterial({ map: numTex });

      // 전면 번호판
      const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), numMat);
      frontPlate.position.set(0, 0.26, -0.12);
      block.add(frontPlate);

      block.position.set(lx, 0.3, 0);
      blocksGroup.add(block);
    }

    this.scene.add(blocksGroup);
  }

  // 올림픽 감응 터치패드 (Omega Touchpads)
  createOlympicTouchPads() {
    this.touchPads = [];
    const padGroup = new THREE.Group();

    for (let i = 0; i < this.laneCount; i++) {
      const lx = this.getLaneX(i);
      const padW = 2.38;
      const padH = 0.92;

      // 옐로우 전자 터치패드
      const padMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.3,
        metalness: 0.1
      });
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(padW, padH), padMat);
      pad.rotation.y = Math.PI;
      pad.position.set(lx, -0.38, this.poolLength - 0.02);

      // 상단 LED 센서 바 (골인 시 녹색/노란색 발광)
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x000000,
        emissiveIntensity: 0
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(padW, 0.06, 0.05), ledMat);
      led.position.set(lx, 0.12, this.poolLength - 0.02);

      padGroup.add(pad);
      padGroup.add(led);

      this.touchPads.push({ lane: i, pad, led, ledMat });
    }

    this.scene.add(padGroup);
  }

  triggerTouchPad(laneIndex, isWinner = false) {
    const padObj = this.touchPads[laneIndex];
    if (!padObj) return;

    if (isWinner) {
      padObj.ledMat.color.setHex(0x22c55e);
      padObj.ledMat.emissive.setHex(0x22c55e);
      padObj.ledMat.emissiveIntensity = 3.0;
    } else {
      padObj.ledMat.color.setHex(0xeab308);
      padObj.ledMat.emissive.setHex(0xeab308);
      padObj.ledMat.emissiveIntensity = 1.8;
    }
  }

  resetTouchPads() {
    this.touchPads.forEach(p => {
      p.ledMat.color.setHex(0x1e293b);
      p.ledMat.emissive.setHex(0x000000);
      p.ledMat.emissiveIntensity = 0;
    });
  }

  // 투명 수중 틴트와 물리 굴절/반사를 담은 차세대 리얼 수면 (Realistic PBR Water Surface)
  createRealisticWater() {
    const waterGeo = new THREE.PlaneGeometry(this.poolWidth, this.poolLength, 80, 160);

    // 올림픽 규격 맑은 수영장 물 PBR 셰이더
    this.waterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x012b48,
      transmission: 0.85, // 맑고 투명한 수중 광학
      opacity: 0.94,
      transparent: true,
      roughness: 0.025,   // 매끄러운 수면 반사
      metalness: 0.05,
      clearcoat: 1.0,     // 수면 코팅 반사광 극대화
      clearcoatRoughness: 0.02,
      ior: 1.333,         // 실제 물의 굴절률 (Refractive Index of Water)
      reflectivity: 0.98,
      attenuationColor: new THREE.Color(0x0284c7), // 수심에 따른 코발트 블루 광학 감쇠
      attenuationDistance: 2.8,
      normalMap: this.waterNormalTex,
      normalScale: new THREE.Vector2(0.45, 0.45)
    });

    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, 0.0, this.poolLength / 2);
    this.scene.add(this.waterMesh);

    this.waterPositions = waterGeo.attributes.position.array;
    this.origPositions = new Float32Array(this.waterPositions);
  }

  // 경기장 관중석 건축 구조물 (천장 시야를 가리는 철제 프레임은 전면 제거하여 탁 트인 시야 확보)
  createArenaArchitecture() {
    const archGroup = new THREE.Group();

    // 계단식 관중석 스탠드 (좌 & 우)
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const seatMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const seatMat2 = new THREE.MeshStandardMaterial({ color: 0x0f766e });

    for (let side of [-1, 1]) {
      const standX = side * (this.poolWidth / 2 + 10);
      for (let tier = 0; tier < 8; tier++) {
        const stepW = 1.4;
        const stepH = 0.9;
        const stepL = this.poolLength + 16;
        const xPos = standX + side * tier * stepW;
        const yPos = tier * stepH + 0.45;

        const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepL), standMat);
        step.position.set(xPos, yPos, this.poolLength / 2);
        archGroup.add(step);

        const seatRow = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, stepL - 4), tier % 2 === 0 ? seatMat1 : seatMat2);
        seatRow.position.set(xPos, yPos + stepH / 2 + 0.25, this.poolLength / 2);
        archGroup.add(seatRow);
      }
    }

    // 2. [올림픽 선수 입장 레드카펫 & 백스테이지 터널]
    // 데크 후방(Z = -7.5) 선수 등장 터널 및 레드카펫 워크웨이
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
    const redCarpet = new THREE.Mesh(new THREE.PlaneGeometry(this.poolWidth + 4, 1.8), carpetMat);
    redCarpet.rotation.x = -Math.PI / 2;
    redCarpet.position.set(0, 0.306, -6.5);
    archGroup.add(redCarpet);

    // 백스테이지 터널 게이트 백월 (선수들이 걸어 나오는 출구)
    const gateWallMat = new THREE.MeshStandardMaterial({ color: 0x070d18, roughness: 0.85 });
    const gateWall = new THREE.Mesh(new THREE.BoxGeometry(this.poolWidth + 8, 3.6, 0.5), gateWallMat);
    gateWall.position.set(0, 1.8, -7.8);
    archGroup.add(gateWall);

    // 올림픽 아치 LED 라인
    const archLedMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.8 });
    const archLed = new THREE.Mesh(new THREE.BoxGeometry(this.poolWidth + 6, 0.15, 0.6), archLedMat);
    archLed.position.set(0, 3.65, -7.7);
    archGroup.add(archLed);

    this.scene.add(archGroup);
  }

  // 결승선 상공 점보트론 대형 전광판 (Jumbotron Scoreboard)
  // 결승선 훨씬 뒤쪽 높은 경기장 벽면(Y=17, Z=64.5)에 배치하여 전경 와이드 뷰 시야를 가리지 않음
  createScoreboard() {
    this.scoreboardCanvas = document.createElement('canvas');
    this.scoreboardCanvas.width = 1024;
    this.scoreboardCanvas.height = 512;
    this.scoreboardCtx = this.scoreboardCanvas.getContext('2d');

    this.scoreboardTexture = new THREE.CanvasTexture(this.scoreboardCanvas);
    this.scoreboardTexture.minFilter = THREE.LinearFilter;

    const boardMat = new THREE.MeshBasicMaterial({ map: this.scoreboardTexture });
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), boardMat);
    boardMesh.rotation.y = Math.PI;
    boardMesh.position.set(0, 17.0, this.poolLength + 14.0);
    this.scene.add(boardMesh);

    // 슬림 모던 베젤 (시야를 방해하던 육중한 철제 프레임 완전 제거 및 초슬림 베젤 적용)
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(22.4, 11.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.5, metalness: 0.2 })
    );
    bezel.position.set(0, 17.0, this.poolLength + 14.15);
    this.scene.add(bezel);

    this.updateScoreboard({
      statusText: "READY FOR BETTING",
      time: "00:00.00",
      leaderName: "LANE 1~8",
      newsText: ""
    });
  }

  updateScoreboard(data) {
    const ctx = this.scoreboardCtx;
    if (!ctx) return;

    ctx.fillStyle = '#060b14';
    ctx.fillRect(0, 0, 1024, 512);

    // 아쿠아 테두리 라인
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 1000, 488);

    // 상단 올림픽 타이틀 바
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(16, 16, 992, 74);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 AQUATICS 50M FREESTYLE FINAL', 40, 65);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 40px Courier New, monospace';
    ctx.fillText(data.time || '00:00.00', 980, 65);

    // 중앙 경기 상태
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 44px Outfit, sans-serif';
    ctx.fillText(data.statusText || 'LIVE RACE', 512, 180);

    // 선두 선수 정보
    if (data.leaderName) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px Outfit, sans-serif';
      ctx.fillText('CURRENT LEADER', 512, 250);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 56px Outfit, sans-serif';
      ctx.fillText(data.leaderName, 512, 330);
    }

    // 하단 올림픽 공식 아레나 로고 및 레인 안내 (돌발 상황 문구는 2D HUD로 전담 분리)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(30, 390, 964, 80);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 390, 964, 80);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ OFFICIAL OLYMPIC TIMING & TOUCHPAD SCORING ⚡', 512, 440);

    this.scoreboardTexture.needsUpdate = true;
  }

  // 4대 올림픽 메가 투광등 & 수중 발광 & 인체 림라이트 (Broadcast Arena Lighting & Rim Light)
  setupBroadcastLighting() {
    // 1. 경기장 기본 환경광
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);
    this.scene.add(ambientLight);

    // 2. 메인 천장 아레나 주 투광등 (소프트 섀도우)
    const mainSun = new THREE.DirectionalLight(0xffffff, 1.6);
    mainSun.position.set(16, 26, 25);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 90;
    mainSun.shadow.camera.left = -26;
    mainSun.shadow.camera.right = 26;
    mainSun.shadow.camera.top = 36;
    mainSun.shadow.camera.bottom = -36;
    mainSun.shadow.bias = -0.0004;
    this.scene.add(mainSun);

    // 3. 선수 인체 윤곽선 림라이트 (Rim Light - 인체와 물결의 가장자리를 빛나게 분리)
    const rimLight = new THREE.DirectionalLight(0xbae6fd, 1.2);
    rimLight.position.set(-18, 18, 55);
    this.scene.add(rimLight);

    // 4. 경기장 4대 코너 올림픽 메가 스포트라이트 (4 Mega Corner Stadium Towers)
    const corners = [
      { x: -16, y: 19, z: 2 },
      { x: 16, y: 19, z: 2 },
      { x: -16, y: 19, z: 48 },
      { x: 16, y: 19, z: 48 }
    ];
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0, 25);
    this.scene.add(targetObj);

    corners.forEach(pos => {
      const spot = new THREE.SpotLight(0xfffbeb, 1.4, 75, Math.PI / 4.5, 0.45, 1.2);
      spot.position.set(pos.x, pos.y, pos.z);
      spot.target = targetObj;
      this.scene.add(spot);
    });

    // 5. 수중 아쿠아 LED 램프 (Underwater Blue Illuminators)
    for (let z of [6, 16, 26, 36, 46]) {
      const uLight = new THREE.PointLight(0x0284c7, 1.8, 14);
      uLight.position.set(0, -1.3, z);
      this.scene.add(uLight);
    }
  }

  // 경기장 상공 웅장한 아치 트러스 돔 구조물 (카메라 시야 방해 0%)
  createArenaRoofTruss() {
    const trussGroup = new THREE.Group();
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Y=24m 상공을 가로지르는 3개의 대형 돔 아치 빔
    for (let z of [10, 25, 40]) {
      const archCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-this.poolWidth / 2 - 16, 6, z),
        new THREE.Vector3(0, 25, z),
        new THREE.Vector3(this.poolWidth / 2 + 16, 6, z)
      );
      const archGeo = new THREE.TubeGeometry(archCurve, 32, 0.45, 8, false);
      const archMesh = new THREE.Mesh(archGeo, trussMat);
      trussGroup.add(archMesh);

      // 아치 하단 네온 LED 라인
      const ledGeo = new THREE.TubeGeometry(archCurve, 32, 0.12, 6, false);
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.y -= 0.3;
      trussGroup.add(ledMesh);
    }

    this.scene.add(trussGroup);
  }

  // 관중석 스마트폰 플래시 / 응원봉 반짝임 연출 (Audience Flash Sparkles)
  createAudienceFlashes() {
    const flashCount = 120;
    const flashGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(flashCount * 3);
    const opacities = new Float32Array(flashCount);

    let idx = 0;
    for (let i = 0; i < flashCount; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (this.poolWidth / 2 + 10 + Math.random() * 11);
      const tier = Math.random() * 8;
      const y = tier * 0.9 + 1.2 + Math.random() * 0.5;
      const z = Math.random() * this.poolLength;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      opacities[i] = 0.0;
      idx += 3;
    }

    flashGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.flashOpacities = opacities;

    // 플래시 캔버스 텍스처 (중심이 밝고 부드럽게 번지는 스타버스트 광원)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.3, 'rgba(224, 242, 254, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const starTex = new THREE.CanvasTexture(canvas);

    this.flashMaterial = new THREE.PointsMaterial({
      size: 1.2,
      map: starTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9
    });

    this.flashPoints = new THREE.Points(flashGeo, this.flashMaterial);
    this.scene.add(this.flashPoints);
  }

  // 매 프레임 물결, 카우스틱스, 관중 플래시 애니메이션
  update(time) {
    // 1. 카우스틱스 바닥 일렁임 (SIGGRAPH 간섭 파동)
    if (this.causticsObj) {
      this.causticsObj.update(time);
    }

    // 2. 수면 2중 비대칭 노멀맵 스크롤링
    if (this.waterNormalTex) {
      this.waterNormalTex.offset.x = (time * 0.045) % 1;
      this.waterNormalTex.offset.y = (time * 0.075) % 1;
    }

    // 3. 복합 사인파 + 게르스트너 수면 지오메트리 입체 파동
    if (this.waterMesh) {
      const pos = this.waterMesh.geometry.attributes.position.array;
      const orig = this.origPositions;
      for (let i = 0; i < pos.length; i += 3) {
        const u = orig[i];
        const v = orig[i + 1];
        pos[i + 2] = Math.sin(u * 1.6 + time * 3.8 + Math.cos(v * 1.2)) * 0.032 + Math.cos(v * 2.2 - time * 3.0) * 0.022;
      }
      this.waterMesh.geometry.attributes.position.needsUpdate = true;
    }

    // 4. 관중석 카메라 플래시 무작위 번쩍임
    if (this.flashPoints) {
      // 프레임마다 약 10% 확률로 1~3개의 스마트폰 플래시 폭발
      const isBurst = Math.random() < 0.28;
      this.flashPoints.visible = isBurst;
      if (isBurst) {
        this.flashMaterial.size = 1.0 + Math.random() * 1.6;
      }
    }
  }
}
