import React, { useState, useEffect } from "react";
import clsx from "clsx";
import Select from "react-select";
import { useSapperGame } from "./useSapperGame";
// @ts-ignore
import bgImg from "./bg.jpg";
import "./style.css";

const levels = {
  relax: {
    areaSize: { x: 10, y: 10 },
    bombAmount: 7,
  },
  easy: {
    areaSize: { x: 10, y: 10 },
    bombAmount: 10,
  },
  medium: {
    areaSize: { x: 20, y: 20 },
    bombAmount: 50,
  },
  hard: {
    areaSize: { x: 40, y: 20 },
    bombAmount: 100,
  },
};

const options = (Object.keys(levels) as (keyof typeof levels)[]).map((lev) => ({
  value: lev,
  label: `${lev} — ${levels[lev].areaSize.x}x${levels[lev].areaSize.y} (💣${levels[lev].bombAmount})`,
}));

export default function App() {
  const [level, setLevel] = useState(options[0].value);
  const [loading, setLoading] = useState(true);
  const { matrix } = useSapperGame(levels[level]);

  return (
    <>
      {loading && <p className="loading">loading...</p>}
      <main className={loading ? "loading" : ""}>
        <img
          className="bg"
          src={bgImg}
          alt="bg"
          onLoad={() => setLoading(false)}
        />

        <header>
          <h1>Sapper Game</h1>
          <h3>
            Level:
            <label>
              <Select
                isSearchable={false}
                defaultValue={options[0]}
                options={options}
                onChange={(opt) => opt && setLevel(opt.value)}
              />
            </label>
          </h3>
        </header>

        <table>
          <tbody>
            {matrix.map((row, yi) => (
              <tr key={yi}>
                {row.map((cell, xi) => (
                  <td key={xi}>
                    <button
                      type="button"
                      disabled={cell.isOpen}
                      className={clsx({
                        open: cell.isOpen,
                        [`value-${cell.value}`]: cell.isOpen,
                      })}
                      {...cell.actions}
                    >
                      {cell.isOpen || cell.isFlagged ? cell.value || "" : ""}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <footer>
          <h4>Hint: Use long press to flag a tile</h4>
        </footer>
      </main>
    </>
  );
}
