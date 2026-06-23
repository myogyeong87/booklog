# 나의 독서 기록 — 설정 가이드

GitHub → Vercel 호스팅, Firestore 저장, 구글 로그인 구조예요.
순서대로 따라 하면 약 15분이면 돼요.

---

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com → **프로젝트 추가**
2. 왼쪽 **빌드 → Authentication → 시작하기**
   → **Sign-in method** 탭에서 **Google** 사용 설정 (지원 이메일 선택 후 저장)
3. 왼쪽 **빌드 → Firestore Database → 데이터베이스 만들기**
   → 위치 선택(예: asia-northeast3 서울) → **프로덕션 모드**로 시작
4. Firestore의 **규칙(Rules)** 탭으로 가서, `firestore.rules` 파일 내용을
   그대로 붙여넣고 **게시(Publish)**

---

## 2. 웹 앱 설정값(config) 가져오기

1. 프로젝트 설정(⚙️ 아이콘) → **일반** 탭 맨 아래 **내 앱**
2. **</> (웹)** 아이콘으로 앱 추가 → 닉네임 입력 → 등록
3. 화면에 나오는 `firebaseConfig = { ... }` 객체를 복사
4. `index.html` 상단의 아래 부분을 복사한 값으로 **교체**

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",   // ← 여기를 본인 값으로
  ...
};
```

> 참고: 이 config의 apiKey는 **비밀키가 아니에요.** 브라우저에 노출돼도 안전하고,
> 실제 보안은 위에서 게시한 Firestore 규칙 + 로그인이 담당해요.

---

## 3. 승인된 도메인 추가 (로그인이 작동하려면 필수)

Authentication → **설정(Settings) → 승인된 도메인**에 다음을 추가:

- `localhost` (로컬 테스트용)
- 배포될 Vercel 도메인 (예: `my-reading-journal.vercel.app`)
  → 4번에서 배포 후 도메인이 정해지면 다시 와서 추가

---

## 4. GitHub → Vercel 배포

1. 이 폴더(`index.html`, `firestore.rules`, `README.md`)를 GitHub 레포에 push
2. https://vercel.com → **Add New → Project** → 그 레포 **Import**
3. 프레임워크: **Other**, 빌드 명령/출력 디렉터리 **비워둠** (정적 사이트)
   → **Deploy**
4. 배포 끝나면 나온 도메인을 **3번의 '승인된 도메인'에 추가**

---

## 5. 로컬에서 먼저 테스트하고 싶다면

`file://`로 직접 열면 로그인이 안 돼요. 간단한 로컬 서버로 띄우세요:

```bash
npx serve        # 또는  python -m http.server
```

→ 브라우저에서 `http://localhost:3000` (포트는 안내된 값) 접속 후 구글 로그인.

---

## 데이터 구조 (참고)

```
users/{내 uid}/entries/{자동 id}
  ├─ title      책 제목
  ├─ author     지은이
  ├─ cover      표지 URL
  ├─ quote      인상 깊은 구절 (OCR/직접 입력)
  ├─ thought    내 생각·감상
  ├─ rating     별점 (0~5)
  ├─ tags       태그 배열
  ├─ date       읽은 날짜 (YYYY-MM-DD)
  └─ createdAt  생성 시각 (정렬용)
```

---

## 다음 단계 (선택)

- **PWA 설치**: `manifest.json` + 서비스 워커 + 아이콘을 추가하면 홈 화면 설치 + 오프라인 화면 가능
- **한글 표지 정확도**: Google Books 대신 알라딘 API를 쓰려면, 키를 숨겨야 하니
  Vercel **서버리스 함수**(`/api/book.js`)를 하나 만들어 거기서 호출
