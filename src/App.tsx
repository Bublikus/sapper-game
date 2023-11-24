import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Select from "react-select";
import { useSapperGame } from "./useSapperGame";
import {
  addPayerToLeaderboard,
  getLeaderboard,
  Leader,
  trackGameLoss,
  trackGameWin,
  trackSignGame,
} from "./firebase";
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

export const getTime = (time: number) =>
  `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(
    time % 60
  ).padStart(2, "0")}`;

export default function App() {
  const defaultName = useRef(localStorage.getItem("playerName"));

  const [level, setLevel] = useState(options[0].value);
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [ownId, setOwnId] = useState("");
  const [isShownLeaderboard, setIsShownLeaderboard] = useState(false);

  const sortedLeaders = leaders.sort((a, b) => a.time - b.time).slice(0, 10);

  const config = useMemo(
    () => ({
      ...levels[level],

      onWinGame: async (time: number) => {
        console.info(time, getTime(time));
        trackGameWin(time, level);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setIsShownLeaderboard(true);

        const promptPlayer = () => {
          let playerName;

          while (true) {
            const player = prompt(
              `Time: ${getTime(time)}\n\nEnter your name: `,
              defaultName.current ?? undefined
            );

            playerName = player?.trim().slice(0, 50);

            if (playerName !== null && playerName !== "") break;
          }

          return playerName;
        };

        const oneHour = 60 * 60 * 1000;
        if (time && !Number.isNaN(+time) && time < oneHour) {
          const playerName = promptPlayer();

          if (playerName) {
            const playerId = await addPayerToLeaderboard(
              playerName,
              time,
              level
            );

            localStorage.setItem("playerName", playerName);
            defaultName.current = playerName;

            if (playerId) setOwnId(playerId);

            trackSignGame(time, playerName, level);

            await getLeaderboard(level).then(setLeaders);
          }
        }
      },

      onLostGame: async (time: number) => {
        console.info(time, getTime(time));
        trackGameLoss(time, level);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setIsShownLeaderboard(true);
      },
    }),
    [level]
  );

  const { matrix, restart } = useSapperGame(config);

  const handleRestart = () => {
    setIsShownLeaderboard(false);
    restart();
  };

  useEffect(() => {
    getLeaderboard(level).then(setLeaders);
  }, [level]);

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

        {isShownLeaderboard && (
          <div role="button" className="leaderboard" onClick={handleRestart}>
            <div className="leaderboard-box">
              <h3>Leaderboard</h3>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaders.map((leader, i) => (
                    <tr
                      key={leader.id}
                      className={leader.id === ownId ? "strong" : ""}
                    >
                      <td>
                        {leader.id === ownId ? "→ " : ""}
                        {i + 1}
                      </td>
                      <td>{leader.player.slice(0, 20).padEnd(20, ".")}</td>
                      <td>{getTime(leader.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <footer>
          <h4>Hint: Use long press to flag a tile</h4>
        </footer>
      </main>
    </>
  );
}
