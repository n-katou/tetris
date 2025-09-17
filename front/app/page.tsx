"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';

// 定数定義
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// テトリミノ（ブロックの形）と色
const TETROMINOS = {
  0: { shape: [[0]], color: 'transparent' }, // 空のセル
  I: {
    shape: [
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
      [0, 'I', 0, 0],
    ],
    color: 'bg-cyan-500 shadow-[0_0_10px_theme(colors.cyan.400)]',
  },
  J: {
    shape: [
      [0, 'J', 0],
      [0, 'J', 0],
      ['J', 'J', 0],
    ],
    color: 'bg-blue-500 shadow-[0_0_10px_theme(colors.blue.400)]',
  },
  L: {
    shape: [
      [0, 'L', 0],
      [0, 'L', 0],
      [0, 'L', 'L'],
    ],
    color: 'bg-orange-500 shadow-[0_0_10px_theme(colors.orange.400)]',
  },
  O: {
    shape: [
      ['O', 'O'],
      ['O', 'O'],
    ],
    color: 'bg-yellow-500 shadow-[0_0_10px_theme(colors.yellow.400)]',
  },
  S: {
    shape: [
      [0, 'S', 'S'],
      ['S', 'S', 0],
      [0, 0, 0],
    ],
    color: 'bg-green-500 shadow-[0_0_10px_theme(colors.green.400)]',
  },
  T: {
    shape: [
      [0, 0, 0],
      ['T', 'T', 'T'],
      [0, 'T', 0],
    ],
    color: 'bg-purple-500 shadow-[0_0_10px_theme(colors.purple.400)]',
  },
  Z: {
    shape: [
      ['Z', 'Z', 0],
      [0, 'Z', 'Z'],
      [0, 0, 0],
    ],
    color: 'bg-red-500 shadow-[0_0_10px_theme(colors.red.400)]',
  },
};

// ゲームボードを作成するヘルパー関数
const createBoard = () => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill([0, 'clear']));

// メインのゲームコンポーネント
export default function TetrisGame() {
  // ゲームの状態管理
  const [board, setBoard] = useState(createBoard());
  const [player, setPlayer] = useState({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOS[0].shape,
    collided: false,
  });
  const [nextTetromino, setNextTetromino] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [rows, setRows] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameAreaRef = useRef(null);

  // テトリミノをランダムに生成
  const randomTetromino = useCallback(() => {
    const tetrominos = 'IJLOSTZ';
    const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
    return TETROMINOS[randTetromino];
  }, []);

  // プレイヤーをリセット
  const resetPlayer = useCallback(() => {
    const newTetromino = nextTetromino || randomTetromino();
    const newNextTetromino = randomTetromino();
    setNextTetromino(newNextTetromino);

    setPlayer({
      pos: { x: BOARD_WIDTH / 2 - 1, y: 0 },
      tetromino: newTetromino.shape,
      collided: false,
    });
  }, [nextTetromino, randomTetromino]);

  useEffect(() => {
    if (!nextTetromino) {
      resetPlayer();
    }
  }, [nextTetromino, resetPlayer]);

  // 衝突検知
  const checkCollision = (player, board, { x: moveX, y: moveY }) => {
    for (let y = 0; y < player.tetromino.length; y += 1) {
      for (let x = 0; x < player.tetromino[y].length; x += 1) {
        if (player.tetromino[y][x] !== 0) {
          if (
            !board[y + player.pos.y + moveY] ||
            !board[y + player.pos.y + moveY][x + player.pos.x + moveX] ||
            board[y + player.pos.y + moveY][x + player.pos.x + moveX][1] !== 'clear'
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // プレイヤーの移動
  const movePlayer = (dir) => {
    if (!checkCollision(player, board, { x: dir, y: 0 })) {
      setPlayer(prev => ({
        ...prev,
        pos: { x: prev.pos.x + dir, y: prev.pos.y },
      }));
    }
  };

  // プレイヤーの落下
  const drop = () => {
    if (!checkCollision(player, board, { x: 0, y: 1 })) {
      setPlayer(prev => ({
        ...prev,
        pos: { x: prev.pos.x, y: prev.pos.y + 1 },
        collided: false,
      }));
    } else {
      if (player.pos.y < 1) {
        setIsGameOver(true);
        return;
      }
      setPlayer(prev => ({
        ...prev,
        collided: true,
      }));
    }
  };

  // プレイヤーの回転
  const rotate = (matrix) => {
    const rotatedTetromino = matrix.map((_, index) => matrix.map(col => col[index]));
    const reversedTetromino = rotatedTetromino.map(row => row.reverse());

    const originalPos = player.pos;
    let offset = 1;
    const newPlayer = { ...player, tetromino: reversedTetromino };

    while (checkCollision(newPlayer, board, { x: 0, y: 0 })) {
      newPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > newPlayer.tetromino[0].length) {
        setPlayer(prev => ({ ...prev, pos: originalPos })); // 回転できない場合は元に戻す
        return;
      }
    }
    setPlayer(newPlayer);
  };

  // ゲームボードの更新
  useEffect(() => {
    if (!player.collided) return;

    const newBoard = board.map(row =>
      row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] : cell))
    );

    player.tetromino.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          newBoard[y + player.pos.y][x + player.pos.x] = [
            value,
            'merged',
          ];
        }
      });
    });

    // 行のクリア処理
    let clearedRows = 0;
    const sweptBoard = newBoard.reduce((ack, row) => {
      if (row.every(cell => cell[1] === 'merged')) {
        clearedRows += 1;
        ack.unshift(Array(BOARD_WIDTH).fill([0, 'clear']));
        return ack;
      }
      ack.push(row);
      return ack;
    }, []);

    if (clearedRows > 0) {
      // スコア計算
      const linePoints = [0, 40, 100, 300, 1200];
      setScore(prev => prev + linePoints[clearedRows] * level);
      setRows(prev => prev + clearedRows);
    }

    setBoard(sweptBoard);
    resetPlayer();
  }, [player.collided, board, resetPlayer, level]);

  // レベルアップ処理
  useEffect(() => {
    if (rows >= level * 10) {
      setLevel(prev => prev + 1);
    }
  }, [rows, level]);

  // ゲームループ
  const dropInterval = 1000 / level + 200;
  const dropTime = useRef(null);

  const gameLoop = useCallback(() => {
    if (!isPaused && !isGameOver) {
      drop();
    }
    dropTime.current = setTimeout(gameLoop, dropInterval);
  }, [isPaused, isGameOver, drop, dropInterval]);

  useEffect(() => {
    if (gameAreaRef.current) gameAreaRef.current.focus();
    dropTime.current = setTimeout(gameLoop, dropInterval);
    return () => clearTimeout(dropTime.current);
  }, [gameLoop, dropInterval]);

  // キー操作
  const handleKeyDown = (e) => {
    if (isGameOver) return;

    if (e.key === 'p' || e.key === 'P') {
      setIsPaused(prev => !prev);
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      handleRestart();
      return;
    }

    if (isPaused) return;

    if (e.key === 'ArrowLeft') {
      movePlayer(-1);
    } else if (e.key === 'ArrowRight') {
      movePlayer(1);
    } else if (e.key === 'ArrowDown') {
      drop();
    } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault(); // スペースキーでのページスクロールを防止
      rotate(player.tetromino);
    }
  };

  // ゲームの開始/リスタート
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

  // セルをレンダリングするコンポーネント
  const Cell = ({ type }) => {
    const color = type === 0 ? 'bg-gray-800/50' : TETROMINOS[type].color;
    const baseStyle = "w-full h-full rounded-sm";
    return <div className={`${baseStyle} ${color}`}></div>;
  };

  // ネクストブロック表示用のミニボード
  const MiniBoard = ({ tetromino }) => (
    <div className="grid grid-cols-4 grid-rows-4 gap-px">
      {tetromino?.shape.map((row, y) =>
        row.map((cell, x) => (
          <div key={`${y}-${x}`} className={`w-4 h-4 rounded-sm ${cell ? TETROMINOS[cell].color : 'bg-transparent'}`}></div>
        ))
      )}
      {!tetromino && Array(16).fill(0).map((_, i) => <div key={i} className="w-4 h-4"></div>)}
    </div>
  );


  // 描画
  return (
    <div
      className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white font-mono flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={gameAreaRef}
    >
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* ゲームボード */}
        <div className="relative border-2 border-gray-700 rounded-lg p-2 bg-black/30 backdrop-blur-sm shadow-2xl shadow-purple-500/10">
          <div
            className="grid gap-px"
            style={{
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
              width: 'min(70vw, 300px)',
              height: 'min(140vw, 600px)',
            }}
          >
            {board.map((row, y) =>
              row.map((cell, x) => (
                <Cell key={`${y}-${x}`} type={cell[0]} />
              ))
            )}
            {/* 現在のプレイヤーピースを描画 */}
            {player.tetromino.map((row, y) =>
              row.map((value, x) =>
                value !== 0 && (
                  <div
                    key={`${y}-${x}`}
                    className="absolute rounded-sm"
                    style={{
                      top: `${(player.pos.y + y) * (100 / BOARD_HEIGHT)}%`,
                      left: `${(player.pos.x + x) * (100 / BOARD_WIDTH)}%`,
                      width: `${100 / BOARD_WIDTH}%`,
                      height: `${100 / BOARD_HEIGHT}%`,
                      padding: '1px'
                    }}
                  >
                    <div className={`w-full h-full rounded-sm ${TETROMINOS[value].color}`}></div>
                  </div>
                )
              )
            )}
          </div>
          {/* ゲームオーバー/一時停止のオーバーレイ */}
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

        {/* サイドパネル */}
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
            <p><strong>Level:</strong> {level}</p>
            <p><strong>Lines:</strong> {rows}</p>
          </div>
          <div className="w-full flex flex-row md:flex-col gap-2">
            <button
              onClick={() => setIsPaused(p => !p)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-bold transition-colors"
            >
              {isPaused ? 'Resume (P)' : 'Pause (P)'}
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
            <p>↑ / Space: Rotate</p>
            <p>↓: Soft Drop</p>
          </div>
        </div>
      </div>
    </div>
  );
}

