// /api/book.js — Vercel 서버리스 함수
// 알라딘 도서검색을 서버에서 호출.
//  - 기본: /api/book?q=제목  → 후보 여러 권(표지·제목·지은이·출판사·출간일·ISBN·쪽수)
//  - 쪽수 보강: /api/book?isbn=ISBN13  → 그 책의 쪽수만 다시 조회
// TTBKey는 환경변수(ALADIN_TTB_KEY)에서 읽어 노출을 막음.
// 도서 DB 제공: 알라딘 인터넷서점(www.aladin.co.kr)

const KEY = () => process.env.ALADIN_TTB_KEY;

// 알라딘 상품조회(ItemLookUp)로 쪽수(itemPage) 가져오기
async function fetchPage(isbn13) {
  const url =
    "http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx" +
    "?ttbkey=" + encodeURIComponent(KEY()) +
    "&itemIdType=ISBN13&ItemId=" + encodeURIComponent(isbn13) +
    "&output=js&Version=20131101&OptResult=packing";
  try {
    const r = await fetch(url);
    const text = await r.text();
    let page = 0;
    try {
      const data = JSON.parse(text);
      const it = data.item && data.item[0];
      page = (it && it.subInfo && it.subInfo.itemPage) || 0;
    } catch {
      const m = text.match(/"itemPage":(\d+)/);
      page = m ? parseInt(m[1], 10) : 0;
    }
    return page || 0;
  } catch {
    return 0;
  }
}

export default async function handler(req, res) {
  if (!KEY()) return res.status(500).json({ error: "missing ALADIN_TTB_KEY" });

  // (1) 쪽수만 보강 조회
  const isbn = (req.query.isbn || "").toString().trim();
  if (isbn) {
    const page = await fetchPage(isbn);
    res.setHeader("Cache-Control", "s-maxage=86400");
    return res.status(200).json({ isbn, page });
  }

  // (2) 제목으로 후보 검색
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "no query" });

  const url =
    "http://www.aladin.co.kr/ttb/api/ItemSearch.aspx" +
    "?ttbkey=" + encodeURIComponent(KEY()) +
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
      const re =
        /"title":"([^"]*)"[\s\S]*?"author":"([^"]*)"[\s\S]*?"isbn13":"([^"]*)"[\s\S]*?"cover":"([^"]+)"[\s\S]*?"publisher":"([^"]*)"/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        items.push({ title: m[1], author: m[2], isbn13: m[3], cover: m[4], publisher: m[5] });
      }
    }

    const candidates = items
      .filter((it) => it.cover)
      .map((it) => ({
        title: it.title || "",
        author: it.author || "",
        publisher: it.publisher || "",
        pubDate: it.pubDate || "",
        isbn13: it.isbn13 || "",
        cover: (it.cover || "").replace("http://", "https://"),
      }));

    res.setHeader("Cache-Control", "s-maxage=86400");
    return res.status(200).json({
      found: candidates.length > 0,
      count: candidates.length,
      candidates,
    });
  } catch (e) {
    return res.status(502).json({ error: "aladin fetch failed" });
  }
}
