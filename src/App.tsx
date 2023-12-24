import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Select from "react-select";
import {
  addPayerToLeaderboard,
  getLeaderboard,
  Leader,
  trackGameLoss,
  trackGameWin,
  trackSignGameFinish,
} from "./firebase";
import { GameContainer } from "./components/GameContainer";
import { Instructions } from "./components/Instructions";
import { Leaderboard } from "./components/Leaderboard";
import { PlayerModal } from "./components/PlayerModal";
import { useSapperGame } from "./useSapperGame";
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

const isTouch = "touchstart" in window || !!navigator.maxTouchPoints;

const options = (Object.keys(levels) as (keyof typeof levels)[]).map((lev) => ({
  value: lev,
  label: `${lev} — ${levels[lev].areaSize.x}x${levels[lev].areaSize.y} (💣${levels[lev].bombAmount})`,
}));

export const getTime = (time: number) =>
  `${String(Math.floor(time / 60) || "").padStart(2, "_")}:${String(
    time % 60 || ""
  ).padStart(2, Math.floor(time / 60) ? "0" : "_")}`;

const defaultPlayer: Leader = {
  id: "",
  player: `doodler_${Math.floor(new Date().getTime() / 1000)}`,
  time: 0,
  level: Object.keys(levels)[0],
  date: new Date().toLocaleString(),
};

export default function App() {
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const isOverlay = useRef(false);

  const [level, setLevel] = useState(options[0].value);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isEnd, setIsEnd] = useState(false);
  const [time, setTime] = useState(0);
  const [player, setPlayer] = useState<Leader>(defaultPlayer);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [isShownLeaderboard, setIsShownLeaderboard] = useState(false);
  const [isShownInstructions, setIsShownInstructions] = useState(isTouch);

  isOverlay.current = isShownLeaderboard || isShownInstructions;

  const config = useMemo(
    () => ({
      ...levels[level],

      onWinGame: async (time: number) => {
        setIsEnd(true);
        trackGameWin(time, level);

        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsShownLeaderboard(true);
        await new Promise((resolve) => setTimeout(resolve, 500));

        const oneHour = 60 * 60 * 1000;
        if (time && !Number.isNaN(+time) && time < oneHour)
          setShowPlayerModal(true);
      },

      onLostGame: async (time: number) => {
        setIsEnd(true);
        trackGameLoss(time, level);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        setIsShownLeaderboard(true);
      },
    }),
    [level]
  );

  const { matrix, restart, startTime } = useSapperGame(config);

  const handleRestart = () => {
    setIsEnd(false);
    setIsShownLeaderboard(false);
    setIsShownInstructions(false);
    setPlayer(defaultPlayer);
    setTime(0);
    restart();
  };

  const onPlayerModalClose = async (playerName: string) => {
    setShowPlayerModal(false);

    if (time && playerName) {
      const playerId = await addPayerToLeaderboard(playerName, time, level);
      if (playerId) setPlayer((prev) => ({ ...prev, id: playerId }));
      trackSignGameFinish(time, playerName, level);
      await getLeaderboard(level).then(setLeaders);
    }
  };

  useEffect(() => {
    if (isEnd && startTime) {
      clearInterval(timerRef.current);
    } else if (startTime) {
      timerRef.current = setInterval(() => {
        const time = Math.floor((Date.now() - startTime) / 1000);
        setTime(time);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [startTime, isEnd]);

  useEffect(() => {
    setTime(0);
    getLeaderboard(level).then(setLeaders);
  }, [level]);

  return (
    <GameContainer>
      <Instructions open={isShownInstructions} onClose={handleRestart} />

      <header>
        <h1>Sapper</h1>
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
        <h3>
          Time: <span>⏱️{getTime(time)}</span>
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
                    className={clsx("tail", {
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
        <h4>Long press to flag a tile</h4>
      </footer>

      <Leaderboard
        open={isShownLeaderboard}
        active={!isShownInstructions && !showPlayerModal}
        player={player}
        leaders={leaders}
        onClose={handleRestart}
      />

      <PlayerModal
        open={showPlayerModal}
        score={time}
        defaultName={defaultPlayer.player}
        onClose={onPlayerModalClose}
      />
    </GameContainer>
  );
}
