import { COMBINATIONS } from './core.js?v=11';

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
  ICON: { title: '한 번호로\n전설 찍은 사람', color: '#ffe449', friend: '확신의 한 번호파', description: '같은 번호를 쓴 모든 줄이 함께 1등입니다. 한 번의 조합이 영수증 전체를 바꿨네요. 같은 번호를 여러 장 사서 확률을 높인 건 아니지만, 이 장면은 오래 기억할 만해요.', lines: ['한 번호, 여러 줄의 1등.', '같은 운명이 전부 전설이 됐다.', '고정 번호의 상상 가능한 최고 장면.', '같은 번호를 택한 오늘의 결말.', '영수증 전체에 1등이 찍혔다.', '한 번의 조합이 여러 게임을 바꿨다.'] },
  DUBL: { title: '행운이\n재방문한 사람', color: '#dcecff', friend: '영수증 수집가', description: '3등을 보고 끝인 줄 알았는데, 다른 줄에서도 다섯 숫자가 맞았어요. 운이 문을 두 번 두드리는 느낌. 친구에게 “나 3등 됐어”라고 말한 다음, 당첨 게임 수도 슬쩍 덧붙여보세요. 좋은 등수와 가상 손익은 별개라 회수율도 함께 확인!', lines: ['행운: 아까 두고 간 게 있어서요.', '한 번으로 끝내긴 아쉬웠나 봐.', '첫 3등은 예고편이었다.', '운이 내 영수증을 다시 방문했다.', '“또?”가 나오는 당첨 내역.', '당첨 확인하고, 다시 당첨 확인.'] },
  TRIO: { title: '좋은 일이\n자꾸 겹치는 사람', color: '#f8dfe9', friend: '진짜 행운아', description: '다섯 개를 맞힌 줄이 차곡차곡 쌓였어요. 처음엔 놀랐고, 다음엔 웃었고, 이제는 당첨 내역을 세고 있습니다. 오늘의 재능은 좋은 장면을 여러 개 모으는 것. 마지막 숫자 하나에 대한 미련은 잠깐 접고, 이번 기록부터 자랑해도 돼요.', lines: ['이쯤 되면 당첨 내역에 형광펜.', '기쁜 일이 서로 겹쳤다.', '3등이 또 나오니 표정 관리 실패.', '당첨 내역을 세는 맛을 알아버림.', '캡처 한 장에 못 담는 작은 자랑.', '좋은 장면이 하나로 끝나지 않았다.'] },
  QUAD: { title: '이 정도면\n영수증 수집가', color: '#e5defa', friend: '행운이 재방문한 사람', description: '버릴 영수증보다 보관할 영수증에 눈이 갑니다. 3등 게임이 여러 줄이라 “최고 3등” 네 글자로는 조금 부족한 하루. 당첨 영수증을 넘겨보며 실제로 맞힌 다섯 숫자를 찾아보세요. 이 정도면 친구에게 결과창을 통째로 보내고 싶어집니다.', lines: ['버리지 마. 이것도 3등이야.', '오늘부터 영수증도 소장품.', '3등 찾다가 영수증 컬렉션 시작.', '맞힌 다섯 숫자를 여러 번 감상 중.', '친구야, 당첨 내역까지 봐줘.', '영수증 정리하다가 혼자 웃었다.'] },
  RUSH: { title: '오늘은\n내가 좀 되는 날', color: '#ffe8ce', friend: '평범한 로또인', description: '이번 자동 구매에서는 3등이 유난히 여러 줄에 들어왔어요. “나 오늘 좀 되는데?” 하고 어깨가 올라갈 만한 결과입니다. 물론 로또의 다음 추첨은 다시 새 확률로 시작해요. 오늘의 좋은 기록은 저장하고, 친구와 같은 금액으로 비교해보세요.', lines: ['오늘의 나, 평소보다 어깨가 높다.', '3등이 출석 체크하는 중.', '오늘은 숫자들이 꽤 협조적이었다.', '친구에게 “너도 해봐”가 절로 나온다.', '당첨 영수증에 자꾸 손이 간다.', '이 화면, 내 오늘의 자랑거리.'] },
  WAVE: { title: '친구야\n이 영수증 좀 봐', color: '#ffec9c', friend: '로또 세계관 주인공', description: '3등 게임들이 줄을 서서 등장했어요. 이번 구매 규모를 생각해도 다섯 숫자를 맞힌 줄이 눈에 띄게 많이 모였습니다. 1등의 여섯 숫자와는 다른 기록이지만, 당첨 내역 하나로 대화가 시작될 만한 날. “최고 3등” 뒤에 몇 게임인지 꼭 붙여서 자랑하세요.', lines: ['친구의 “진짜?”를 여러 번 듣는 날.', '영수증 넘길 때마다 자랑이 추가된다.', '이번 캡처는 당첨 횟수까지 담자.', '3등이 단체로 인사하러 왔다.', '하나였으면 우연, 이건 캡처.', '이 결과는 혼자 보기 아깝다.'] },
  ENCR: { title: '보너스가\n앵콜을 했다', color: '#ffd2e2', friend: '친구야 이 영수증 좀 봐', description: '다섯 숫자에 보너스까지 맞힌 2등이 여러 게임에서 나왔습니다. 마지막 공이 한 번의 하이라이트로 끝나지 않았네요. 1등과는 다르지만, 이미 충분히 큰 장면을 여러 개 만난 결과. 당첨 내역에서 각 2등 영수증을 찾아보세요.', lines: ['보너스 공, 한 번 더 부탁드립니다.', '2등도 앵콜이 가능한 거였어?', '큰 장면이 다시 재생됐다.', '다섯 숫자와 보너스가 또 만났다.', '오늘 당첨 내역, 주연이 여러 명.', '한 번 놀라고 끝낼 결과가 아니었다.'] },
  DRY4: { title: '운도 오늘은\n정시 퇴근', color: '#e5e8f1', friend: '오늘은 내가 좀 되는 날', description: '최고 기록은 4등인데, 산 게임 수에 비하면 네 숫자를 맞힌 줄이 뜸했어요. 운도 오늘은 야근을 안 하는 모양입니다. 큰 구매 금액이 큰 행운을 보장하진 않는다는 걸 영수증이 알려줬네요. 다행히 실험에 실제로 쓴 돈은 0원!', lines: ['운: 오늘은 여기까지 하겠습니다.', '많이 샀다고 많이 맞는 건 아니네.', '운도 오늘은 칼퇴를 했다.', '영수증은 길고, 하이라이트는 짧다.', '수고한 계산기에 박수 한 번.', '오늘의 행운은 짧게 근무했다.'] },
  BUSY: { title: '영수증은 바쁜데\n지갑은 조용함', color: '#d7efe8', friend: '본전 지킴이', description: '최고 등수는 4등이고, 네 숫자가 맞은 줄은 구매 규모에 비해 꽤 많이 모였어요. 영수증에 동그라미 치느라 바쁘지만 가상 손익은 아직 마이너스. 당첨 횟수와 수익이 같은 말은 아니라는 걸 가장 생생하게 보여주는 타입입니다.', lines: ['동그라미는 바쁜데 지갑은 조용함.', '당첨 소식과 결산표의 온도 차이.', '맞긴 많이 맞았는데 말이지.', '영수증의 성실함에 박수를.', '당첨 확인만큼은 할 일이 많았다.', '작은 기쁨은 풍년, 흑자는 다음에.'] }
};

export const PROFILE_COUNT = Object.keys(profiles).length;

const characters = {
  ZERO: 'warm', WARM: 'warm', EDGE: 'office', NEAR: 'office', NORM: 'office',
  SYNC: 'clover', BACK: 'pink', GAIN: 'pink', COLL: 'clover', MINI: 'clover',
  PEAK: 'office', GOOD: 'pink', RARE: 'royal', EPIC: 'royal', LUCK: 'royal', ICON: 'royal',
  DUBL: 'clover', TRIO: 'pink', QUAD: 'royal', RUSH: 'clover', WAVE: 'royal',
  ENCR: 'royal', DRY4: 'office', BUSY: 'clover'
};
const reactions = {
  ZERO: '번호들아, 나를 피하는 거니?', WARM: '시동은 걸었는데… 아직 주차장.',
  EDGE: '분위기는 당첨인데, 현실은 낙첨.', NEAR: '맞은 숫자 합치기, 왜 안 돼요?',
  NORM: '상상 속 퇴사, 취소합니다.', SYNC: '내 번호, 오늘은 네가 맞았다.',
  BACK: '가상 지갑 방어 성공.', GAIN: '작은 행운들이 팀플레이를 했다.',
  COLL: '오천 원짜리 기쁨, 여러 번.', MINI: '퇴사는 못 해도 커피는 가능.',
  PEAK: '등수는 웃고, 가상 지갑은 울고.', GOOD: '오늘은 영수증 버리지 마세요.',
  RARE: '잠깐. 이거 일단 캡처.', EPIC: '이 정도면 오늘의 주연은 나.',
  LUCK: '가상인데도 심장이 뛰네.', ICON: '영수증 전체가 레전드.',
  DUBL: '나 방금 당첨됐는데, 또?', TRIO: '좋은 일이 자꾸 겹치는 중.',
  QUAD: '영수증도 이제 수집 취미.', RUSH: '오늘은 내 어깨가 좀 높다.',
  WAVE: '친구야, 당첨 횟수까지 봐줘.', ENCR: '보너스 공도 앵콜을 한다.',
  DRY4: '운은 정시 퇴근, 나는 일단 출근.', BUSY: '동그라미 치느라 바쁜 하루.'
};

const integer = new Intl.NumberFormat('ko-KR');
const percent = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
const thirdStories = ['RARE', 'DUBL', 'TRIO', 'QUAD', 'RUSH', 'WAVE'];

export function getProfile(result) {
  const rank = result.best?.rank ?? 0;
  const wins = result.games - result.counts[0];
  const balance = result.prize - result.games * 1000;
  const recovery = result.games > 0 ? result.prize / (result.games * 1000) * 100 : 0;
  const tickets = result.last?.tickets ?? [];
  const closest = Math.max(0, ...tickets.map(t => t.matches));
  let code;
  if (rank === 1) code = result.config.mode === 'fixed' && result.config.tickets > 1 ? 'ICON' : 'LUCK';
  else if (rank === 2) code = result.config.mode === 'auto' && result.counts[2] > 1 ? 'ENCR' : 'EPIC';
  else if (rank === 3) {
    // Fixed copies share one outcome. Automatic runs up to 100,000 games use
    // 1 / 2 / 3 / 4 / 5 / 6+ wins; larger runs scale around their expected count
    // so the million-game limit doesn't collapse every result into WAVE.
    const expected = result.games * 228 / COMBINATIONS;
    const score = result.games > 100_000
      ? 100_000 * 228 / COMBINATIONS + (result.counts[3] - expected) / Math.sqrt(result.games / 100_000)
      : result.counts[3];
    const bucket = result.config.mode === 'fixed' ? 1 : Math.max(1, Math.min(6, Math.round(score)));
    code = thirdStories[bucket - 1];
  } else if (rank === 4) {
    code = balance < 0 ? 'PEAK' : 'GOOD';
    if (balance < 0 && result.config.mode === 'auto' && result.games >= 1000) {
      const expected = result.games * 11115 / COMBINATIONS;
      const spread = Math.sqrt(expected) * 0.5;
      if (result.counts[4] < expected - spread) code = 'DRY4';
      else if (result.counts[4] > expected + spread) code = 'BUSY';
    }
  }
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
  const basis = `${result.config.mode === 'fixed' ? '같은 번호 · ' : ''}${rank ? `최고 ${rank}등 · ${rank}등 ${integer.format(result.counts[rank])}게임` : '당첨 없음'} · 회수율 ${percent.format(recovery)}%`;
  return { ...profile, code, line: profile.lines[variant], rank, wins, balance, recovery, basis, closest, character: characters[code], reaction: reactions[code], number: Object.keys(profiles).indexOf(code) + 1 };
}
