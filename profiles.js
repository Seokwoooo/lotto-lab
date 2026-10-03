/** Playful labels based on this experiment's actual outcome, not personality scores. */
const profiles = {
  ZERO: { title: '완벽한\n비껴가기형', color: '#ece9ff', friend: '한 끗 수집가', description: '당첨번호와 거리 두기를 너무 잘했어요. 마지막 영수증에는 맞은 숫자가 하나도 없었습니다. 남들 다 동그라미 칠 때 혼자 깨끗한 영수증을 지키는, 보기 드문 회피의 달인.', lines: ['당첨번호와 철저하게 거리 두기.', '스쳐 지나간 숫자도 없었다.', '번호들의 단체 숨바꼭질.', '이번 회차는 관객석에서 봤습니다.', '이 정도면 피하기도 재능?', '빈손이어도 영수증은 남는다.'] },
  WARM: { title: '오늘은\n예열 중', color: '#ffe9cf', friend: '소소한 행운 수집가', description: '운에 시동은 걸었는데 아직 주차장이네요. 마지막 회차에서는 한 줄에 최대 한 개만 맞혔어요. 오늘의 행운은 대기 중, 영수증부터 소중히 모셔두세요.', lines: ['숫자 하나랑은 눈이 마주쳤다.', '운도 시동 거는 시간이 필요해.', '엔진은 켰는데, 아직 출발 전.', '오늘의 하이라이트: 한 숫자.', '복권과 어색한 첫인사를 나눴다.', '설렘은 잔뜩, 당첨은 다음에.'] },
  EDGE: { title: '꽤 대단할지도...?\n모르는 사람', color: '#e4edff', friend: '운수 좋은 날의 사나이', description: '두 개에 보너스까지 왔는데 당첨 문은 안 열렸어요. 보너스가 세 번째 숫자를 대신해주지는 못하거든요. 누가 봐도 뭔가 있어 보이는데, 정작 당첨금은 없는 신비한 영수증.', lines: ['보너스까지 왔는데, 문이 안 열렸다.', '분명 뭔가 있긴 있는데…?', '당첨 같은 분위기만 가져갔다.', '로또가 나를 알아본 것 같기도.', '숫자는 친한데 등수는 안 친함.', '내가 봐도 좀 아까운 조합.'] },
  NEAR: { title: '한 끗\n수집가', color: '#fff0b9', friend: '본전 지킴이', description: '두 개 맞은 줄이 여러 개. 맞은 숫자끼리 합치면 당첨인데 왜 따로 사는 걸까요. 세 번째 숫자만 쏙 빠지는 바람에 영수증을 몇 번이고 다시 보게 됩니다.', lines: ['두 개, 또 두 개. 세 번째는 어디에?', '가까운 줄만 잔뜩 수집했다.', '딱 하나씩 모자라는 미스터리.', '아쉬움도 모으면 한 장쯤 될까요.', '맞은 숫자를 합치면 안 되나요?', '영수증을 세 번 확인하는 사람.'] },
  NORM: { title: '평범한\n로또인', color: '#ffe449', friend: '진짜 행운아', description: '상상 속 퇴사 메일을 조용히 닫았어요. 오늘은 당첨이 없었지만 적어도 실제 지갑은 멀쩡합니다. 내일도 일단 출근, 다음 가상 추첨은 또 다른 이야기.', lines: ['영수증은 길고, 당첨금은 짧았다.', '상상 속 퇴사는 다음 회차로.', '번호 확인할 때만 잠깐 부자였다.', '이번에도 일단 출근합니다.', '꿈은 크게, 실제 지출은 0원.', '평범함도 이 정도면 정체성.'] },
  SYNC: { title: '확신의\n한 번호파', color: '#d6f1e8', friend: '한 끗 수집가', description: '모든 줄에 같은 번호를 적었더니 같이 웃었습니다. 오늘만큼은 내 번호가 맞았네요. 다만 같은 번호를 여러 장 산다고 당첨 확률까지 늘어나는 건 아니에요.', lines: ['한 번호에 모두가 같이 웃었다.', '같은 운명, 여러 줄의 영수증.', '흩어지지 않고 한곳에 모인 행운.', '번호는 하나, 기쁨은 여러 게임.', '오늘만큼은 내 번호가 정답.', '한 줄을 고집한 보람이 있었다.'] },
  BACK: { title: '본전\n지킴이', color: '#ddf2cf', friend: '소소한 행운 수집가', description: '쓴 만큼 딱 돌아왔어요. 큰 한 방도, 가상 지갑의 상처도 없는 깔끔한 결산. 오늘의 수익은 본전과 영수증 한 장, 그리고 조금의 짜릿함.', lines: ['쓴 만큼 딱 돌아왔다.', '오늘의 수익: 경험과 영수증.', '손익계산서가 예쁘게 0.', '호기심을 돌려받은 기분.', '본전도 이렇게 보면 꽤 짜릿해.', '가상 지갑을 철통 방어했다.'] },
  GAIN: { title: '은근히\n실속파', color: '#d7f1e4', friend: '운수 좋은 날의 사나이', description: '큰 한 방 없이 오천 원들이 열심히 팀플레이를 했어요. 5등이 쌓여 가상 구매 비용을 넘겼습니다. 조용히 계산기를 두드리다 혼자 웃는 실속 있는 하루.', lines: ['큰 한 방 없이도, 오늘은 흑자.', '소소한 줄 알았는데 합치니 쏠쏠.', '티 안 나게 잘되는 타입.', '오천 원들이 열심히 일했다.', '작은 행운의 팀플레이.', '영수증 끝에서 조용히 웃었다.'] },
  COLL: { title: '작은 행운\n모으는 사람', color: '#f8e1ed', friend: '본전 지킴이', description: '영수증에 동그라미가 하나씩 늘어나는 맛을 아는 타입. 작은 당첨은 여러 번 왔지만 가상 지갑을 다 채우지는 못했어요. 그래도 “나 당첨됐어”는 당당히 말할 수 있습니다.', lines: ['한 번만 웃고 끝내긴 아쉬웠다.', '작은 당첨을 차곡차곡.', '오천 원짜리 기쁨이 여러 번.', '영수증에 동그라미가 늘었다.', '큰 행운 대신 작은 행운 여러 개.', '당첨 확인 버튼을 다시 누르는 맛.'] },
  MINI: { title: '소소한 행운\n수집가', color: '#e8f4d9', friend: '평범한 로또인', description: '커피값은 건졌는데 퇴사 메일을 쓰기엔 조금 부족하네요. 꽝이라고 하기엔 억울한, 작고 소중한 5등. 오늘은 이 동그라미 세 개를 자랑해도 됩니다.', lines: ['퇴사는 못 해도, 당첨은 했다.', '작지만 확실한 동그라미 세 개.', '이 영수증, 완전 빈손은 아니다.', '상상 속 커피값은 생겼다.', '무심히 확인했는데 5등.', '이것도 당첨은 당첨이다.'] },
  PEAK: { title: '운은 좋았는데\n지갑은 울어요', color: '#e0ebff', friend: '은근히 실속파', description: '4등이라 신났는데 계산기를 두드리니 가상 지갑은 마이너스. 운은 분명 좋았어요. 오늘의 명언은 “당첨과 흑자는 다르다”, 영수증이 몸소 알려줬습니다.', lines: ['좋은 등수, 길어진 영수증.', '당첨은 반가웠고 계산은 냉정했다.', '많이 돌리면 비용도 같이 돈다.', '최고 기록과 결산은 따로 확인.', '성적표는 좋지만 지갑은 다른 얘기.', '행운과 가성비 사이에서.'] },
  GOOD: { title: '오… 운수 좋은 날의\n사나이', color: '#cfeee7', friend: '꽤 대단할지도...? 모르는 사람', description: '네 개가 맞는 순간 영수증을 대하는 태도가 달라졌어요. 4등으로 가상 구매 비용 이상을 회수했습니다. 버리려던 종이가 갑자기 소장품이 되는 날.', lines: ['잠깐, 네 개나 맞았다고?', '오늘 영수증은 버리기 아깝다.', '숫자 네 개가 분위기를 바꿨다.', '나 오늘 좀 괜찮은데?', '확인하고 한 번 더 확인했다.', '이 정도면 친구에게 보여줘야지.'] },
  RARE: { title: '운 좋은 줄은 알았는데\n이 정도일 줄이야', color: '#ecdfff', friend: '평범한 로또인', description: '다섯 개를 맞혔어요. “어?” 하다가 캡처부터 하게 되는 3등입니다. 마지막 숫자 하나가 자꾸 눈에 밟히지만, 이미 친구에게 보여줄 만한 큰 장면을 만났어요.', lines: ['다섯 개에서 화면을 멈췄다.', '이건 캡처부터 해야 해.', '평소의 나와는 다른 영수증.', '한 숫자가 더 왔다면…!', '기대 안 했을 때 찾아온 큰 숫자.', '친구의 “진짜?”를 부르는 결과.'] },
  EPIC: { title: '로또 세계관\n주인공', color: '#ffd7df', friend: '한 끗 수집가', description: '다섯 개와 보너스, 2등. 마지막 공이 진짜 보너스 역할을 했네요. 이 정도면 오늘의 서사는 완성입니다. 영수증을 보는 친구의 첫 반응은 아마 “진짜?”', lines: ['보너스가 진짜 보너스였다.', '숫자 다섯 개, 그리고 결정적인 하나.', '이 영수증에는 서사가 있다.', '오늘의 주연은 일단 나.', '한 끗 차이로, 엄청난 결과.', '누가 봐도 자랑할 만한 장면.'] },
  LUCK: { title: '진짜\n행운아', color: '#ffe449', friend: '평범한 로또인', description: '여섯 숫자가 전부 내 편이었어요. 한 게임의 1등 확률 8,145,060분의 1을 이 가상 추첨에서 만났습니다. 오늘의 영수증은 액자 후보, 친구들에게 먼저 보여주세요.', lines: ['여섯 숫자가 전부 내 편이었다.', '1등을 여기서 만났다.', '오늘의 영수증은 액자 후보.', '누르면 나온다? 이번에는 진짜 나왔다.', '가상인데도 손이 떨리는 숫자.', '이 화면은 저장해도 됩니다.'] },
  ICON: { title: '한 번호로\n전설 찍은 사람', color: '#ffe449', friend: '확신의 한 번호파', description: '같은 번호를 쓴 모든 줄이 함께 1등입니다. 한 번의 조합이 영수증 전체를 바꿨네요. 같은 번호를 여러 장 사서 확률을 높인 건 아니지만, 이 장면은 오래 기억할 만해요.', lines: ['한 번호, 여러 줄의 1등.', '같은 운명이 전부 전설이 됐다.', '고정 번호의 상상 가능한 최고 장면.', '같은 번호를 택한 오늘의 결말.', '영수증 전체에 1등이 찍혔다.', '한 번의 조합이 여러 게임을 바꿨다.'] }
};

export const PROFILE_COUNT = Object.keys(profiles).length;

const characters = {
  ZERO: 'warm', WARM: 'warm', EDGE: 'office', NEAR: 'office', NORM: 'office',
  SYNC: 'clover', BACK: 'pink', GAIN: 'pink', COLL: 'clover', MINI: 'clover',
  PEAK: 'office', GOOD: 'pink', RARE: 'royal', EPIC: 'royal', LUCK: 'royal', ICON: 'royal'
};
const reactions = {
  ZERO: '번호들아, 나를 피하는 거니?', WARM: '시동은 걸었는데… 아직 주차장.',
  EDGE: '분위기는 당첨인데, 현실은 낙첨.', NEAR: '맞은 숫자 합치기, 왜 안 돼요?',
  NORM: '상상 속 퇴사, 취소합니다.', SYNC: '내 번호, 오늘은 네가 맞았다.',
  BACK: '가상 지갑 방어 성공.', GAIN: '작은 행운들이 팀플레이를 했다.',
  COLL: '오천 원짜리 기쁨, 여러 번.', MINI: '퇴사는 못 해도 커피는 가능.',
  PEAK: '등수는 웃고, 가상 지갑은 울고.', GOOD: '오늘은 영수증 버리지 마세요.',
  RARE: '잠깐. 이거 일단 캡처.', EPIC: '이 정도면 오늘의 주연은 나.',
  LUCK: '가상인데도 심장이 뛰네.', ICON: '영수증 전체가 레전드.'
};

export function getProfile(result) {
  const rank = result.best?.rank ?? 0;
  const wins = result.games - result.counts[0];
  const balance = result.prize - result.games * 1000;
  const tickets = result.last?.tickets ?? [];
  const closest = Math.max(0, ...tickets.map(t => t.matches));
  let code;
  if (rank === 1) code = result.config.mode === 'fixed' && result.config.tickets > 1 ? 'ICON' : 'LUCK';
  else if (rank === 2) code = 'EPIC';
  else if (rank === 3) code = 'RARE';
  else if (rank === 4) code = balance < 0 ? 'PEAK' : 'GOOD';
  else if (rank === 5) {
    if (result.config.mode === 'fixed' && result.config.tickets > 1) code = 'SYNC';
    else if (balance === 0) code = 'BACK';
    else if (balance > 0) code = 'GAIN';
    else code = wins > 1 ? 'COLL' : 'MINI';
  } else if (closest === 0) code = 'ZERO';
  else if (closest === 1) code = 'WARM';
  else if (tickets.some(t => t.matches === 2 && t.bonusMatch)) code = 'EDGE';
  else code = tickets.filter(t => t.matches === 2).length > 1 ? 'NEAR' : 'NORM';
  const profile = profiles[code];
  // A shared experiment always receives the same copy, including after reloading.
  const variant = parseInt(result.config.seed.slice(0, 8), 16) % profile.lines.length;
  return { ...profile, code, line: profile.lines[variant], rank, wins, balance, closest, character: characters[code], reaction: reactions[code], number: Object.keys(profiles).indexOf(code) + 1 };
}
