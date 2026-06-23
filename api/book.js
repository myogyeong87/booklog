// /api/book.js — Vercel 서버리스 함수
// 알라딘 도서검색을 "서버에서" 대신 호출해 후보 여러 권(표지·제목·지은이·출판사)을 돌려줍니다.
// TTBKey는 환경변수(ALADIN_TTB_KEY)에서 읽어 노출을 막습니다.
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
    "&QueryType=Title&MaxResults=8&start=1&SearchTarget=Book" +
    "&Cover=Big&output=js&Version=20131101";

  try {
    const r = await fetch(url);
    const text = await r.text();

    let items = [];
    try {
      const data = JSON.parse(text);
      items = Array.isArray(data.item) ? data.item : [];
    } catch {
      // JSON이 깨져도 제목/지은이/표지/출판사를 정규식으로 건져냄
      const re = /"title":"([^"]*)"[\s\S]*?"author":"([^"]*)"[\s\S]*?"cover":"([^"]+)"[\s\S]*?"publisher":"([^"]*)"/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        items.push({ title: m[1], author: m[2], cover: m[3], publisher: m[4] });
      }
    }

    const candidates = items
      .filter((it) => it.cover) // 표지 있는 것만
      .map((it) => ({
        title: it.title || "",
        author: it.author || "",
        publisher: it.publisher || "",
        pubDate: it.pubDate || "",
        cover: (it.cover || "").replace("http://", "https://"),
      }));

    res.setHeader("Cache-Control", "s-maxage=86400"); // 같은 검색은 하루 캐시
    return res.status(200).json({
      found: candidates.length > 0,
      count: candidates.length,
      candidates,
    });
  } catch (e) {
    return res.status(502).json({ error: "aladin fetch failed" });
  }
}
