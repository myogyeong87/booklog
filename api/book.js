// /api/book.js — Vercel 서버리스 함수
// 알라딘 도서검색을 "서버에서" 대신 호출해 표지·제목·지은이만 돌려줍니다.
// TTBKey는 코드에 쓰지 않고 Vercel 환경변수(ALADIN_TTB_KEY)에서 읽어 노출을 막습니다.
// 도서 DB 제공: 알라딘 인터넷서점(www.aladin.co.kr)

export default async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "no query" });

  const key = process.env.ALADIN_TTB_KEY;
  if (!key) return res.status(500).json({ error: "missing ALADIN_TTB_KEY" });

  const url =
    "http://www.aladin.co.kr/ttb/api/ItemSearch.aspx" +
    "?ttbkey=" + encodeURIComponent(key) +
    "&Query=" + encodeURIComponent(q) +
    "&QueryType=Title&MaxResults=1&start=1&SearchTarget=Book" +
    "&Cover=Big&output=js&Version=20131101";

  try {
    const r = await fetch(url);
    const text = await r.text();

    let item = null;
    try {
      const data = JSON.parse(text);
      item = data.item && data.item[0];
    } catch {
      // JSON이 깨져도 표지 URL만은 정규식으로 건져냄
      const cover = (text.match(/"cover":"([^"]+)"/) || [])[1];
      const title = (text.match(/"title":"([^"]*)"/) || [])[1];
      const author = (text.match(/"author":"([^"]*)"/) || [])[1];
      if (cover) item = { cover, title, author };
    }

    if (!item) return res.status(200).json({ found: false });

    res.setHeader("Cache-Control", "s-maxage=86400"); // 같은 검색은 하루 캐시
    return res.status(200).json({
      found: true,
      title: item.title || "",
      author: item.author || "",
      cover: (item.cover || "").replace("http://", "https://"),
    });
  } catch (e) {
    return res.status(502).json({ error: "aladin fetch failed" });
  }
}
