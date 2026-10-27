import Generator from "./Generator";

export default function Home() {
  return (
    <main className="container">
      <header className="hero">
        <p className="brand">셀러AI</p>
        <h1>상품명·키워드·상세문구, 30초 만에</h1>
        <p className="sub">스마트스토어·쿠팡 상품 등록에 필요한 문구를 한 번에 만들어 드려요.</p>
      </header>
      <Generator />
    </main>
  );
}
