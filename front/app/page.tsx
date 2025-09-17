"use client";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";

// Constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const GAME_SPEED = 200; // Drop speed base in ms

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

export default function TetrisGame(): JSX.Element {
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
  const MiniBoard: React.FC<{ tetromino: TetrominoData | null }> = ({ tetromino }) => (
    <div className="grid grid-cols-4 grid-rows-4 gap-px">
      {tetromino?.shape.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${y}-${x}`}
            className={`w-4 h-4 rounded-sm ${cell ? TETROMINOS[String(cell)].color : "bg-transparent"}`}
          />
        ))
      )}
      {!tetromino && Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-4 h-4" />)}
    </div>
  );

  return (
    <div
      className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white font-mono flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={gameAreaRef}
    >
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Game Board */}
        <div className="relative border-2 border-gray-700 rounded-lg p-2 bg-black/30 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
              width: "min(70vw, 300px)",
              height: "min(140vw, 600px)",
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

        {/* Side Panel */}
        <div className="w-full md:w-48 flex flex-row md:flex-col gap-4">
          <div className="flex-1 p-4 bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg">
            <h3 className="text-lg font-bold text-purple-400 mb-2">SCORE</h3>
            <p className="text-3xl tracking-wider">{score}</p>
          </div>

          <div className="flex-1 p-4 bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg">
            <h3 className="text-lg font-bold text-purple-400 mb-2">NEXT</h3>
            <div className="flex items-center justify-center h-16">
              <MiniBoard tetromino={nextTetromino} />
            </div>
          </div>

          <div className="w-full p-4 bg-black/30 backdrop-blur-sm border border-gray-700 rounded-lg">
            <p>
              <strong>Level:</strong> {level}
            </p>
            <p>
              <strong>Lines:</strong> {rows}
            </p>
          </div>

          <div className="w-full flex flex-row md:flex-col gap-2">
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
          </div>

          <div className="w-full p-3 bg-black/30 border border-gray-700 rounded-lg text-sm text-gray-400 hidden md:block">
            <h4 className="font-bold text-white mb-1">Controls</h4>
            <p>← →: Move</p>
            <p>↑: Rotate</p>
            <p>↓: Soft Drop</p>
            <p>Space: Hard Drop</p>
          </div>
        </div>
      </div>
    </div>
  );
}
