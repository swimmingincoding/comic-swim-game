/**
 * 8명의 수영 영자 데이터 및 프로필 정의
 * 10개 레인 중 1~8번 레인을 사용 (0번, 9번은 공백 레인)
 * 주의: 표기된 능력치(속도, 스태미나 등)는 유저의 심리를 자극하는 페이크 위장 스탯입니다.
 * 실제 경기 결과는 순수 랜덤 돌발 상황 엔진에 의해 끝날 때까지 결정되지 않습니다.
 */

export const SWIMMERS_DATA = [
  {
    lane: 1,
    name: "박춘삼",
    nickname: "새벽 약수터 전설",
    age: 74,
    gender: "male",
    type: "elder",
    country: "KOR",
    flag: "👴",
    bettorName: "철수", // 기본 예시 배터 이름
    quote: "내가 50년 전 한강 헤엄쳐 건너던 실력 아직 안 죽었다!",
    fakeStats: { speed: 68, stamina: 92, mental: 99 },
    odds: 4.8,
    visuals: {
      skinTone: 0xd8b596,
      suitColor: 0x1e3a8a,
      suitType: "briefs",
      capColor: 0x0284c7,
      hairColor: 0xcccccc,
      gogglesColor: 0x38bdf8,
      bodyScale: { x: 0.9, y: 0.92, z: 0.88 },
      accent: "silver_hair"
    }
  },
  {
    lane: 2,
    name: "이수민",
    nickname: "돌고래 요정",
    age: 23,
    gender: "female",
    type: "young",
    country: "KOR",
    flag: "🐬",
    bettorName: "영희",
    quote: "물과 하나 되는 우아한 스트로크를 보여드릴게요~",
    fakeStats: { speed: 85, stamina: 82, mental: 88 },
    odds: 3.2,
    visuals: {
      skinTone: 0xfde2d4,
      suitColor: 0xec4899,
      suitType: "onepiece",
      capColor: 0xf472b6,
      hairColor: 0x332211,
      gogglesColor: 0xfbcfe8,
      bodyScale: { x: 0.85, y: 0.95, z: 0.85 },
      accent: "flower_cap"
    }
  },
  {
    lane: 3,
    name: "마동철",
    nickname: "헬스장 3대 600",
    age: 34,
    gender: "male",
    type: "muscular",
    country: "KOR",
    flag: "💪",
    bettorName: "부장님",
    quote: "수영은 광배근과 삼각근의 파워로 밀어붙이는 것이다!",
    fakeStats: { speed: 94, stamina: 65, mental: 75 },
    odds: 3.6,
    visuals: {
      skinTone: 0xc89670,
      suitColor: 0x111827,
      suitType: "briefs",
      capColor: 0x000000,
      hairColor: 0x111111,
      gogglesColor: 0xeab308,
      bodyScale: { x: 1.25, y: 1.05, z: 1.2 },
      accent: "broad_shoulders"
    }
  },
  {
    lane: 4,
    name: "김태환",
    nickname: "국가대표 에이스",
    age: 21,
    gender: "male",
    type: "athlete",
    country: "KOR",
    flag: "🥇",
    bettorName: "민수",
    quote: "오늘 목표는 제 자신의 한국 신기록 경신뿐입니다.",
    fakeStats: { speed: 98, stamina: 95, mental: 96 },
    odds: 2.1,
    visuals: {
      skinTone: 0xeacbb3,
      suitColor: 0x0f172a,
      suitType: "jammer",
      capColor: 0xf59e0b,
      hairColor: 0x262626,
      gogglesColor: 0x10b981,
      bodyScale: { x: 1.0, y: 1.05, z: 0.98 },
      accent: "gold_stripes"
    }
  },
  {
    lane: 5,
    name: "최영자",
    nickname: "복덕방 아쿠아로빅",
    age: 67,
    gender: "female",
    type: "elder",
    country: "KOR",
    flag: "👵",
    bettorName: "과장님",
    quote: "어머 총각, 경기 끝나고 떡볶이 먹으러 갈 건데 같이 갈텨?",
    fakeStats: { speed: 72, stamina: 89, mental: 94 },
    odds: 5.2,
    visuals: {
      skinTone: 0xebd2bd,
      suitColor: 0x7c3aed,
      suitType: "onepiece",
      capColor: 0x9333ea,
      hairColor: 0x9ca3af,
      gogglesColor: 0xc084fc,
      bodyScale: { x: 0.98, y: 0.9, z: 1.02 },
      accent: "perm_hair"
    }
  },
  {
    lane: 6,
    name: "정민우",
    nickname: "유튜브 3일 독학",
    age: 27,
    gender: "male",
    type: "nerd",
    country: "KOR",
    flag: "🤓",
    bettorName: "김대리",
    quote: "유튜브 알고리즘이 알려준 완벽한 하이드로다이내믹스 폼!",
    fakeStats: { speed: 79, stamina: 70, mental: 60 },
    odds: 6.5,
    visuals: {
      skinTone: 0xf5ded0,
      suitColor: 0x06b6d4,
      suitType: "jammer",
      capColor: 0x14b8a6,
      hairColor: 0x3f3f46,
      gogglesColor: 0x000000,
      bodyScale: { x: 0.88, y: 0.98, z: 0.85 },
      accent: "glasses"
    }
  },
  {
    lane: 7,
    name: "강하나",
    nickname: "폭풍 발차기 여대생",
    age: 22,
    gender: "female",
    type: "athlete",
    country: "KOR",
    flag: "⚡",
    bettorName: "박팀장",
    quote: "제 킥판 발차기 속도는 쾌속정보다 빠르답니다!",
    fakeStats: { speed: 91, stamina: 86, mental: 84 },
    odds: 2.8,
    visuals: {
      skinTone: 0xecd6c5,
      suitColor: 0xdc2626,
      suitType: "onepiece",
      capColor: 0xef4444,
      hairColor: 0x171717,
      gogglesColor: 0xf87171,
      bodyScale: { x: 0.92, y: 1.02, z: 0.9 },
      accent: "red_racing"
    }
  },
  {
    lane: 8,
    name: "오필승",
    nickname: "해병대 특수수색대",
    age: 32,
    gender: "male",
    type: "soldier",
    country: "KOR",
    flag: "🎖️",
    bettorName: "막내",
    quote: "악으로 깡으로! 파도가 치든 말든 돌격이다!",
    fakeStats: { speed: 89, stamina: 94, mental: 98 },
    odds: 3.5,
    visuals: {
      skinTone: 0xba8059,
      suitColor: 0x15803d,
      suitType: "briefs",
      capColor: 0x166534,
      hairColor: 0x171717,
      gogglesColor: 0x84cc16,
      bodyScale: { x: 1.1, y: 1.02, z: 1.05 },
      accent: "camo"
    }
  }
];
