# 셀러AI (SellerAI)

스마트스토어·쿠팡 셀러를 위한 상품등록 AI 도우미. 상품명 후보, 검색 키워드, 상세 문구를 한 번에 생성합니다. (Phase 1 MVP)

## 실행 방법

```bash
npm install
```

프로젝트 루트에 `.env.local`을 만들고 값을 채웁니다 (`.env.example` 참고).

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=          # 비우면 claude-haiku-5-5
FREE_DAILY_LIMIT=5        # IP당 하루 무료 생성 횟수
```

```bash
npm run dev     # http://localhost:3000
npm run build   # 프로덕션 빌드
```

## Vercel 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. [Vercel](https://vercel.com)에서 **Add New → Project**로 저장소를 가져옵니다 (Next.js 자동 감지).
3. **Settings → Environment Variables**에 `ANTHROPIC_API_KEY`, (선택) `ANTHROPIC_MODEL`, `FREE_DAILY_LIMIT`을 등록합니다.
4. Deploy 후 발급된 URL로 접속합니다.

## 참고

- 일일 한도는 인메모리로 카운트하므로 서버리스 인스턴스 재시작·분리 시 초기화될 수 있습니다. Phase 2에서 DB로 이전 예정입니다.
- Anthropic 호출은 서버(`app/api/generate/route.ts`)에서만 이루어집니다.
