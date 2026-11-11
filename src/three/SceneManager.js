import * as THREE from 'three';
import { PoolEnvironment } from './PoolEnvironment.js';
import { SwimmerModel } from './SwimmerModel.js';
import { SWIMMERS_DATA } from '../game/SwimmerData.js';

/**
 * Three.js 씬, 카메라, 렌더러 총괄 매니저
 */
export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = canvasContainer.clientWidth || window.innerWidth;
    this.height = canvasContainer.clientHeight || window.innerHeight;
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 950);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050c18); // 깊고 웅장한 올림픽 아레나 나이트
    this.scene.fog = new THREE.FogExp2(0x050c18, 0.0045);

    // 렌더러 (ACES Filmic Tone Mapping & High Quality Shadows)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25; // 눈부신 올림픽 경기장 라이팅
    this.container.appendChild(this.renderer.domElement);

    // 카메라
    this.camera = new THREE.PerspectiveCamera(48, this.width / this.height, 0.1, 300);
    this._targetPos = new THREE.Vector3();
    this._lookAtPos = new THREE.Vector3();

    // 카메라 모드: 'BROADCAST', 'MY_BET', 'OVERVIEW', 'FINISH_LINE'
    this.cameraMode = 'BROADCAST';
    this.betLane = 4; // 기본 추적 레인 (4번)

    // 수영장 환경
    this.pool = new PoolEnvironment(this.scene, this.isMobile);

    // 8명의 수영선수 생성 (레인 1~8)
    this.swimmers = [];
    SWIMMERS_DATA.forEach(data => {
      const laneX = this.pool.getLaneX(data.lane);
      const swimmer = new SwimmerModel(data, laneX, this.scene);
      this.swimmers.push(swimmer);
    });

    this.initCameraPositions();
    this.setupResize();
  }

  initCameraPositions() {
    this.cameraTarget = new THREE.Vector3(0, 0, 5);
    this.camera.position.set(16, 9, -5);
    this.camera.lookAt(this.cameraTarget);
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  setBetLane(lane) {
    this.betLane = lane;
  }

  // 돌발 상황 발생 시 해당 선수를 2.8초간 클로즈업 후 이전 카메라로 복귀
  focusSwimmerTemporarily(lane, duration = 2.8) {
    const prevMode = this.cameraMode;
    const prevLane = this.betLane;

    this.betLane = lane;
    this.setCameraMode('MY_BET');

    if (this.focusTimerId) clearTimeout(this.focusTimerId);
    this.focusTimerId = setTimeout(() => {
      if (this.cameraMode === 'MY_BET' && this.betLane === lane) {
        this.betLane = prevLane;
        this.setCameraMode(prevMode);
      }
    }, duration * 1000);
  }

  setIntroLane(lane) {
    this.introLane = lane;
    const introSwimmer = this.getSwimmerByLane(lane);
    if (introSwimmer) {
      const ix = introSwimmer.laneX;
      // 인트로 선수 전환 시 카메라 즉시 영웅 앵글로 점프 (출발대 통과 비행 방지)
      this.camera.position.set(ix + 1.35, 1.35, -0.7);
      this.cameraTarget.set(ix, 1.1, -4.5);
      this.camera.lookAt(this.cameraTarget);
    }
  }

  getSwimmerByLane(lane) {
    return this.swimmers.find(s => s.lane === lane);
  }

  updateCamera(delta, leaderSwimmer) {
    const leaderZ = leaderSwimmer ? leaderSwimmer.progressZ : 5;
    const targetPos = this._targetPos;
    const lookAtPos = this._lookAtPos;

    switch (this.cameraMode) {
      case 'INTRO': {
        // [올림픽 결승 선수 소개] 백스테이지에서 걸어 들어오는 선수를 정면 3/4 영웅 앵글로 부드럽게 추적
        const introSwimmer = this.getSwimmerByLane(this.introLane || 1);
        const ix = introSwimmer ? introSwimmer.laneX : 0;
        const sz = introSwimmer ? introSwimmer.meshGroup.position.z : -2.0;

        // 카메라를 스타트대 뒤쪽 데크(Z = -0.7)에 배치하여 스타트대 간섭 0%, 선수의 전신 및 얼굴을 드라마틱하게 조망
        targetPos.set(ix + 1.35, 1.35, -0.7);
        lookAtPos.set(ix, 1.1, sz);
        break;
      }

      case 'BROADCAST': {
        // 방송용 레일 트래킹 카메라: 선두 그룹의 옆(우측 상공)에서 부드럽게 함께 이동
        const camZ = THREE.MathUtils.clamp(leaderZ - 2, 0, 46);
        targetPos.set(15, 6.5, camZ);
        lookAtPos.set(-1, 0, leaderZ + 3);
        break;
      }

      case 'MY_BET': {
        // 유저가 배팅한 선수 밀착 추적 카메라
        const betSwimmer = this.getSwimmerByLane(this.betLane) || leaderSwimmer;
        const bz = betSwimmer ? betSwimmer.progressZ : 0;
        const bx = betSwimmer ? betSwimmer.meshGroup.position.x : 0;

        targetPos.set(bx, 2.8, bz - 5.5);
        lookAtPos.set(bx, 0.2, bz + 4.0);
        break;
      }

      case 'OVERVIEW': {
        // [완벽한 전경 와이드 뷰] 경기장 전체 50m 10개 레인을 45도 상공에서 시원하게 내려다보는 파노라마 조감도
        // 시야를 가리는 장애물 및 철제 프레임 0%, 물결과 영자 8명 전체의 레이스가 한눈에 조망됨
        targetPos.set(26.0, 22.0, 25.0);
        lookAtPos.set(-2.0, 0.0, 25.0);
        break;
      }

      case 'FINISH_LINE': {
        // [개선] 다이내믹 피니시 카메라:
        // - 경기 초중반(0~35m): 카메라를 높은 위치(Y=6.5, Z=56)에 배치하여 스타트대(0m)에서 출발해 나를 향해 쇄도해 오는 8인 전체를 정면으로 완벽 조망!
        // - 결승 직전(35~50m): 터치패드 눈높이(Y=2.2, Z=52.8)로 극적 줌인하여 터치패드 터치 순간을 클로즈업!
        const approachT = THREE.MathUtils.clamp((leaderZ - 20) / 30, 0, 1); // 20m~50m 구간 서서히 줌인
        const camY = THREE.MathUtils.lerp(6.5, 2.2, approachT);
        const camZ = THREE.MathUtils.lerp(56.5, 52.8, approachT);

        targetPos.set(0, camY, camZ);
        lookAtPos.set(0, 0.2, THREE.MathUtils.clamp(leaderZ, 0, 49.5));
        break;
      }
    }

    // 부드러운 카메라 전환 (LERP)
    this.camera.position.lerp(targetPos, delta * 3.5);
    this.cameraTarget.lerp(lookAtPos, delta * 4.0);
    this.camera.lookAt(this.cameraTarget);
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.width = this.container.clientWidth || window.innerWidth;
      this.height = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    });
  }

  render(time, delta, leaderSwimmer) {
    this.pool.update(time);
    this.updateCamera(delta, leaderSwimmer);
    this.renderer.render(this.scene, this.camera);
  }
}
