# CASE FILES

과학과 공학의 전환점이 된 사건을 현장 기록, 실험, 계산으로 다시 조사하는 브라우저 게임입니다.
빌드 도구와 서버가 없습니다. 이 폴더를 그대로 GitHub Pages에 올리면 동작합니다.

## 수록 사건

| 사건 | 내용 | 다루는 개념 |
|---|---|---|
| 01 연소의 저울 (1774) | 밀폐 레토르트, 수은 종, 수은회 환원 실험으로 플로지스톤설과 공기결합설을 가른다 | 질량수지, 이상기체 보정, 가설을 가르는 증거 |
| 02 공기에서 빵을 (1913) | 1909년 탁상 실험에서 출발해 촉매, 고압 용기, 순환 루프를 설계한다 | 화학평형, 반응속도, 단열 다단 반응기, 순환·퍼지, 수소 침해 |

## GitHub Pages로 올리는 법 (웹 화면만 사용)

1. GitHub에서 새 저장소를 만든다.
2. `Add file` → `Upload files`로 이 폴더의 **내용물**(index.html, css, js, lib, tests, README.md)을 끌어다 놓고 커밋한다. 파일이 100개 미만이라 한 번에 올라간다.
3. `Settings` → `Pages` → Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 두고 저장한다.
4. 1~2분 뒤 `https://<아이디>.github.io/<저장소>/`에서 열린다.

로컬에서 보려면 폴더에서 `python3 -m http.server 8000` 후 `http://localhost:8000`을 연다.
(ES 모듈을 쓰므로 `index.html`을 파일로 직접 열면 동작하지 않는다.)

## 주소 옵션

- `?case=lavoisier` / `?case=haber` : 사건으로 바로 진입
- `?q=low` / `?q=high` : 그래픽 품질 (낮음은 블룸과 안티앨리어싱을 끈다)

## 구조

```
index.html          import map, 캔버스, UI 레이어
css/style.css       전체 UI
js/engine.js        렌더러(PBR, 그림자, 블룸, 색보정), 카메라 이동, 3D 라벨, 선택
js/runner.js        단계 진행, 실험 노트, 점수·등급
js/ui.js            DOM 도우미, 슬라이더, 선택지, SVG 차트
js/quiz.js          숫자·선택형 문항 묶음
js/store.js         localStorage (진행 기록)
js/sim/chem.js      하버–보슈 모델: 평형, 속도, 다단 단열 반응기, 순환 루프, 재료 판정
js/sim/lavoisier.js 라부아지에 모델: 밀폐 레토르트, 수은 종, HgO 분해
js/scenes/          절차적 3D 장면과 텍스처 (외부 이미지 없음)
js/cases/           사건별 단계 정의
lib/                three.js r160 (MIT)와 필요한 애드온
tests/              node로 실행하는 모델 검증
```

## 새 사건 추가하기

1. `js/cases/<id>.js`에 사건 모듈을 만든다. `{ id, no, year, title, blurb, tags, accent, viewButtons, createScene(engine), steps[] }`.
2. 각 단계는 `{ id, label, title, sub, gate, view, mount(ctx) }`이다. `ctx.ready(true)`를 부르면 다음 단계가 열리고, `ctx.score(키, 0~1, 가중치, 이름)`으로 점수를 쌓고, `ctx.notebook.add(...)`로 실험 노트에 기록한다.
3. 3D 장면은 `{ scene, camera, views, update, api, attachLabels }`를 돌려주는 함수로 만든다.
4. `js/main.js`의 사건 목록에 추가하고, `css/style.css`에 `body[data-case="<id>"]`의 강조색을 넣는다.

## 검증

```
node tests/chem.test.mjs        # 평형 문헌값, 질량·에너지 수지, 순환 수렴, 재료 판정 등 27개
node tests/lavoisier.test.mjs   # 질량 보존, 기체 보정, 파열 조건 등
```

## 모델의 한계

- 두 사건 모두 **교육용 재구성**이다. 실제 실험·공장의 수치가 아니다.
- 하버–보슈: 이상기체, 평형 상수의 문헌식 근사(25~600 °C에서 문헌 표와 약 ±12% 이내), 템킨–피제프 형태의 조정한 속도식, 단열 촉매층과 층간 냉각, 분리기는 암모니아 증기압으로 계산한다. 수소 침해 한계는 Nelson 곡선의 경향을 단순화했다. "하루 30톤"은 게임이 정한 목표이며 오파우의 실제 값이 아니다.
- 라부아지에: 이상기체와 단순 지수 속도식. 장비 정밀도는 현대적 값(저울 0.01 g)으로 두었다. 실험 순서와 논증의 구조를 재구성한 것이다.
- 역사 서술은 요약이다. 인용문처럼 보이는 것은 모두 원문이 아닌 요약이다.

## 라이선스

게임 코드: 원하는 라이선스를 정해서 `LICENSE` 파일을 추가하세요. three.js는 `lib/THREE_LICENSE.txt`(MIT)를 따릅니다.
