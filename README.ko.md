# Claude Code Statusline

> [English](./README.md) · 한국어 (현재)

Claude Code 터미널 하단에 **컨텍스트 사용량**과 **5시간 세션 사용량**을 바 + 퍼센트 + 리셋 시간으로 표시합니다.

![Demo](./demo.png)

색상 임계값 (컨텍스트/세션 공통):
- `<50%` 파랑 (쾌적) / `<65%` 초록 / `<80%` 주황 / `≥80%` 빨강

---

## 왜 만들었나

Claude Code를 많이 쓰면서 반복되는 불편함이 있었어요.

**1. Context 사용량 상시 노출**

토큰 많이 쓰거나 프로그램 만들다 보면, 갑자기 모델이 멍청해지는 순간이 옵니다. 여러 해결책이 있지만 그 중 하나가 context 관리예요. `/compact`로 압축하거나, 특정 md 파일에 상태를 저장하고 세션을 새로 시작해서 이어가거나, `/clear`로 비우고 진행합니다.

그러려면 현재 context가 얼만큼 찼는지 수시로 체크해야 하는데, 기본 indicator는 특정 임계값에서만 CLI 하단에 작게 뜨다 보니 매번 `/context` 명령어로 확인하는 게 불편했습니다. 그래서 프롬프트 하단에 **상시** 띄웠습니다.

**2. 세션 토큰 사용량**

같은 맥락으로, 5시간 토큰 한도가 생각보다 빨리 찹니다. 듀얼 모니터 한쪽에 Claude Desktop 앱 켜두고 사용량 탭 수시로 확인하는 게 불편했어요. `/usage` 명령어도 있지만 역시 항시 떠 있는 게 아니라 그때그때 확인해야 합니다. 그래서 이것도 프롬프트 하단에 상시 띄웠습니다.

**3. 세션 리셋 시간**

옆에 같이 띄웠습니다. 시계 보고 암산할 필요 없이.

임계값에 따라 색상이 달라져서, 곁눈질로도 상태 파악이 됩니다.

---

## 요구사항

- macOS 또는 Linux
- Claude Code v2.1.x 이상
- Node.js 14 이상 (Claude Code가 이미 요구하는 버전이라 별도 설치 불필요)

외부 서버 호출이나 파일 I/O 없음. 단일 JS 파일이고 Node 빌트인 `path` 모듈 하나만 사용합니다.

---

## 설치 (Claude Code 에이전트에게 맡기는 방법)

1. 이 폴더(`statusline.js` + `README.md` 들어있는 폴더)를 본인 노트북 아무 데나 풀어두세요.
2. Claude Code를 실행하고 그 폴더로 `cd`하세요.
3. 아래 문장을 Claude Code에 그대로 붙여넣으세요:

```
이 폴더의 README.md에 나와있는 "수동 설치" 단계를 내 노트북에서 그대로 실행해줘. 끝나면 Claude Code를 재시작하라고 알려줘.
```

Claude Code가 README를 읽고 알아서 아래 **수동 설치** 절차를 수행합니다.

---

## 수동 설치 (직접 실행하는 방법)

### 1. 스크립트를 홈 디렉토리에 복사

현재 폴더에서:

```bash
mkdir -p ~/.claude
cp statusline.js ~/.claude/statusline.js
chmod +x ~/.claude/statusline.js
```

### 2. Claude Code 설정 파일 위치 확인

Claude Code는 `CLAUDE_CONFIG_DIR` 환경변수가 설정되어 있으면 그 경로를, 아니면 `~/.claude`를 씁니다. 아래 한 줄로 본인 환경의 설정 파일 경로를 확인하세요:

```bash
echo "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json"
```

출력된 경로 예시:
- `/Users/alice/.claude/settings.json` ← 기본
- `/Users/alice/.claude-something/settings.json` ← `CLAUDE_CONFIG_DIR`을 쓰는 경우

### 3. settings.json 에 statusLine 블록 추가

위에서 확인한 파일을 열어, JSON 루트 레벨에 다음 블록을 추가하세요:

```json
"statusLine": {
  "type": "command",
  "command": "node \"$HOME/.claude/statusline.js\""
}
```

파일이 없거나 비어있다면 전체를 이렇게 만드세요:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"$HOME/.claude/statusline.js\""
  }
}
```

이미 다른 설정이 있다면 `statusLine` 키만 추가(또는 교체)하세요. 예:

```json
{
  "model": "opus",
  "statusLine": {
    "type": "command",
    "command": "node \"$HOME/.claude/statusline.js\""
  }
}
```

`jq`가 설치돼 있으면 한 줄로 병합 가능:

```bash
SETTINGS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json"
mkdir -p "$(dirname "$SETTINGS")"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"
TMP=$(mktemp) && jq '.statusLine = {type:"command", command:"node \"$HOME/.claude/statusline.js\""}' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"
```

### 4. Claude Code 재시작

완전히 종료(Cmd+Q) 후 다시 실행. 화면 하단에 statusline이 나타나야 합니다.

---

## 동작 확인

아래 명령으로 스크립트가 정상 동작하는지 즉시 테스트할 수 있습니다:

```bash
echo '{"model":{"display_name":"Opus 4.7"},"workspace":{"current_dir":"/tmp/demo"},"context_window":{"remaining_percentage":80},"rate_limits":{"five_hour":{"used_percentage":35,"resets_at":1776873600}}}' \
  | node ~/.claude/statusline.js
echo
```

이런 한 줄이 나오면 정상:

```
Opus 4.7 │ demo | <YOUR_USERNAME>'s context  ██░░░░░░░░ 24%  │  session  ███░░░░░░░ 35% · resets 1:00am
```

---

## 제거

1. 스크립트 삭제:

   ```bash
   rm ~/.claude/statusline.js
   ```

2. settings.json 에서 `statusLine` 키 제거:

   ```bash
   SETTINGS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json"
   TMP=$(mktemp) && jq 'del(.statusLine)' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"
   ```

3. Claude Code 재시작.

---

## 문제 해결

**Q. 재시작했는데 statusline이 안 보여요.**

1. 어느 설정 파일을 쓰는지 다시 확인:
   ```bash
   echo "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json"
   ```
2. 그 파일에 `statusLine` 블록이 실제로 들어갔는지 확인 (다른 파일 편집했을 수 있음).
3. 스크립트가 단독으로 돌아가는지 확인:
   ```bash
   echo '{"model":{"display_name":"test"}}' | node ~/.claude/statusline.js
   ```

**Q. 세션 블록(`│ session ... · resets ...`)이 안 보여요.**

Claude Code 구버전은 `rate_limits` 필드를 statusline에 넘겨주지 않습니다. v2.1.x 이상으로 업데이트하세요. 구버전이어도 컨텍스트 블록은 정상 동작합니다.

**Q. 색상이 이상하거나 글자가 깨져요.**

터미널이 UTF-8 + ANSI 256-color를 지원해야 합니다. macOS 기본 Terminal.app, iTerm2, VSCode 내장 터미널 모두 OK.

---

## 파일 구성

- `statusline.js` — 실제 Node.js 스크립트 (약 90줄)
- `README.md` — 이 문서

외부 의존성, 네트워크 호출, 설치 스크립트 없음. 스크립트 내용은 직접 열어봐서 확인하셔도 됩니다.
