import { useState } from "preact/hooks";
import { render } from "preact";
import "./styles.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="container">
      <header>
        <h1>Build something useful.</h1>
        <p className="intro">
          A lightweight and fast frontend base built with Preact, TypeScript, and Rollup.
        </p>
      </header>

      <section className="grid">
        <div className="panel">
          <h2>Clicks</h2>
          <strong>{count}</strong>

          <button onClick={() => setCount(count + 1)}>
            Click me!
          </button>
        </div>
      </section>
    </main>
  );
}

render(<App />, document.getElementById("app"));
