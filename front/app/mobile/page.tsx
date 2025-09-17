"use client";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";

// Constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const GAME_SPEED = 500; // Drop speed base in ms (slower for easier difficulty)

// Type Definitions
type TetrominoShape = (string | number)[][];
type Position = { x: number; y: number };
type PlayerState = {
  pos: Position;
  tetromino: TetrominoShape;
  collided: boolean;
};

type TetrominoData = {
  shape: TetrominoShape;
  color: string;
};

type CellState = "clear" | "merged";
type BoardCell = [string | number, CellState];
type Board = BoardCell[][];

// Tetromino definitions
const TETROMINOS: Record<string, TetrominoData> = {
  "0": { shape: [[0]], color: "transparent" },
  I: {
    shape: [
      [0, "I", 0, 0],
      [0, "I", 0, 0],
      [0, "I", 0, 0],
      [0, "I", 0, 0],
    ],
    color: "bg-cyan-500 shadow-[0_0_10px_theme(colors.cyan.400)]",
  },
  J: {
    shape: [
      [0, "J", 0],
      [0, "J", 0],
      ["J", "J", 0],
    ],
    color: "bg-blue-500 shadow-[0_0_10px_theme(colors.blue.400)]",
  },
  L: {
    shape: [
      [0, "L", 0],
      [0, "L", 0],
      [0, "L", "L"],
    ],
    color: "bg-orange-500 shadow-[0_0_10px_theme(colors.orange.400)]",
  },
  O: {
    shape: [
      ["O", "O"],
      ["O", "O"],
    ],
    color: "bg-yellow-500 shadow-[0_0_10px_theme(colors.yellow.400)]",
  },
  S: {
    shape: [
      [0, "S", "S"],
      ["S", "S", 0],
      [0, 0, 0],
    ],
    color: "bg-green-500 shadow-[0_0_10px_theme(colors.green.400)]",
  },
  T: {
    shape: [
      [0, 0, 0],
      ["T", "T", "T"],
      [0, "T", 0],
    ],
    color: "bg-purple-500 shadow-[0_0_10px_theme(colors.purple.400)]",
  },
  Z: {
    shape: [
      ["Z", "Z", 0],
      [0, "Z", "Z"],
      [0, 0, 0],
    ],
    color: "bg-red-500 shadow-[0_0_10px_theme(colors.red.400)]",
  },
};

// Create a new board (to avoid identical references)
const createBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => [0, "clear"] as BoardCell)
  );

export default function App(): JSX.Element {
  // State with types
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [player, setPlayer] = useState<PlayerState>({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOS["0"].shape,
    collided: false,
  });
  const [nextTetromino, setNextTetromino] = useState<TetrominoData | null>(null);
  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [rows, setRows] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  // Generate a random tetromino
  const randomTetromino = useCallback((): TetrominoData => {
    const tetrominos = "IJLOSTZ";
    const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
    return TETROMINOS[randTetromino];
  }, []);

  // Reset the player
  const resetPlayer = useCallback(() => {
    const newTetromino = nextTetromino || randomTetromino();
    const newNextTetromino = randomTetromino();
    setNextTetromino(newNextTetromino);

    // Place the new block in the center
    const startX = Math.floor((BOARD_WIDTH - newTetromino.shape[0].length) / 2);

    setPlayer({
      pos: { x: startX, y: 0 },
      tetromino: newTetromino.shape,
      collided: false,
    });
  }, [nextTetromino, randomTetromino]);

  useEffect(() => {
    if (!nextTetromino) resetPlayer();
  }, [nextTetromino, resetPlayer]);

  // Collision detection
  const checkCollision = useCallback(
    (playerArg: PlayerState, boardArg: Board, move: Position): boolean => {
      for (let y = 0; y < playerArg.tetromino.length; y += 1) {
        for (let x = 0; x < playerArg.tetromino[y].length; x += 1) {
          if (playerArg.tetromino[y][x] !== 0) {
            const newY = y + playerArg.pos.y + move.y;
            const newX = x + playerArg.pos.x + move.x;

            // Check if outside the board
            if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
              return true;
            }

            // Allow movement at the very top (y < 0)
            if (newY >= 0) {
              const cell = boardArg[newY][newX];
              if (cell && cell[1] !== "clear") {
                return true;
              }
            }
          }
        }
      }
      return false;
    },
    []
  );

  // Move left/right
  const movePlayer = (dir: number) => {
    if (!checkCollision(player, board, { x: dir, y: 0 })) {
      setPlayer((prev) => ({ ...prev, pos: { x: prev.pos.x + dir, y: prev.pos.y } }));
    }
  };

  // Drop
  const drop = useCallback(() => {
    if (!checkCollision(player, board, { x: 0, y: 1 })) {
      setPlayer((prev) => ({ ...prev, pos: { x: prev.pos.x, y: prev.pos.y + 1 }, collided: false }));
    } else {
      // Check for game over (piece collided at the top)
      if (player.pos.y < 1) {
        setIsGameOver(true);
        return;
      }
      setPlayer((prev) => ({ ...prev, collided: true }));
    }
  }, [player, board, checkCollision]);

  // Hard drop fix: Move down one cell at a time until a collision is found
  const hardDrop = useCallback(() => {
    let dropY = 0;
    while (!checkCollision(player, board, { x: 0, y: dropY + 1 })) {
      dropY++;
    }
    setPlayer((prev) => ({
      ...prev,
      pos: { x: prev.pos.x, y: prev.pos.y + dropY },
      collided: true,
    }));
  }, [player, board, checkCollision]);

  // Rotate clockwise
  const rotate = (matrix: TetrominoShape) => {
    // Transpose + reverse each row for 90-degree clockwise rotation
    const rotated: TetrominoShape = matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());

    const originalPos = { ...player.pos };
    let offset = 1;
    const newPlayer: PlayerState = { ...player, tetromino: rotated };

    // Wall kick: Try to shift left/right if collision occurs
    while (checkCollision(newPlayer, board, { x: 0, y: 0 })) {
      newPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (Math.abs(offset) > newPlayer.tetromino[0].length) {
        setPlayer((prev) => ({ ...prev, pos: originalPos }));
        return;
      }
    }
    setPlayer(newPlayer);
  };

  // When player collides, merge tetromino to the board and clear lines
  useEffect(() => {
    if (!player.collided) return;

    // Clone the board
    const newBoard: Board = board.map((row) => row.map((cell) => ([cell[0], cell[1]] as BoardCell)));

    player.tetromino.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = y + player.pos.y;
          const boardX = x + player.pos.x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = [value, "merged"];
          }
        }
      });
    });

    // Clear completed lines
    let clearedRows = 0;
    const sweptBoard = newBoard.reduce<Board>((ack, row) => {
      if (row.every((cell) => cell[1] === "merged")) {
        clearedRows += 1;
        // Add a clear row to the top
        ack.unshift(Array.from({ length: BOARD_WIDTH }, () => [0, "clear"] as BoardCell));
      } else {
        ack.push(row);
      }
      return ack;
    }, [] as Board);

    if (clearedRows > 0) {
      const linePoints = [0, 40, 100, 300, 1200];
      setScore((prev) => prev + (linePoints[clearedRows] || 0) * level);
      setRows((prev) => prev + clearedRows);
    }

    setBoard(sweptBoard);
    resetPlayer();
  }, [player.collided, board, level, resetPlayer]);

  // Level up
  useEffect(() => {
    if (rows >= level * 10) {
      setLevel((prev) => prev + 1);
    }
  }, [rows, level]);

  // Game loop
  // The drop interval decreases as the level increases.
  const dropInterval = GAME_SPEED / level;
  const dropTime = useRef<number | null>(null);

  const gameLoop = useCallback(() => {
    if (!isPaused && !isGameOver) {
      drop();
    }
    dropTime.current = window.setTimeout(gameLoop, dropInterval) as unknown as number;
  }, [isPaused, isGameOver, drop, dropInterval]);

  useEffect(() => {
    if (gameAreaRef.current) gameAreaRef.current.focus();
    dropTime.current = window.setTimeout(gameLoop, dropInterval) as unknown as number;
    return () => {
      if (dropTime.current) window.clearTimeout(dropTime.current);
    };
  }, [gameLoop, dropInterval]);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isGameOver) return;

    const key = e.key;

    if (key === "p" || key === "P") {
      setIsPaused((prev) => !prev);
      return;
    }
    if (key === "r" || key === "R") {
      handleRestart();
      return;
    }

    if (isPaused) return;

    if (key === "ArrowLeft") {
      movePlayer(-1);
    } else if (key === "ArrowRight") {
      movePlayer(1);
    } else if (key === "ArrowDown") {
      drop();
    } else if (key === "ArrowUp") {
      e.preventDefault();
      rotate(player.tetromino);
    } else if (key === " " || key === "Spacebar") {
      e.preventDefault();
      hardDrop();
    }
  };

  // Restart the game
  const handleRestart = () => {
    setBoard(createBoard());
    setScore(0);
    setLevel(1);
    setRows(0);
    setIsGameOver(false);
    setIsPaused(false);
    setNextTetromino(null);
    resetPlayer();
  };

  // Cell component
  const Cell: React.FC<{ type: string | number }> = ({ type }) => {
    const color = type === 0 ? "bg-gray-800/50" : TETROMINOS[String(type)].color;
    const baseStyle = "w-full h-full rounded-sm";
    return <div className={`${baseStyle} ${color}`} />;
  };

  // Mini board (NEXT)
  const MiniBoard: React.FC<{ tetromino: TetrominoData | null }> = ({ tetromino }) => {
    const shape = tetromino?.shape || [[0]];
    const shapeHeight = shape.length;
    const shapeWidth = shape[0].length;
    const offsetY = Math.floor((4 - shapeHeight) / 2);
    const offsetX = Math.floor((4 - shapeWidth) / 2);

    return (
      <div className="grid grid-cols-4 grid-rows-4 gap-px">
        {Array.from({ length: 16 }).map((_, i) => {
          const y = Math.floor(i / 4);
          const x = i % 4;
          const cellValue = shape[y - offsetY]?.[x - offsetX];
          const type = cellValue || 0;
          return (
            <div
              key={`${y}-${x}`}
              className={`w-4 h-4 rounded-sm ${type ? TETROMINOS[String(type)].color : "bg-transparent"}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white font-mono flex flex-col items-center justify-center p-4 overflow-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={gameAreaRef}
    >
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start w-full max-w-5xl">
        {/* Left Side (PC) */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-extrabold text-white mb-4">TETRIS</h1>
          <div className="flex flex-col gap-4 p-4 rounded-lg bg-black/30 border border-gray-700 shadow-2xl shadow-purple-500/10 w-full max-w-sm">
            <div className="text-center">
              <h3 className="text-xl font-bold text-purple-400">SCORE</h3>
              <p className="text-3xl font-extrabold tracking-wider">{score}</p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-purple-400">LEVEL</h3>
              <p className="text-3xl font-extrabold tracking-wider">{level}</p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-purple-400">NEXT</h3>
              <div className="flex items-center justify-center mt-2">
                <MiniBoard tetromino={nextTetromino} />
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-gray-400">P: Pause | R: Restart</p>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex flex-col items-center gap-4 w-full md:w-auto order-1 md:order-2">
          {/* Mobile Info & Title */}
          <div className="md:hidden flex flex-col items-center w-full mb-4">
            <h1 className="text-4xl font-extrabold text-white mb-2">TETRIS</h1>
          </div>

          {/* Game Board */}
          <div className="relative border-2 border-gray-700 rounded-lg p-1 sm:p-2 bg-black/30 backdrop-blur-sm shadow-2xl shadow-purple-500/10 w-full aspect-[1/2] max-w-md max-h-[80vh]">
            <div
              className="grid gap-px h-full w-full"
              style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`,
              }}
            >
              {board.map((row, y) =>
                row.map((cell, x) => <Cell key={`${y}-${x}`} type={cell[0]} />)
              )}

              {/* Player Piece (absolute position) */}
              {player.tetromino.map((row, y) =>
                row.map(
                  (value, x) =>
                    value !== 0 && (
                      <div
                        key={`p-${y}-${x}`}
                        className="absolute rounded-sm"
                        style={{
                          top: `${(player.pos.y + y) * (100 / BOARD_HEIGHT)}%`,
                          left: `${(player.pos.x + x) * (100 / BOARD_WIDTH)}%`,
                          width: `${100 / BOARD_WIDTH}%`,
                          height: `${100 / BOARD_HEIGHT}%`,
                          padding: "1px",
                        }}
                      >
                        <div className={`w-full h-full rounded-sm ${TETROMINOS[String(value)].color}`} />
                      </div>
                    )
                )
              )}
            </div>

            {/* Overlay */}
            {(isGameOver || isPaused) && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-md z-10">
                <h2 className="text-4xl font-bold tracking-widest text-red-500 mb-4">
                  {isGameOver ? "GAME OVER" : "PAUSED"}
                </h2>
                {isGameOver && <p className="text-xl">Score: {score}</p>}
                <button
                  onClick={handleRestart}
                  className="mt-8 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-md text-lg font-bold transition-all duration-200 shadow-lg"
                >
                  Restart
                </button>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex justify-around w-full max-w-xs mt-4">
            <button
              onClick={() => movePlayer(-1)}
              className="w-12 h-12 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center text-xl shadow-lg"
            >
              &lt;
            </button>
            <button
              onClick={() => movePlayer(1)}
              className="w-12 h-12 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center text-xl shadow-lg"
            >
              &gt;
            </button>
            <button
              onClick={() => drop()}
              className="w-12 h-12 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center text-xl shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a.5.5 0 01-.354-.854l4-4a.5.5 0 01.708.708l-3.646 3.646L10 18zM6 13a.5.5 0 01-.354-.854l4-4a.5.5 0 01.708.708l-3.646 3.646L6 13zM10 2a.5.5 0 01.5.5V17a.5.5 0 01-1 0V2.5a.5.5 0 01.5-.5z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => rotate(player.tetromino)}
              className="w-12 h-12 bg-blue-600 active:bg-blue-500 rounded-full flex items-center justify-center text-xl shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.42 10l-4.21-4.21m0 0a3.422 3.422 0 000-4.842A3.422 3.422 0 0015.58 6.58L10.58 11.58M15.58 6.58L10.58 11.58M4.21 19.42L19.42 4.21" />
              </svg>
            </button>
            <button
              onClick={hardDrop}
              className="w-12 h-12 bg-red-600 active:bg-red-500 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
            >
              HARD<br />DROP
            </button>
          </div>
          <div className="md:hidden w-full text-center text-gray-400 text-xs mt-2">
            <p>P: Pause | R: Restart</p>
          </div>
        </div>

        {/* Right Side (PC) */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex flex-col gap-4 p-4 rounded-lg bg-black/30 border border-gray-700 shadow-2xl shadow-purple-500/10 w-full max-w-sm">
            <div className="flex justify-around w-full">
              <button
                onClick={() => movePlayer(-1)}
                className="w-16 h-16 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center text-2xl shadow-lg"
              >
                &lt;
              </button>
              <button
                onClick={() => movePlayer(1)}
                className="w-16 h-16 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center text-2xl shadow-lg"
              >
                &gt;
              </button>
            </div>
            <div className="flex justify-around w-full">
              <button
                onClick={() => drop()}
                className="w-16 h-16 bg-gray-700 active:bg-gray-600 rounded-full flex items-center justify-center text-2xl shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a.5.5 0 01-.354-.854l4-4a.5.5 0 01.708.708l-3.646 3.646L10 18zM6 13a.5.5 0 01-.354-.854l4-4a.5.5 0 01.708.708l-3.646 3.646L6 13zM10 2a.5.5 0 01.5.5V17a.5.5 0 01-1 0V2.5a.5.5 0 01.5-.5z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => rotate(player.tetromino)}
                className="w-16 h-16 bg-blue-600 active:bg-blue-500 rounded-full flex items-center justify-center text-2xl shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.42 10l-4.21-4.21m0 0a3.422 3.422 0 000-4.842A3.422 3.422 0 0015.58 6.58L10.58 11.58M15.58 6.58L10.58 11.58M4.21 19.42L19.42 4.21" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center w-full">
              <button
                onClick={hardDrop}
                className="w-36 h-16 bg-red-600 active:bg-red-500 rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
              >
                HARD DROP
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Universal control bar at the bottom for all screen sizes */}
      <div className="flex flex-col md:flex-row gap-2 mt-4 w-full justify-center max-w-sm">
        <div className="flex justify-between w-full">
          <div className="p-3 bg-black/30 border border-gray-700 rounded-lg text-sm text-center w-1/3">
            <h3 className="text-sm font-bold text-purple-400">SCORE</h3>
            <p className="text-lg tracking-wider">{score}</p>
          </div>
          <div className="p-3 bg-black/30 border border-gray-700 rounded-lg text-sm text-center w-1/3 mx-2">
            <h3 className="text-sm font-bold text-purple-400">LEVEL</h3>
            <p className="text-lg tracking-wider">{level}</p>
          </div>
          <div className="p-3 bg-black/30 border border-gray-700 rounded-lg text-sm text-center w-1/3">
            <h3 className="text-sm font-bold text-purple-400">NEXT</h3>
            <div className="flex items-center justify-center">
              <MiniBoard tetromino={nextTetromino} />
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsPaused((p) => !p)}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-bold transition-colors"
        >
          {isPaused ? "Resume (P)" : "Pause (P)"}
        </button>
        <button
          onClick={handleRestart}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md font-bold transition-colors"
        >
          Restart (R)
        </button>
        <a
          href="https://tetris-five-smoky.vercel.app/"
          className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md font-bold transition-colors text-center"
          target="_self"
        >
          Go to PC
        </a>
      </div>
    </div>
  );
}
