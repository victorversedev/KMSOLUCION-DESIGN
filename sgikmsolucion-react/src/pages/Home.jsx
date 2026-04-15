import SideMenu from "../menu/SideMenu";
import TopBar from "../menu/TopBar";

export default function Home() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {}
      <SideMenu />

      {}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar />

        <main style={{ padding: 20 }}>
          <h1>Home</h1>
        </main>
      </div>
    </div>
  );
}