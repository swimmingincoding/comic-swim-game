import * as THREE from 'three';

/**
 * 차세대 사실적 3D 수영선수 모델 (Realistic PBR Humanoid Swimmer)
 * - 해부학적 인체 굴곡 (유선형 흉곽, 복근, 둔부, 어깨 삼각근)
 * - 2단 관절 팔 (어깨-팔꿈치-손) : 실제 수영 하이 엘보 리커버리(High-Elbow Recovery)
 * - 2단 관절 다리 (고관절-무릎-발) : 자연스러운 채찍 플러터 킥 (Flutter Kick)
 * - 물에 젖은 피부 PBR 셰이더 (Clearcoat Wet Sheen) & 미러 수경 반사광
 * - 하얀 물살 웨이크, 백색 물보라 포말(Splash) 및 수중 기포 스트림
 */

export class SwimmerModel {
  constructor(data, laneX, scene) {
    this.data = data;
    this.lane = data.lane;
    this.laneX = laneX;
    this.scene = scene;

    this.position = new THREE.Vector3(laneX, 0.45, -0.6);
    this.state = "IDLE";
    this.speed = 0;
    this.progressZ = 0;

    this.diveTimer = 0;
    this.diveDuration = 0.95;
    this.swimTime = Math.random() * 20;

    this.incident = null;
    this.incidentActive = false;
    this.incidentTimer = 0;

    this.meshGroup = new THREE.Group();
    this.buildRealisticCharacter();
    this.buildEmojiBubble();
    this.buildRealisticSplash();

    this.meshGroup.position.copy(this.position);
    this.scene.add(this.meshGroup);
  }

  buildRealisticCharacter() {
    const vis = this.data.visuals;
    const isMuscular = (this.data.type === "muscular");
    const isElder = (this.data.type === "elder");
    const isFemale = (this.data.gender === "female");

    this.bodyRoot = new THREE.Group();

    // 1. 젖은 피부 재질 (PBR Clearcoat Wet Skin)
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: vis.skinTone,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.92, // 물에 젖은 광택감
      clearcoatRoughness: 0.08,
      reflectivity: 0.7
    });

    // 2. 수영복 재질 (광택 수영복 원단)
    const suitMat = new THREE.MeshPhysicalMaterial({
      color: vis.suitColor,
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.12
    });

    // 3. 실리콘 수모 재질
    const capMat = new THREE.MeshPhysicalMaterial({
      color: vis.capColor,
      roughness: 0.18,
      metalness: 0.1,
      clearcoat: 0.85
    });

    // 4. 미러 수경 렌즈 재질 (Chrome/Mirror)
    const gogglesLensMat = new THREE.MeshStandardMaterial({
      color: vis.gogglesColor,
      metalness: 0.95,
      roughness: 0.05
    });
    const gogglesFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5
    });

    // --- 체형 스케일 파라미터 ---
    const shoulderWidth = isMuscular ? 0.58 : (isFemale ? 0.38 : (isElder ? 0.42 : 0.46));
    const chestDepth = isMuscular ? 0.30 : (isFemale ? 0.24 : 0.26);

    // --- 몸통 (Torso) 계층 구조 ---
    this.torsoGroup = new THREE.Group();

    // 상체 가슴 (Chest - 유선형 캡슐)
    const chestGeo = new THREE.CapsuleGeometry(chestDepth * 0.55, 0.32, 12, 16);
    this.chest = new THREE.Mesh(chestGeo, (isFemale || vis.suitType === "jammer") ? suitMat : skinMat);
    this.chest.rotation.z = Math.PI / 2;
    this.chest.scale.set(1.0, shoulderWidth / (chestDepth * 1.1), 1.0);
    this.chest.position.set(0, 0.22, 0);
    this.torsoGroup.add(this.chest);

    // 어깨 삼각근 (Deltoids)
    for (let side of [-1, 1]) {
      const deltGeo = new THREE.SphereGeometry(chestDepth * 0.42, 12, 12);
      const delt = new THREE.Mesh(deltGeo, skinMat);
      delt.position.set(side * (shoulderWidth * 0.52), 0.24, 0);
      this.torsoGroup.add(delt);
    }

    // 복부 및 허리 (Abdomen)
    const absGeo = new THREE.CylinderGeometry(shoulderWidth * 0.38, shoulderWidth * 0.42, 0.26, 14);
    this.abs = new THREE.Mesh(absGeo, isFemale ? suitMat : skinMat);
    this.abs.position.set(0, 0.02, 0);
    this.torsoGroup.add(this.abs);

    // 골반 및 둔부 (Hips - 수영복)
    const hipsGeo = new THREE.CapsuleGeometry(shoulderWidth * 0.42, 0.22, 12, 16);
    this.hips = new THREE.Mesh(hipsGeo, suitMat);
    this.hips.rotation.z = Math.PI / 2;
    this.hips.position.set(0, -0.16, 0);
    this.torsoGroup.add(this.hips);

    this.bodyRoot.add(this.torsoGroup);

    // --- 머리 및 얼굴 (Head & Cap) ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.44, 0.02);

    // 수모 쓴 두상 (실리콘 캡 곡선)
    const headGeo = new THREE.SphereGeometry(0.165, 18, 18);
    headGeo.scale(0.88, 1.05, 0.98);
    this.head = new THREE.Mesh(headGeo, capMat);
    this.headGroup.add(this.head);

    // 얼굴 앞면 (피부 톤 마스크)
    const faceGeo = new THREE.SphereGeometry(0.14, 14, 14);
    faceGeo.scale(0.82, 0.85, 0.8);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.position.set(0, -0.02, 0.04);
    this.headGroup.add(face);

    // 코 (Nose)
    const noseGeo = new THREE.ConeGeometry(0.025, 0.05, 6);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, -0.02, 0.16);
    this.headGroup.add(nose);

    // 미러 수경 (Mirrored Racing Goggles)
    const gogglesGroup = new THREE.Group();
    for (let side of [-1, 1]) {
      // 렌즈
      const lensGeo = new THREE.SphereGeometry(0.042, 12, 12);
      lensGeo.scale(1.2, 0.8, 0.5);
      const lens = new THREE.Mesh(lensGeo, gogglesLensMat);
      lens.position.set(side * 0.052, 0.02, 0.14);
      gogglesGroup.add(lens);

      // 테두리 프레임
      const rimGeo = new THREE.TorusGeometry(0.042, 0.008, 8, 16);
      const rim = new THREE.Mesh(rimGeo, gogglesFrameMat);
      rim.position.set(side * 0.052, 0.02, 0.14);
      gogglesGroup.add(rim);
    }
    // 수경 실리콘 스트랩 (머리 뒤로 이어짐)
    const strapGeo = new THREE.TorusGeometry(0.155, 0.008, 6, 24);
    const strap = new THREE.Mesh(strapGeo, gogglesFrameMat);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, 0.02, -0.01);
    gogglesGroup.add(strap);

    this.headGroup.add(gogglesGroup);

    // 노인/아줌마 특유의 헤어 포인트
    if (vis.accent === "silver_hair" || vis.accent === "perm_hair") {
      const hairGeo = new THREE.SphereGeometry(0.175, 12, 12);
      hairGeo.scale(0.9, 0.6, 0.9);
      const hairMat = new THREE.MeshStandardMaterial({ color: vis.hairColor, roughness: 0.95 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.03, -0.05);
      this.headGroup.add(hair);
    }

    this.bodyRoot.add(this.headGroup);

    // --- 2단 관절 팔 (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand) ---
    this.arms = {};
    for (let side of ['left', 'right']) {
      const sign = (side === 'left') ? -1 : 1;

      // 1. 어깨 피벗
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(sign * (shoulderWidth * 0.55), 0.24, 0);

      // 상완 (Upper arm)
      const upperArmGeo = new THREE.CapsuleGeometry(0.055, 0.25, 10, 14);
      upperArmGeo.translate(0, -0.125, 0);
      const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
      shoulderPivot.add(upperArm);

      // 2. 팔꿈치 피벗 (Elbow)
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.28, 0);

      // 전완 (Forearm)
      const forearmGeo = new THREE.CapsuleGeometry(0.048, 0.24, 10, 14);
      forearmGeo.translate(0, -0.12, 0);
      const forearm = new THREE.Mesh(forearmGeo, skinMat);
      elbowPivot.add(forearm);

      // 손 (Hand blade)
      const handGeo = new THREE.BoxGeometry(0.02, 0.12, 0.08);
      handGeo.translate(0, -0.26, 0);
      const hand = new THREE.Mesh(handGeo, skinMat);
      elbowPivot.add(hand);

      shoulderPivot.add(elbowPivot);
      this.bodyRoot.add(shoulderPivot);

      this.arms[side] = { shoulder: shoulderPivot, elbow: elbowPivot };
    }

    // --- 2단 관절 다리 (Hip -> Thigh -> Knee -> Calf -> Foot) ---
    this.legs = {};
    for (let side of ['left', 'right']) {
      const sign = (side === 'left') ? -1 : 1;

      // 1. 고관절 피벗
      const hipPivot = new THREE.Group();
      hipPivot.position.set(sign * (shoulderWidth * 0.26), -0.22, 0);

      // 대퇴부 허벅지 (Thigh)
      const thighGeo = new THREE.CapsuleGeometry(0.072, 0.34, 10, 14);
      thighGeo.translate(0, -0.17, 0);
      const thigh = new THREE.Mesh(thighGeo, skinMat);
      hipPivot.add(thigh);

      // 2. 무릎 피벗 (Knee)
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.38, 0);

      // 하퇴부 종아리 (Calf)
      const calfGeo = new THREE.CapsuleGeometry(0.058, 0.32, 10, 14);
      calfGeo.translate(0, -0.16, 0);
      const calf = new THREE.Mesh(calfGeo, skinMat);
      kneePivot.add(calf);

      // 발 (Foot - 물을 차기 위해 발등이 쭉 펴진 포인 자세)
      const footGeo = new THREE.BoxGeometry(0.06, 0.18, 0.04);
      footGeo.translate(0, -0.36, 0.03);
      const foot = new THREE.Mesh(footGeo, skinMat);
      kneePivot.add(foot);

      hipPivot.add(kneePivot);
      this.bodyRoot.add(hipPivot);

      this.legs[side] = { hip: hipPivot, knee: kneePivot };
    }

    this.meshGroup.add(this.bodyRoot);
  }

  // 3D 코믹 말풍선
  buildEmojiBubble() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    this.bubbleCtx = canvas.getContext('2d');

    this.bubbleTexture = new THREE.CanvasTexture(canvas);
    const bubbleMat = new THREE.SpriteMaterial({
      map: this.bubbleTexture,
      transparent: true,
      opacity: 0
    });

    this.bubbleSprite = new THREE.Sprite(bubbleMat);
    this.bubbleSprite.scale.set(1.5, 1.5, 1.5);
    this.bubbleSprite.position.set(0, 1.35, 0);
    this.meshGroup.add(this.bubbleSprite);
  }

  showEmoji(emoji) {
    const ctx = this.bubbleCtx;
    ctx.clearRect(0, 0, 256, 256);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 115, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(128, 210);
    ctx.lineTo(105, 245);
    ctx.lineTo(150, 210);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.font = '90px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 115);

    this.bubbleTexture.needsUpdate = true;
    this.bubbleSprite.material.opacity = 1.0;
  }

  hideEmoji() {
    this.bubbleSprite.material.opacity = 0;
  }

  // 사실적인 백색 물보라(Splash) & 수중 기포 파티클
  buildRealisticSplash() {
    // 1. 수면 위 백색 포말 물보라 (White Water Spray)
    const sprayCount = 45;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);
    const sprayVels = [];

    for (let i = 0; i < sprayCount; i++) {
      sprayPos[i * 3] = (Math.random() - 0.5) * 0.7;
      sprayPos[i * 3 + 1] = Math.random() * 0.2;
      sprayPos[i * 3 + 2] = -Math.random() * 1.8;
      sprayVels.push({
        x: (Math.random() - 0.5) * 0.6,
        y: Math.random() * 0.9 + 0.3,
        z: -Math.random() * 1.4 - 0.4
      });
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    this.sprayVelocities = sprayVels;

    const sprayMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.85
    });
    this.sprayParticles = new THREE.Points(sprayGeo, sprayMat);
    this.meshGroup.add(this.sprayParticles);

    // 2. 수면 V자 웨이크(Wake) - 물결 파동
    const wakeGeo = new THREE.PlaneGeometry(1.2, 2.2);
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.wakeMesh = new THREE.Mesh(wakeGeo, wakeMat);
    this.wakeMesh.rotation.x = -Math.PI / 2;
    this.wakeMesh.position.set(0, 0.03, -0.6);
    this.meshGroup.add(this.wakeMesh);
  }

  // 1. 경기 시작 전 데크 바닥 대기 상태
  setBackstageWait() {
    this.state = "BACKSTAGE";
    this.progressZ = -6.5;
    this.position.set(this.laneX, 0.3, -6.5);
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.set(0, 0, 0);

    this.bodyRoot.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
    this.arms.left.shoulder.rotation.set(0, 0, 0.1);
    this.arms.left.elbow.rotation.set(0.1, 0, 0);
    this.arms.right.shoulder.rotation.set(0, 0, -0.1);
    this.arms.right.elbow.rotation.set(0.1, 0, 0);
    this.legs.left.hip.rotation.set(0, 0, 0);
    this.legs.left.knee.rotation.set(0, 0, 0);
    this.legs.right.hip.rotation.set(0, 0, 0);
    this.legs.right.knee.rotation.set(0, 0, 0);

    this.hideEmoji();
    if (this.wakeMesh) this.wakeMesh.material.opacity = 0;
  }

  setDeckStand() {
    this.state = "DECK_STAND";
    this.progressZ = -2.0;
    this.position.set(this.laneX, 0.3, -2.0);
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.set(0, 0, 0);

    // 자연스럽게 서 있는 자세
    this.bodyRoot.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
    this.arms.left.shoulder.rotation.set(0, 0, 0.1);
    this.arms.left.elbow.rotation.set(0.1, 0, 0);
    this.arms.right.shoulder.rotation.set(0, 0, -0.1);
    this.arms.right.elbow.rotation.set(0.1, 0, 0);
    this.legs.left.hip.rotation.set(0, 0, 0);
    this.legs.left.knee.rotation.set(0, 0, 0);
    this.legs.right.hip.rotation.set(0, 0, 0);
    this.legs.right.knee.rotation.set(0, 0, 0);

    this.hideEmoji();
    if (this.wakeMesh) this.wakeMesh.material.opacity = 0;
  }

  // 2. [실제 올림픽 결승] 백스테이지 레드카펫 입장 보행 + 8인 8색 시그니처 포징
  playAthleteWalkAndPose(time, totalDuration = 3.2) {
    const walkDuration = 1.4;

    if (time < walkDuration) {
      // (1) 워킹 페이즈: 백스테이지(Z = -6.5)에서 스타트대 앞(Z = -2.0)으로 당당하게 보행 입장!
      const t = time / walkDuration;
      const curZ = THREE.MathUtils.lerp(-6.5, -2.0, t);
      const walkFreq = 9.0;
      const legSwing = Math.sin(time * walkFreq);

      this.meshGroup.position.set(this.laneX, 0.3 + Math.abs(Math.sin(time * walkFreq)) * 0.045, curZ);
      this.meshGroup.rotation.set(0, 0, 0);
      this.bodyRoot.rotation.set(0.04, 0, 0);

      // 왼다리 & 오른다리 자연스러운 교차 보행
      this.legs.left.hip.rotation.set(legSwing * 0.6, 0, 0);
      this.legs.left.knee.rotation.set(Math.max(0, -legSwing * 0.75), 0, 0);

      this.legs.right.hip.rotation.set(-legSwing * 0.6, 0, 0);
      this.legs.right.knee.rotation.set(Math.max(0, legSwing * 0.75), 0, 0);

      // 팔 스윙 & 입장 환호 인사
      this.arms.left.shoulder.rotation.set(-legSwing * 0.5, 0, 0.1);
      this.arms.left.elbow.rotation.set(0.2, 0, 0);

      this.arms.right.shoulder.rotation.set(legSwing * 0.5 - 0.2, 0, -0.15);
      this.arms.right.elbow.rotation.set(0.3, 0, 0);

      this.headGroup.rotation.set(-0.05, Math.sin(time * 3) * 0.12, 0);
      this.hideEmoji();
    } else {
      // (2) 도착 및 시그니처 캐릭터 포징 페이즈 (1.4초 ~ 3.2초)
      const poseTime = time - walkDuration;
      this.meshGroup.position.set(this.laneX, 0.3, -2.0);
      this.meshGroup.rotation.set(0, 0, 0);

      // 하체 안정적인 기립 자세
      this.legs.left.hip.rotation.set(0, 0, -0.08);
      this.legs.left.knee.rotation.set(0, 0, 0);
      this.legs.right.hip.rotation.set(0, 0, 0.08);
      this.legs.right.knee.rotation.set(0, 0, 0);
      this.bodyRoot.rotation.set(0, 0, 0);

      // 8인 8색 개성 만점 시그니처 포징
      switch (this.lane) {
        case 1: { // 박춘삼 (새벽 약수터의 전설, 74세) - 약수터 허리 돌리기 & 등 치기
          this.bodyRoot.rotation.y = Math.sin(poseTime * 3.5) * 0.22;
          this.arms.left.shoulder.rotation.set(0.6, 0, 0.5);
          this.arms.left.elbow.rotation.set(1.1, 0, 0); // 왼손 허리춤
          this.arms.right.shoulder.rotation.set(1.1 + Math.sin(poseTime * 7) * 0.35, 0, -0.3);
          this.arms.right.elbow.rotation.set(1.4, 0, 0); // 오른손 등 팡팡
          this.headGroup.rotation.set(0.15, Math.sin(poseTime * 3.5) * 0.2, 0);
          this.showEmoji('👴');
          break;
        }

        case 2: { // 이수민 (돌고래 요정, 23세) - 양손 머리 위 큰 하트 & 살랑살랑 인사
          this.arms.left.shoulder.rotation.set(-Math.PI * 0.72, 0, -0.75);
          this.arms.left.elbow.rotation.set(1.45, 0, 0);
          this.arms.right.shoulder.rotation.set(-Math.PI * 0.72, 0, 0.75);
          this.arms.right.elbow.rotation.set(1.45, 0, 0); // 머리 위 하트
          this.bodyRoot.rotation.z = Math.sin(poseTime * 4.5) * 0.08;
          this.headGroup.rotation.set(-0.15, 0, Math.sin(poseTime * 4.5) * 0.1);
          this.showEmoji('💖');
          break;
        }

        case 3: { // 마동철 (헬스장 3대 600, 34세) - 보디빌딩 프론트 더블 바이셉스 & 헐크 포효
          this.arms.left.shoulder.rotation.set(-Math.PI * 0.52, 0, -1.35);
          this.arms.left.elbow.rotation.set(1.85 + Math.sin(poseTime * 14) * 0.05, 0, 0);
          this.arms.right.shoulder.rotation.set(-Math.PI * 0.52, 0, 1.35);
          this.arms.right.elbow.rotation.set(1.85 + Math.sin(poseTime * 14) * 0.05, 0, 0);
          this.bodyRoot.rotation.set(-0.1, 0, 0);
          this.headGroup.rotation.set(-0.25, Math.sin(poseTime * 2) * 0.1, 0);
          this.showEmoji('💪');
          break;
        }

        case 4: { // 김태환 (국가대표 에이스, 21세) - 심장 터치 후 하늘 위로 1등 검지 번쩍!
          this.arms.left.shoulder.rotation.set(0.5, 0, 0.4);
          this.arms.left.elbow.rotation.set(1.2, 0, 0); // 심장 손 얹기
          this.arms.right.shoulder.rotation.set(-Math.PI * 0.95, 0, 0.05);
          this.arms.right.elbow.rotation.set(0.08, 0, 0); // 1등 손가락!
          this.headGroup.rotation.set(-0.28, 0, 0);
          this.showEmoji('☝️');
          break;
        }

        case 5: { // 최영자 (복덕방 아쿠아로빅, 67세) - 아쿠아로빅 신바람 박수 & 힙 쉐이크
          const clap = Math.sin(poseTime * 8);
          this.arms.left.shoulder.rotation.set(-0.7, 0, 0.45 + clap * 0.35);
          this.arms.left.elbow.rotation.set(0.8, 0, 0);
          this.arms.right.shoulder.rotation.set(-0.7, 0, -0.45 - clap * 0.35);
          this.arms.right.elbow.rotation.set(0.8, 0, 0);
          this.bodyRoot.rotation.z = Math.sin(poseTime * 6) * 0.14;
          this.headGroup.rotation.set(0.1, Math.sin(poseTime * 6) * 0.15, 0);
          this.showEmoji('👏');
          break;
        }

        case 6: { // 정민우 (유튜브 3일 독학, 27세) - 스마트폰 셀카 얼짱 각도 & 브이 ✌️
          this.arms.left.shoulder.rotation.set(-0.65, 0, 0.55);
          this.arms.left.elbow.rotation.set(0.9, 0, 0);
          this.arms.right.shoulder.rotation.set(-Math.PI * 0.62, 0, -0.28);
          this.arms.right.elbow.rotation.set(0.95, 0, 0); // 턱 브이
          this.headGroup.rotation.set(0.1, -0.32, -0.15);
          this.showEmoji('✌️');
          break;
        }

        case 7: { // 강하나 (폭풍 발차기 여대생, 22세) - 파이팅 가드 & 정권 지르기
          this.arms.left.shoulder.rotation.set(-0.6, 0, 0.35);
          this.arms.left.elbow.rotation.set(1.5, 0, 0);
          const punch = Math.sin(poseTime * 6.5);
          this.arms.right.shoulder.rotation.set(-0.75, 0, -0.1);
          this.arms.right.elbow.rotation.set(0.3 + Math.max(0, punch) * 0.7, 0, 0);
          this.headGroup.rotation.set(-0.15, 0.1, 0);
          this.showEmoji('🥊');
          break;
        }

        case 8: { // 오필승 (해병대 특수수색대, 32세) - 칼각 거수경례 "필~승!"
          this.arms.left.shoulder.rotation.set(0, 0, 0.05);
          this.arms.left.elbow.rotation.set(0.05, 0, 0);
          this.arms.right.shoulder.rotation.set(-Math.PI * 0.44, 0, 1.25);
          this.arms.right.elbow.rotation.set(2.4, 0, 0); // 칼각 경례
          this.bodyRoot.rotation.set(-0.06, 0, 0);
          this.headGroup.rotation.set(0.06, 0, 0);
          this.showEmoji('🫡');
          break;
        }
      }
    }
  }

  // 3. 심판 호각 소리: 스타트대 위로 올라서기 (Step Up to Starting Platform)
  stepOntoBlock(t) {
    this.state = "ON_BLOCK";
    // Z: -2.2 -> -0.5, Y: 0.3 -> 0.88 로 부드럽게 올라섬
    const curZ = THREE.MathUtils.lerp(-2.2, -0.5, t);
    const curY = THREE.MathUtils.lerp(0.3, 0.88, t) + Math.sin(t * Math.PI) * 0.15;
    this.meshGroup.position.set(this.laneX, curY, curZ);

    // 차렷 서 있는 자세
    this.bodyRoot.rotation.set(0, 0, 0);
    this.arms.left.shoulder.rotation.set(0, 0, 0.1);
    this.arms.right.shoulder.rotation.set(0, 0, -0.1);
  }

  // 4. "Take Your Marks..." 크라우칭 스타트 준비 자세
  takeMarks(t) {
    this.state = "TAKE_MARKS";
    this.meshGroup.position.set(this.laneX, 0.88, -0.5);

    // 허리 숙여 스타트대 앞쪽 잡기
    this.bodyRoot.rotation.x = THREE.MathUtils.lerp(0, 0.75, t);
    this.headGroup.rotation.x = THREE.MathUtils.lerp(0, -0.55, t);

    this.arms.left.shoulder.rotation.set(0.95 * t, 0, 0.1);
    this.arms.left.elbow.rotation.set(0.3 * t, 0, 0);
    this.arms.right.shoulder.rotation.set(0.95 * t, 0, -0.1);
    this.arms.right.elbow.rotation.set(0.3 * t, 0, 0);

    // 뒷발 킥플레이트 거치
    this.legs.left.hip.rotation.set(-1.1 * t, 0, 0);
    this.legs.left.knee.rotation.set(1.4 * t, 0, 0);
    this.legs.right.hip.rotation.set(-0.7 * t, 0, 0);
    this.legs.right.knee.rotation.set(0.9 * t, 0, 0);
  }

  // 스타트대 준비 완료 상태
  setReady() {
    this.setDeckStand();
  }

  startDive() {
    this.state = "DIVING";
    this.diveTimer = 0;
  }

  triggerIncident(incident) {
    this.incident = incident;
    this.incidentActive = true;
    this.incidentTimer = 0;
    this.state = "INCIDENT";
    this.showEmoji(incident.emoji);
  }

  // 매 프레임 업데이트 루프
  update(delta, racePlan) {
    this.swimTime += delta * 6.5;

    if (this.state === "IDLE") {
      this.bodyRoot.position.y = Math.sin(this.swimTime * 0.4) * 0.015;
      return;
    }

    if (this.state === "DIVING") {
      this.diveTimer += delta;
      const t = Math.min(this.diveTimer / this.diveDuration, 1.0);

      // 우아한 다이빙 포물선 (Y: 0.88 -> 1.55 -> 0.02 입수)
      const jumpY = 0.88 + Math.sin(t * Math.PI) * 0.7 - (t * 0.86);
      const jumpZ = -0.5 + t * 4.8;

      this.meshGroup.position.y = jumpY;
      this.meshGroup.position.z = jumpZ;
      this.progressZ = jumpZ;

      // 스트림라인 (Streamline) 일자 만세 자세
      this.bodyRoot.rotation.x = THREE.MathUtils.lerp(0.75, Math.PI / 2, t);
      this.headGroup.rotation.x = -0.1;
      this.arms.left.shoulder.rotation.set(-Math.PI * 0.95, 0, 0.05);
      this.arms.left.elbow.rotation.set(0.05, 0, 0);
      this.arms.right.shoulder.rotation.set(-Math.PI * 0.95, 0, -0.05);
      this.arms.right.elbow.rotation.set(0.05, 0, 0);

      this.legs.left.hip.rotation.set(0, 0, 0);
      this.legs.left.knee.rotation.set(0, 0, 0);
      this.legs.right.hip.rotation.set(0, 0, 0);
      this.legs.right.knee.rotation.set(0, 0, 0);

      if (t >= 1.0) {
        this.state = "SWIMMING";
        this.meshGroup.position.y = 0.02;
        this.bodyRoot.rotation.set(Math.PI / 2, 0, 0);
        if (this.wakeMesh) this.wakeMesh.material.opacity = 0.35;
      }
      return;
    }

    if (this.state === "SWIMMING") {
      const baseSpeed = racePlan.baseSpeed;
      this.progressZ += baseSpeed * delta;
      this.meshGroup.position.z = this.progressZ;
      this.meshGroup.position.y = 0.02 + Math.sin(this.swimTime * 2.2) * 0.025;

      // --- 자유형 애니메이션 키네마틱스 ---
      const strokeCycle = (this.swimTime * baseSpeed * 2.8) % (Math.PI * 2);

      // 1. 양팔 하이 엘보 자유형 (서로 180도 위상차)
      this.animateFreestyleArm(this.arms.left, strokeCycle);
      this.animateFreestyleArm(this.arms.right, strokeCycle + Math.PI);

      // 2. 다리 채찍 플러터 킥 (Flutter Kick)
      const kickFreq = this.swimTime * baseSpeed * 5.8;
      const kickL = Math.sin(kickFreq);
      const kickR = Math.sin(kickFreq + Math.PI);

      this.legs.left.hip.rotation.x = kickL * 0.28;
      this.legs.left.knee.rotation.x = Math.max(0, -kickL * 0.45); // 뒤로 찰 때 무릎 굽힘
      this.legs.right.hip.rotation.x = kickR * 0.28;
      this.legs.right.knee.rotation.x = Math.max(0, -kickR * 0.45);

      // 3. 흉곽 롤링 (Body Roll: 좌우 30도)
      const roll = Math.sin(strokeCycle) * 0.38;
      this.bodyRoot.rotation.z = roll;

      // 4. 호흡 시 머리 회전 (Head Breathing Turn)
      if (roll > 0.2) {
        this.headGroup.rotation.y = 0.85; // 오른쪽으로 숨쉬기
      } else if (roll < -0.2) {
        this.headGroup.rotation.y = -0.85;
      } else {
        this.headGroup.rotation.y = 0; // 정면 바닥 보기
      }

      this.updateSplash(delta);

      if (this.progressZ >= 50.0) {
        this.state = "FINISHED";
        this.progressZ = 50.0;
        this.meshGroup.position.z = 50.0;
        this.meshGroup.position.y = 0.12;
        this.bodyRoot.rotation.set(0.4, 0, 0); // 터치패드 잡고 호흡
        this.arms.left.shoulder.rotation.set(-1.1, 0, 0);
        this.arms.right.shoulder.rotation.set(0.4, 0, 0);
      }
      return;
    }

    if (this.state === "INCIDENT") {
      this.incidentTimer += delta;
      const type = this.incident.id;
      const incidentDuration = this.incident.duration || 5.0;

      // 돌발 시간 경과 후 -> 리커버리하여 결승선(50m)으로 수영 재개!
      if (this.incidentTimer >= incidentDuration && !racePlan.recovered) {
        racePlan.recovered = true;
        this.hideEmoji();
        // 유턴했던 경우 방향 다시 원상복구
        this.meshGroup.rotation.y = 0;
        this.meshGroup.position.x = this.laneX;
        this.bodyRoot.rotation.set(Math.PI / 2, 0, 0);
      }

      // 리커버리 된 후에는 결승선을 향해 수영!
      if (racePlan.recovered) {
        const recoverSpeed = racePlan.recoverSpeed || 1.8;
        this.progressZ += recoverSpeed * delta;
        this.meshGroup.position.z = this.progressZ;
        this.meshGroup.position.y = 0.02 + Math.sin(this.swimTime * 2.0) * 0.02;

        const stroke = this.swimTime * recoverSpeed * 2.8;
        this.animateFreestyleArm(this.arms.left, stroke);
        this.animateFreestyleArm(this.arms.right, stroke + Math.PI);
        this.updateSplash(delta);

        // 결승선(50m) 골인 체크
        if (this.progressZ >= 50.0) {
          this.state = "FINISHED";
          this.progressZ = 50.0;
          this.meshGroup.position.z = 50.0;
          this.meshGroup.position.y = 0.12;
          this.bodyRoot.rotation.set(0.4, 0, 0);
          this.arms.left.shoulder.rotation.set(-1.1, 0, 0);
          this.arms.right.shoulder.rotation.set(0.4, 0, 0);
        }
        return;
      }

      switch (type) {
        case "ROPE_REST": {
          // 로프 쪽(X 방향)으로 이동하여 두 손으로 부표 잡고 헐떡임
          const targetX = this.laneX + 1.18;
          this.meshGroup.position.x = THREE.MathUtils.lerp(this.meshGroup.position.x, targetX, delta * 3.5);
          this.meshGroup.position.y = 0.25 + Math.sin(this.incidentTimer * 3.5) * 0.04;
          this.bodyRoot.rotation.set(0.35, 0, 0.45);

          // 두 손으로 로프 꽉 쥐기
          this.arms.left.shoulder.rotation.set(-1.3, 0, 0.6);
          this.arms.left.elbow.rotation.set(0.8, 0, 0);
          this.arms.right.shoulder.rotation.set(-1.1, 0, 0.3);
          this.arms.right.elbow.rotation.set(0.7, 0, 0);
          break;
        }

        case "U_TURN": {
          // 180도 회전 후 출발점 향해 역주행
          this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, Math.PI, delta * 4.5);
          this.progressZ -= delta * 1.6;
          this.meshGroup.position.z = this.progressZ;

          const stroke = this.swimTime * 7;
          this.animateFreestyleArm(this.arms.left, stroke);
          this.animateFreestyleArm(this.arms.right, stroke + Math.PI);
          this.updateSplash(delta);
          break;
        }

        case "SLOW_DOWN": {
          this.progressZ += delta * 0.32;
          this.meshGroup.position.z = this.progressZ;
          this.meshGroup.position.y = -0.06;
          this.bodyRoot.rotation.set(Math.PI / 2.2, 0, 0);

          const slowStroke = this.swimTime * 1.4;
          this.animateFreestyleArm(this.arms.left, slowStroke);
          this.animateFreestyleArm(this.arms.right, slowStroke + Math.PI);
          break;
        }

        case "CRAMP": {
          // 다리 쥐남: 배영으로 뒤집어져 종아리 부여잡고 뱅글뱅글 회전
          this.meshGroup.position.y = 0.16;
          this.bodyRoot.rotation.set(-Math.PI / 2.1, 0, 0);
          this.meshGroup.rotation.y += delta * 2.2;

          this.arms.left.shoulder.rotation.set(-0.4, 0, 0);
          this.arms.right.shoulder.rotation.set(0.8, 0, 0.3);
          this.arms.right.elbow.rotation.set(1.4, 0, 0); // 다리 쪽으로 손 뻗음
          this.legs.right.hip.rotation.set(1.2, 0, 0);   // 다리 쥐남
          this.legs.right.knee.rotation.set(-0.8, 0, 0);
          break;
        }

        case "GOGGLES_LOST": {
          this.meshGroup.position.y = 0.28;
          this.bodyRoot.rotation.set(0.4, 0, 0);
          this.headGroup.rotation.set(0.2, Math.sin(this.incidentTimer * 5) * 0.5, 0);
          this.arms.left.shoulder.rotation.set(-0.7 + Math.sin(this.incidentTimer * 5) * 0.3, 0, 0);
          this.arms.right.shoulder.rotation.set(-0.7 - Math.sin(this.incidentTimer * 5) * 0.3, 0, 0);
          break;
        }

        case "EARLY_CELEBRATION": {
          this.meshGroup.position.y = 0.38;
          this.bodyRoot.rotation.set(0.15, 0, 0);
          this.arms.left.shoulder.rotation.set(-Math.PI * 0.88, 0, -0.4 + Math.sin(this.incidentTimer * 6) * 0.25);
          this.arms.right.shoulder.rotation.set(-Math.PI * 0.88, 0, 0.4 - Math.sin(this.incidentTimer * 6) * 0.25);
          this.headGroup.rotation.set(-0.35, Math.sin(this.incidentTimer * 3) * 0.6, 0);
          break;
        }

        case "BELLY_FLOP": {
          this.meshGroup.position.y = -0.06 + Math.sin(this.incidentTimer) * 0.02;
          this.bodyRoot.rotation.set(Math.PI / 2, 0, 0);
          this.arms.left.shoulder.rotation.set(0.3, 0, 1.3);
          this.arms.right.shoulder.rotation.set(0.3, 0, -1.3);
          break;
        }
      }
    }
  }

  // 실제 자유형 하이 엘보 (High-Elbow) 스트로크 키네마틱스
  animateFreestyleArm(arm, phase) {
    const p = phase % (Math.PI * 2);

    if (p < Math.PI) {
      // 1. 물속 당기기 (Pull & Push Phase : 0 ~ PI)
      const t = p / Math.PI;
      // 어깨 회전: 앞에서 뒤로 물을 저음
      arm.shoulder.rotation.x = -Math.PI * 0.85 + t * Math.PI * 1.5;
      arm.shoulder.rotation.z = Math.sin(t * Math.PI) * 0.2;
      // 팔꿈치: 물속 캐치 시 약간 굽힘
      arm.elbow.rotation.x = Math.sin(t * Math.PI) * 0.55;
    } else {
      // 2. 물 밖 회복 (High-Elbow Recovery Phase : PI ~ 2PI)
      const t = (p - Math.PI) / Math.PI;
      // 어깨가 위로 돌면서 앞으로 넘어옴
      arm.shoulder.rotation.x = Math.PI * 0.65 - t * Math.PI * 1.5;
      arm.shoulder.rotation.z = Math.sin(t * Math.PI) * 0.4;
      // 팔꿈치가 높이 들리며 90도 굽힘 (하이 엘보!)
      arm.elbow.rotation.x = Math.sin(t * Math.PI) * 1.35;
    }
  }

  // 물보라 파티클 업데이트
  updateSplash(delta) {
    if (!this.sprayParticles) return;
    const pos = this.sprayParticles.geometry.attributes.position.array;
    const vels = this.sprayVelocities;

    for (let i = 0; i < vels.length; i++) {
      const idx = i * 3;
      pos[idx] += vels[i].x * delta;
      pos[idx + 1] += vels[i].y * delta;
      pos[idx + 2] += vels[i].z * delta;

      vels[i].y -= 9.8 * delta * 0.5; // 중력

      if (pos[idx + 1] < -0.2 || pos[idx + 2] < -2.2) {
        pos[idx] = (Math.random() - 0.5) * 0.6;
        pos[idx + 1] = 0.05;
        pos[idx + 2] = -0.2;
        vels[i].y = Math.random() * 0.9 + 0.3;
      }
    }
    this.sprayParticles.geometry.attributes.position.needsUpdate = true;
  }
}
