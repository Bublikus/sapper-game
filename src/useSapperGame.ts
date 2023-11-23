import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

// Types

type Size = { x: number; y: number };
type Coords = { x: number; y: number };
type CellValue = null | number | string;
type Cell = {
  value: CellValue;
  isFlagged: boolean;
  isOpen: boolean;
  actions: {
    onMouseDown(): void;
    onMouseUp(): void;
    onMouseLeave(): void;
    onTouchStart(): void;
    onTouchEnd(): void;
    onTouchMove(): void;
  };
};
type Row = Cell[];
type Matrix = Row[];
type Config = { areaSize?: Size; bombAmount?: number };
type UseSapperGame = (config?: Config) => { matrix: Matrix };

// Constants

const FLAG: string = "🚩";
const BOMB: string = "💣";
const DEFAULT_AREA_SIZE: Size = { x: 10, y: 10 };
const DEFAULT_BOMB_AMOUNT: number = 10;
const DEFAULT_OPEN_DELAY: number = 50;
const PRESS_DURATION: number = 500;
const OPEN_DURATION: number = 1000;

// Variables

let bombs: Coords[];
let matrix: Matrix;
let setMatrix: Dispatch<SetStateAction<Matrix>>;

// Hook

export const useSapperGame: UseSapperGame = (config = {}) => {
  const areaSize = config.areaSize ?? DEFAULT_AREA_SIZE;
  const bombAmount = config.bombAmount ?? DEFAULT_BOMB_AMOUNT;

  const pressedCoords = useRef<Coords>();
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const isScroll = useRef(false);

  [matrix, setMatrix] = useState<Matrix>(getMatrix(areaSize, bombAmount));

  useEffect(() => resetGame(), [config]);

  // Helpers

  function getMatrix(areaSize: Size, bombAmount: number): Matrix {
    const rows = getIndexedArray(areaSize.y);
    const cols = getIndexedArray(areaSize.x);
    bombs = bombs || createBombs(bombAmount, areaSize);
    return rows.map((y) => cols.map((x) => getMatrixCellForCoords({ x, y })));
  }

  function getMatrixCellForCoords(coords: Coords): Cell {
    const cell = matrix?.[coords.y]?.[coords.x];
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints;

    return {
      ...cell,
      isOpen: false,
      isFlagged: false,
      value: getCellValue(coords),
      actions: {
        onMouseDown: () => !isTouch && setStartLongPress(coords),
        onMouseUp: () => !isTouch && setStartLongPress(null),
        onMouseLeave: () => !isTouch && setStartLongPress(null),
        onTouchStart: () => isTouch && setStartLongPress(coords),
        onTouchEnd: () => {
          if (isTouch) {
            setStartLongPress(null);
            isScroll.current = false;
          }
        },
        onTouchMove: () => {
          if (isTouch) {
            isScroll.current = true;
            setStartLongPress(null);
          }
        },
      },
    };
  }

  function getCellValue(coords: Coords): CellValue {
    if (isBombInCoords(bombs, coords)) return BOMB;
    const bombsAround = getBombsAroundCoords(bombs, coords);
    return bombsAround.length || null;
  }

  function getBombsAroundCoords(bombs: Coords[], coords: Coords): Coords[] {
    return bombs.filter(({ x, y }) =>
      [
        Math.abs(x - coords.x) === 1 || Math.abs(x - coords.x) === 0,
        Math.abs(y - coords.y) === 1 || Math.abs(y - coords.y) === 0,
      ].every(Boolean)
    );
  }

  function createBombs(bombAmount: number, areaSize: Size): Coords[] {
    const newBombs: Coords[] = [];
    while (newBombs.length < bombAmount) {
      const bombCoords: Coords = {
        x: Math.floor(Math.random() * areaSize.x),
        y: Math.floor(Math.random() * areaSize.y),
      };
      if (!isBombInCoords(newBombs, bombCoords)) newBombs.push(bombCoords);
    }
    return newBombs;
  }

  async function handleCellClick({ x, y }: Coords): Promise<void> {
    const cell = matrix?.[y][x];
    if (cell.isFlagged) return;
    await openCellsByCoords([{ x, y }]);
    checkIsEnd();
    checkisWin();
  }

  function setStartLongPress(coords?: Coords | null): void {
    if (isEnd()) return;
    const chosenCoords = pressedCoords.current;
    if (chosenCoords && coords && !isSameObjects(chosenCoords, coords)) {
      clearTimeout(pressTimer.current);
      pressedCoords.current = undefined;
      return;
    }
    if (!coords && chosenCoords && !isScroll.current)
      handleCellClick(chosenCoords);
    if (!coords) {
      clearTimeout(pressTimer.current);
      pressedCoords.current = undefined;
      return;
    } else {
      pressedCoords.current = coords;
    }
    const long = () => (flagCell(coords), (pressedCoords.current = undefined));
    pressTimer.current = setTimeout(long, PRESS_DURATION);
  }

  async function openCellsByCoords(coordsList: Coords[]): Promise<unknown> {
    const openCycle = ({ x, y }: Coords) => {
      const newMatrix = matrix.slice();
      const cell = newMatrix?.[y]?.[x];

      if (!cell || cell.isFlagged || cell.isOpen) return;

      cell.isOpen = true;
      setMatrix(newMatrix);

      if (isNumberValue(cell.value)) return;
      if (isBombValue(cell.value)) return openCellsByCoords(bombs);

      const cells = getIndexedArray(9).map((i) => ({
        x: x + (i % 3) - 1,
        y: y + Math.floor((i / 3) % 3) - 1,
      }));

      return new Promise((resolve) => {
        setTimeout(() => resolve(openCellsByCoords(cells)), DEFAULT_OPEN_DELAY);
      });
    };
    return Promise.all(coordsList.map(openCycle));
  }

  function checkisWin() {
    const hasWin = ({ x, y }: Coords) =>
      [
        isBombInCoords(bombs, { x, y }) && !matrix[y][x].isOpen,
        !isBombValue(matrix[y][x].value) && matrix[y][x].isOpen,
      ].some(Boolean);
    const rowsHasWin = (row: Row, y: number) =>
      row.every((_x, x) => hasWin({ x, y }));
    const isWin = matrix.every(rowsHasWin);
    if (!isWin) return;
    flagAllBombs(bombs);
    setTimeout(() => (alert("😎 You win!"), resetGame()), OPEN_DURATION);
  }

  function checkIsEnd() {
    if (!isEnd()) return;
    setTimeout(() => (alert("🤯 End game"), resetGame()), OPEN_DURATION);
  }

  function isEnd() {
    const hasLost = (cell: Cell) => isBombValue(cell.value) && cell.isOpen;
    const isEnd = matrix.some((row) => row.some(hasLost));
    return isEnd;
  }

  function flagCell({ x, y }: Coords): void {
    if (matrix[y][x].isOpen) return;
    const newMatrix = matrix.slice();
    const cell = newMatrix[y][x];
    cell.isFlagged = !cell.isFlagged;
    cell.value = isFlagValue(cell.value) ? getCellValue({ x, y }) : FLAG;
    setMatrix(newMatrix);
  }

  function flagAllBombs(bombs: Coords[]): void {
    const newMatrix = matrix.slice();
    bombs.forEach(({ x, y }) => {
      newMatrix[y][x].value = FLAG;
      newMatrix[y][x].isFlagged = true;
    });
    setMatrix(newMatrix);
  }

  function resetGame() {
    // @ts-ignore
    bombs = undefined;
    // @ts-ignore
    matrix = undefined;
    pressedCoords.current = undefined;
    clearTimeout(pressTimer.current);
    setMatrix(getMatrix(areaSize, bombAmount));
  }

  // Utils

  function isNumberValue(cellValue: CellValue): boolean {
    return typeof cellValue === "number";
  }

  function isBombValue(cellValue: CellValue): boolean {
    return cellValue === BOMB;
  }

  function isFlagValue(cellValue: CellValue): boolean {
    return cellValue === FLAG;
  }

  function isBombInCoords(bombs: Coords[], coords: Coords): boolean {
    return bombs.some(({ x, y }) => coords.x === x && coords.y === y);
  }

  function isSameObjects(objA: object, objB: object): boolean {
    return JSON.stringify(objA) === JSON.stringify(objB);
  }

  function getIndexedArray(length: number): number[] {
    return [...Array(length)].map((_, i) => i);
  }

  return { matrix };
};
