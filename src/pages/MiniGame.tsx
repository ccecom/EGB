// src/pages/MiniGame.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

type Point = { x: number; y: number };
type AnimalType = 'chick' | 'hen' | 'rooster';

type Animal = Point & {
  id: number;
  type: AnimalType;
  vx: number;
  vy: number;
  state: 'wander' | 'flee' | 'idle';
  idleTimer: number;
};

type PowerUp = Point & {
  id: number;
  type: 'golden_egg';
  life: number;
};

type GameState = {
  farmer: Point;
  animals: Animal[];
  powerUps: PowerUp[];
  carried: number;
  score: number;
  combo: number;
  lastCatchTime: number;
  speedBoostUntil: number;
};

const WORLD_SIZE = 100;
const FARMER_RADIUS = 3.2;
const ANIMAL_RADIUS = 2.9;
const COOP_BOUNDS = { minX: 82, maxX: 100, minY: 82, maxY: 100 };
const ROUND_SECONDS = 55;
const MAX_CARRY = 6;

const POINTS: Record<AnimalType, number> = {
  chick: 3,
  hen: 6,
  rooster: 12,
};

// Single highest-tier reward only — never stacked
const REWARD_TIERS = [
  { score: 35, discount: 25, label: 'Farm Helper', type: 'fixed' },
  { score: 70, discount: 50, label: 'Chicken Keeper', type: 'fixed' },
  { score: 120, discount: 100, label: 'Farm Master', type: 'fixed' },
] as const;

const ANIMAL_EMOJI: Record<AnimalType, string> = {
  chick: '🐤',
  hen: '🐔',
  rooster: '🐓',
};

const ANIMAL_SPEED: Record<AnimalType, number> = {
  chick: 0.72,
  hen: 0.48,
  rooster: 0.40,
};

const GAME_REWARD_PREFIX = 'EGB-';

function isGameRewardCoupon(c: { code?: string; is_game_reward?: boolean; source?: string }) {
  return (
    Boolean(c.is_game_reward) ||
    c.source === 'game' ||
    String(c.code || '').toUpperCase().startsWith(GAME_REWARD_PREFIX)
  );
}

export default function MiniGame() {
  const { user } = useAuth();
  const cartContext = useCart() as any;

  const refreshCoupons =
    cartContext?.refreshCoupons ||
    cartContext?.fetchCoupons ||
    (() => {});

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [comboDisplay, setComboDisplay] = useState(0);

  const [game, setGame] = useState<GameState>({
    farmer: { x: 15, y: 15 },
    animals: [],
    powerUps: [],
    carried: 0,
    score: 0,
    combo: 0,
    lastCatchTime: 0,
    speedBoostUntil: 0,
  });

  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('egb_farm_highscore')) || 0;
    } catch {
      return 0;
    }
  });

  const [earnedCode, setEarnedCode] = useState<{
    code: string;
    discount: number;
    label: string;
    type: string;
    expiresAt: string;
  } | null>(null);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [catchFlash, setCatchFlash] = useState(false);

  const moveVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobPosition, setKnobPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const joystickRef = useRef<HTMLDivElement>(null);

  const gameRef = useRef<GameState>(game);
  const animalIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const rewardClaimedRef = useRef(false);

  const isInsideCoop = useCallback((p: Point) => {
    return (
      p.x >= COOP_BOUNDS.minX &&
      p.x <= COOP_BOUNDS.maxX &&
      p.y >= COOP_BOUNDS.minY &&
      p.y <= COOP_BOUNDS.maxY
    );
  }, []);

  const createAnimal = useCallback((x: number, y: number): Animal => {
    const roll = Math.random();
    const type: AnimalType =
      roll < 0.5 ? 'chick' : roll < 0.82 ? 'hen' : 'rooster';
    const angle = Math.random() * Math.PI * 2;
    const speed = ANIMAL_SPEED[type] * (0.75 + Math.random() * 0.55);

    return {
      id: ++animalIdRef.current,
      type,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      state: 'wander',
      idleTimer: 0,
    };
  }, []);

  const spawnAnimals = useCallback(
    (count: number, farmer: Point, existing: Animal[] = []): Animal[] => {
      const list = [...existing];
      let tries = 0;
      while (list.length < count && tries < 400) {
        tries++;
        const candidate = {
          x: Math.random() * (WORLD_SIZE - 14) + 7,
          y: Math.random() * (WORLD_SIZE - 14) + 7,
        };

        if (
          !isInsideCoop(candidate) &&
          Math.hypot(candidate.x - farmer.x, candidate.y - farmer.y) > 22
        ) {
          list.push(createAnimal(candidate.x, candidate.y));
        }
      }
      return list;
    },
    [isInsideCoop, createAnimal]
  );

  const handleUnlockHighestReward = useCallback(
    async (finalScore: number) => {
      if (rewardClaimedRef.current) return;
      rewardClaimedRef.current = true;

      const qualifiedTiers = REWARD_TIERS.filter((t) => finalScore >= t.score);
      if (qualifiedTiers.length === 0) {
        setEarnedCode(null);
        return;
      }

      const bestTier = qualifiedTiers[qualifiedTiers.length - 1];
      const cappedDiscount = Math.min(100, bestTier.discount);
      const generatedCode = `EGB-${Math.floor(100000 + Math.random() * 900000)}`;
      const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const reward = {
        code: generatedCode,
        discount: cappedDiscount,
        label: bestTier.label,
        type: bestTier.type,
        expiresAt: expirationDate.toLocaleDateString(),
      };

      try {
        const existingLocal = JSON.parse(
          localStorage.getItem('egb_saved_coupons') || '[]'
        ) as Array<Record<string, unknown>>;

        const nonGameOnly = existingLocal.filter(
          (c) => !isGameRewardCoupon(c as { code?: string; is_game_reward?: boolean; source?: string })
        );

        nonGameOnly.push({
          code: generatedCode,
          discount: cappedDiscount,
          type: bestTier.type,
          description: `EGB Backyard Farm Catcher · ${bestTier.label}`,
          is_game_reward: true,
          source: 'game',
          created_at: new Date().toISOString(),
          expires_at: expirationDate.toISOString(),
          gained_at: new Date().toISOString(),
        });

        localStorage.setItem('egb_saved_coupons', JSON.stringify(nonGameOnly));
      } catch {
        // ignore
      }

      try {
        const apiUrl = (
          import.meta.env.VITE_API_BASE_URL ||
          'https://cc-backend-production-00fe.up.railway.app/api/v1'
        ).replace(/\/+$/, '');

        const token =
          localStorage.getItem('token') ||
          localStorage.getItem('access_token');

        await fetch(`${apiUrl}/coupons/claim-game-reward`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            code: generatedCode,
            discount: cappedDiscount,
            type: bestTier.type,
            description: `EGB Backyard Farm Catcher · ${bestTier.label}`,
            is_game_reward: true,
            source: 'game',
            replace_previous_game_rewards: true,
          }),
        });

        await refreshCoupons();
      } catch (err) {
        console.log('EGB Backyard reward synced locally.', err);
      }

      setEarnedCode(reward);
    },
    [refreshCoupons]
  );

  const animateGame = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const current = gameRef.current;
    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;

    const difficulty = 1 + Math.min(0.75, elapsed / 55);
    const hasBoost = now < current.speedBoostUntil;
    const farmerSpeed = hasBoost ? 1.18 : 0.82;

    let nextX = current.farmer.x + moveVector.current.x * farmerSpeed;
    let nextY = current.farmer.y + moveVector.current.y * farmerSpeed;

    nextX = Math.max(3.5, Math.min(WORLD_SIZE - 3.5, nextX));
    nextY = Math.max(3.5, Math.min(WORLD_SIZE - 3.5, nextY));

    let carried = current.carried;
    let scoreNow = current.score;
    let combo = current.combo;
    let lastCatchTime = current.lastCatchTime;
    let animals = [...current.animals];
    let powerUps = [...current.powerUps];
    let speedBoostUntil = current.speedBoostUntil;

    const remaining: Animal[] = [];
    let justCaught = 0;

    for (const animal of animals) {
      const dist = Math.hypot(animal.x - nextX, animal.y - nextY);
      if (dist < FARMER_RADIUS + ANIMAL_RADIUS && carried < MAX_CARRY) {
        carried += 1;
        justCaught += 1;

        if (now - lastCatchTime < 1400) {
          combo += 1;
        } else {
          combo = 1;
        }
        lastCatchTime = now;

        const base = POINTS[animal.type];
        const comboBonus = Math.min(combo - 1, 4) * 2;
        scoreNow += base + comboBonus;
      } else {
        remaining.push(animal);
      }
    }
    animals = remaining;

    if (justCaught > 0) {
      setCatchFlash(true);
      setTimeout(() => setCatchFlash(false), 160);
      setComboDisplay(combo);
    }

    powerUps = powerUps.filter((pu) => {
      const dist = Math.hypot(pu.x - nextX, pu.y - nextY);
      if (dist < FARMER_RADIUS + 3.2) {
        if (pu.type === 'golden_egg') {
          scoreNow += 12;
          speedBoostUntil = now + 3800;
        }
        return false;
      }
      return true;
    });

    if (isInsideCoop({ x: nextX, y: nextY }) && carried > 0) {
      scoreNow += carried * 2;
      carried = 0;
      combo = 0;
    }

    animals = animals.map((animal) => {
      let { x, y, vx, vy, state, idleTimer, type } = animal;
      const baseSpeed = ANIMAL_SPEED[type] * difficulty;
      const distToFarmer = Math.hypot(x - nextX, y - nextY);

      if (distToFarmer < 22) {
        state = 'flee';
        const angle = Math.atan2(y - nextY, x - nextX);
        const fleeForce =
          type === 'chick' ? 1.55 : type === 'hen' ? 1.28 : 1.12;
        vx = Math.cos(angle) * baseSpeed * fleeForce;
        vy = Math.sin(angle) * baseSpeed * fleeForce;
      } else if (state === 'flee' && distToFarmer > 32) {
        state = 'wander';
      }

      if (state === 'wander' && Math.random() < 0.006) {
        state = 'idle';
        idleTimer = 18 + Math.random() * 28;
        vx *= 0.12;
        vy *= 0.12;
      }

      if (state === 'idle') {
        idleTimer -= 1;
        if (idleTimer <= 0) {
          state = 'wander';
          const angle = Math.random() * Math.PI * 2;
          vx = Math.cos(angle) * baseSpeed * (0.8 + Math.random() * 0.5);
          vy = Math.sin(angle) * baseSpeed * (0.8 + Math.random() * 0.5);
        }
      }

      if (state === 'wander' && Math.random() < 0.018) {
        const angle = Math.random() * Math.PI * 2;
        vx = Math.cos(angle) * baseSpeed * (0.7 + Math.random() * 0.65);
        vy = Math.sin(angle) * baseSpeed * (0.7 + Math.random() * 0.65);
      }

      if (x < 8) vx += 0.1;
      if (x > WORLD_SIZE - 8) vx -= 0.1;
      if (y < 8) vy += 0.1;
      if (y > WORLD_SIZE - 8) vy -= 0.1;

      if (x > COOP_BOUNDS.minX - 8 && y > COOP_BOUNDS.minY - 8) {
        vx -= 0.16;
        vy -= 0.16;
      }

      x += vx;
      y += vy;
      vx *= 0.988;
      vy *= 0.988;

      x = Math.max(4, Math.min(WORLD_SIZE - 4, x));
      y = Math.max(4, Math.min(WORLD_SIZE - 4, y));

      if (isInsideCoop({ x, y })) {
        x = Math.min(x, COOP_BOUNDS.minX - 1);
        y = Math.min(y, COOP_BOUNDS.minY - 1);
        vx = -Math.abs(vx) * 0.7;
        vy = -Math.abs(vy) * 0.7;
      }

      return { ...animal, x, y, vx, vy, state, idleTimer };
    });

    const targetCount = Math.min(11, 6 + Math.floor(elapsed / 18));
    if (animals.length < targetCount) {
      animals = spawnAnimals(targetCount, { x: nextX, y: nextY }, animals);
    }

    if (Math.random() < 0.0016 && powerUps.length < 1) {
      const px = 10 + Math.random() * 58;
      const py = 10 + Math.random() * 58;
      if (!isInsideCoop({ x: px, y: py })) {
        powerUps.push({
          id: ++powerUpIdRef.current,
          type: 'golden_egg',
          x: px,
          y: py,
          life: 420,
        });
      }
    }

    powerUps = powerUps
      .map((pu) => ({ ...pu, life: pu.life - 1 }))
      .filter((pu) => pu.life > 0);

    const nextState: GameState = {
      farmer: { x: nextX, y: nextY },
      animals,
      powerUps,
      carried,
      score: scoreNow,
      combo,
      lastCatchTime,
      speedBoostUntil,
    };

    gameRef.current = nextState;
    setGame(nextState);
    setScore(scoreNow);

    requestRef.current = requestAnimationFrame(animateGame);
  }, [isPlaying, isPaused, isInsideCoop, spawnAnimals]);

  useEffect(() => {
    if (isPlaying && !isPaused) {
      requestRef.current = requestAnimationFrame(animateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isPaused, animateGame]);

  const finishGame = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    moveVector.current = { x: 0, y: 0 };
    setKnobPosition({ x: 0, y: 0 });

    const finalScore = gameRef.current.score;
    setHighScore((prev) => {
      const next = Math.max(prev, finalScore);
      try {
        localStorage.setItem('egb_farm_highscore', String(next));
      } catch {}
      return next;
    });

    void handleUnlockHighestReward(finalScore);
    setGameOver(true);
  }, [handleUnlockHighestReward]);

  const startGame = useCallback(() => {
    const farmer = { x: 15, y: 15 };
    const initialState: GameState = {
      farmer,
      animals: spawnAnimals(6, farmer),
      powerUps: [],
      carried: 0,
      score: 0,
      combo: 0,
      lastCatchTime: 0,
      speedBoostUntil: 0,
    };

    animalIdRef.current = 0;
    powerUpIdRef.current = 0;
    moveVector.current = { x: 0, y: 0 };
    startTimeRef.current = performance.now();
    rewardClaimedRef.current = false;

    setKnobPosition({ x: 0, y: 0 });
    setEarnedCode(null);
    setCopyFeedback(false);
    setTimeLeft(ROUND_SECONDS);
    setGameOver(false);
    setIsPaused(false);
    setComboDisplay(0);

    gameRef.current = initialState;
    setGame(initialState);
    setScore(0);
    setIsPlaying(true);
  }, [spawnAnimals]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current !== null) clearInterval(timerRef.current);
          window.setTimeout(finishGame, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isPlaying, isPaused, finishGame]);

  useEffect(() => {
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        if (isPlaying) setIsPaused((prev) => !prev);
        return;
      }
      keysPressed[e.key] = true;
      updateVectorFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key] = false;
      updateVectorFromKeys();
    };

    const updateVectorFromKeys = () => {
      let vx = 0;
      let vy = 0;
      if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W'])
        vy -= 1;
      if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S'])
        vy += 1;
      if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A'])
        vx -= 1;
      if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D'])
        vx += 1;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }

      moveVector.current = { x: vx, y: vy };
      setKnobPosition({ x: vx * 35, y: vy * 35 });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  const handleJoystickPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPlaying || isPaused || !joystickRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;
    const distance = Math.hypot(rawDx, rawDy);
    const maxRadius = rect.width / 2 - 10;

    if (distance < 5) {
      moveVector.current = { x: 0, y: 0 };
      setKnobPosition({ x: 0, y: 0 });
      return;
    }

    const angle = Math.atan2(rawDy, rawDx);
    const clampedDist = Math.min(distance, maxRadius);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    moveVector.current = {
      x: Math.cos(angle) * (clampedDist / maxRadius),
      y: Math.sin(angle) * (clampedDist / maxRadius),
    };

    setKnobPosition({ x: knobX, y: knobY });
  };

  const stopJoystick = () => {
    moveVector.current = { x: 0, y: 0 };
    setKnobPosition({ x: 0, y: 0 });
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      window.prompt('Copy code:', code);
    }
  };

  const nextTier = REWARD_TIERS.find((t) => t.score > score);
  const progress = Math.min(100, (score / 120) * 100);
  const hasBoost = performance.now() < game.speedBoostUntil;

  return (
    <main className="min-h-screen bg-[#f7f5ec] px-3 pb-8 pt-20 font-sans text-[#273b28] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-4 text-center">
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#d6e3cb] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#527447]">
            <span>🌱</span> EGB Backyard Farm Games
          </div>
          <h1 className="text-2xl font-black text-[#294c2c] sm:text-4xl">
            EGB Backyard · Farm Catcher 🐓
          </h1>
          <p className="mt-1 text-xs text-[#6b7a62]">
            Catch. Deliver. Earn one coupon — your highest tier only.
          </p>
        </header>

        <section className="mb-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#dfe6d5] bg-white p-3.5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#829078]">
              Your EGB Backyard Coupon
            </div>
            {earnedCode ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xl font-black text-[#315c34]">
                    ₱{earnedCode.discount} OFF
                  </div>
                  <div className="text-[10px] text-[#7b8874]">
                    {earnedCode.label} · Single reward · Auto-saved
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(earnedCode.code)}
                  className="rounded-lg bg-[#315c34] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#244727] shrink-0"
                >
                  {copyFeedback ? 'Copied!' : earnedCode.code}
                </button>
              </div>
            ) : (
              <div className="mt-1">
                <div className="text-lg font-black text-[#315c34]">
                  Earn Up To ₱100 OFF
                </div>
                <div className="text-[11px] text-[#7b8874]">
                  One round → one coupon. Only your highest milestone counts.
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#dfe6d5] bg-[#eaf0df] p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#315c34]">
              <span>Next Milestone</span>
              <span>
                {nextTier ? `₱${nextTier.discount} OFF` : 'Max ₱100 Reached!'}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[#6b974f] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#718367]">
              <span>{score} pts</span>
              <span>{nextTier ? `${nextTier.score} pts` : '120 pts'}</span>
            </div>
          </div>
        </section>

        <section className="mb-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border border-[#e2e6d9] bg-white py-2">
            <div className="text-[10px] font-bold uppercase text-[#8b9682]">
              Score
            </div>
            <div className="text-xl font-black text-[#315c34]">{score}</div>
          </div>
          <div className="rounded-xl border border-[#e2e6d9] bg-white py-2">
            <div className="text-[10px] font-bold uppercase text-[#8b9682]">
              Time
            </div>
            <div
              className={`text-xl font-black ${
                timeLeft <= 10 ? 'text-red-600' : 'text-[#315c34]'
              }`}
            >
              {timeLeft}s
            </div>
          </div>
          <div className="rounded-xl border border-[#e2e6d9] bg-white py-2">
            <div className="text-[10px] font-bold uppercase text-[#8b9682]">
              Combo
            </div>
            <div className="text-xl font-black text-[#d97706]">
              {comboDisplay > 1 ? `x${comboDisplay}` : '–'}
            </div>
          </div>
          <div className="rounded-xl border border-[#e2e6d9] bg-white py-2">
            <div className="text-[10px] font-bold uppercase text-[#8b9682]">
              High
            </div>
            <div className="text-xl font-black text-[#315c34]">{highScore}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#d9e1cd] bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-[#e3e9dc] bg-[#edf2e5] px-4 py-2.5">
            <div className="text-xs font-black text-[#315c34]">
              🌾 EGB Backyard Playfield
            </div>
            {isPlaying && (
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="rounded-lg border border-[#cbd9bf] bg-white px-3 py-1 text-xs font-bold text-[#315c34]"
              >
                {isPaused ? '▶ Resume' : 'Ⅱ Pause'}
              </button>
            )}
          </div>

          <div className="p-2 sm:p-4">
            {!isPlaying && !gameOver ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-[#f1f5e9] px-4 py-8 text-center">
                <div className="mb-2 text-5xl">🧑‍🌾 🐤</div>
                <h3 className="text-xl font-black text-[#315c34]">
                  EGB Backyard Challenge
                </h3>
                <p className="mt-1 max-w-sm text-xs text-[#71806c]">
                  Animals flee farther and run faster. Basket holds only{' '}
                  {MAX_CARRY}. You get{' '}
                  <strong>one coupon</strong> — the highest tier you reach at
                  the end of the round.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-[#5a6b52]">
                  <span>🐤 3pts (fast)</span>
                  <span>🐔 6pts</span>
                  <span>🐓 12pts</span>
                  <span>🥚 +12 & boost</span>
                </div>
                <div className="mt-2 text-[10px] text-[#829078]">
                  Tiers: 35 → ₱25 · 70 → ₱50 · 120 → ₱100
                </div>
                <button
                  type="button"
                  onClick={startGame}
                  className="mt-5 rounded-xl bg-[#315c34] px-7 py-3 text-sm font-black text-white shadow-md transition active:scale-95"
                >
                  Start EGB Backyard →
                </button>
              </div>
            ) : gameOver ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-[#f1f5e9] px-4 py-8 text-center">
                <div className="text-5xl">🏆</div>
                <h3 className="mt-2 text-2xl font-black text-[#315c34]">
                  Round Over!
                </h3>
                <p className="mt-1 text-sm text-[#71806c]">
                  You scored {score} points on EGB Backyard.
                </p>
                {earnedCode ? (
                  <div className="mt-3 w-full max-w-xs rounded-xl border border-[#d6e3cb] bg-white p-3 text-left shadow-xs">
                    <div className="text-[10px] font-bold uppercase text-[#829078]">
                      Your Single Reward
                    </div>
                    <div className="text-lg font-black text-[#315c34]">
                      ₱{earnedCode.discount} OFF · {earnedCode.label}
                    </div>
                    <div className="mt-1 font-mono text-xs font-bold text-slate-700">
                      {earnedCode.code}
                    </div>
                    <div className="mt-1 text-[10px] text-[#7b8874]">
                      Expires {earnedCode.expiresAt} · Replaces any prior game
                      coupon
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-rose-600">
                    Score at least 35 points to earn an EGB Backyard coupon!
                  </p>
                )}
                {score >= highScore && score > 0 && (
                  <p className="mt-2 text-xs font-bold text-[#d97706]">
                    New High Score!
                  </p>
                )}
                <button
                  type="button"
                  onClick={startGame}
                  className="mt-5 rounded-xl bg-[#315c34] px-6 py-3 text-xs font-bold text-white"
                >
                  Play Again ↻
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`relative aspect-square w-full max-w-[420px] select-none overflow-hidden rounded-xl border-4 shadow-inner transition-colors ${
                    catchFlash
                      ? 'border-yellow-400 bg-[#e8f5d0]'
                      : hasBoost
                        ? 'border-amber-400 bg-[#e8f0c8]'
                        : 'border-[#9ab47b] bg-[#dfeccf]'
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-4 opacity-20">
                    <div className="bg-[#c9dfb6]" />
                    <div />
                    <div className="bg-[#c9dfb6]" />
                    <div />
                  </div>

                  <div
                    className="absolute flex flex-col items-center justify-center rounded-tl-xl border-t-2 border-l-2 border-[#9b6037] bg-[#f1c78f]"
                    style={{
                      left: `${COOP_BOUNDS.minX}%`,
                      top: `${COOP_BOUNDS.minY}%`,
                      width: `${COOP_BOUNDS.maxX - COOP_BOUNDS.minX}%`,
                      height: `${COOP_BOUNDS.maxY - COOP_BOUNDS.minY}%`,
                    }}
                  >
                    <span className="text-lg leading-none sm:text-2xl">🏠</span>
                    <span className="text-[8px] font-black text-[#784723]">
                      COOP
                    </span>
                  </div>

                  {game.powerUps.map((pu) => (
                    <div
                      key={pu.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 animate-bounce text-xl sm:text-2xl"
                      style={{
                        left: `${pu.x}%`,
                        top: `${pu.y}%`,
                      }}
                    >
                      🥚
                    </div>
                  ))}

                  {game.animals.map((animal) => {
                    const leanX = Math.max(-8, Math.min(8, animal.vx * 18));
                    const leanY = Math.max(-8, Math.min(8, animal.vy * 18));
                    return (
                      <div
                        key={animal.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-lg transition-transform duration-75 sm:text-2xl"
                        style={{
                          left: `${animal.x}%`,
                          top: `${animal.y}%`,
                          transform: `translate(-50%, -50%) translate(${leanX}px, ${leanY}px) ${
                            animal.state === 'flee' ? 'scale(1.08)' : ''
                          }`,
                        }}
                      >
                        {ANIMAL_EMOJI[animal.type]}
                      </div>
                    );
                  })}

                  <div
                    className={`absolute -translate-x-1/2 -translate-y-1/2 text-2xl transition-transform sm:text-3xl ${
                      hasBoost
                        ? 'scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : ''
                    }`}
                    style={{
                      left: `${game.farmer.x}%`,
                      top: `${game.farmer.y}%`,
                    }}
                  >
                    🧑‍🌾
                  </div>

                  {game.carried > 0 && (
                    <div
                      className={`absolute left-2 top-2 rounded-lg px-2.5 py-1 text-xs font-black shadow-sm ${
                        game.carried >= MAX_CARRY
                          ? 'bg-red-100 text-red-700'
                          : 'bg-white/90 text-[#315c34]'
                      }`}
                    >
                      🧺 {game.carried}/{MAX_CARRY}
                    </div>
                  )}

                  {hasBoost && (
                    <div className="absolute right-2 top-2 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                      ⚡ SPEED BOOST
                    </div>
                  )}

                  {comboDisplay > 1 && (
                    <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 animate-pulse rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white shadow-lg">
                      COMBO x{comboDisplay}!
                    </div>
                  )}

                  {isPaused && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#253e28]/60 backdrop-blur-xs">
                      <div className="rounded-xl bg-white p-5 text-center shadow-lg">
                        <div className="text-xl font-black text-[#315c34]">
                          Game Paused
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPaused(false)}
                          className="mt-3 rounded-lg bg-[#315c34] px-4 py-2 text-xs font-bold text-white"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex w-full max-w-[420px] items-center justify-between rounded-xl bg-[#f1f5e9] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧺</span>
                    <div>
                      <div className="text-xs font-black text-[#315c34]">
                        {game.carried} / {MAX_CARRY} Animals
                      </div>
                      <div className="text-[10px] text-[#71806c]">
                        {game.carried >= MAX_CARRY
                          ? 'Full! Deliver to coop'
                          : 'Deliver to Coop'}
                      </div>
                    </div>
                  </div>

                  <div
                    ref={joystickRef}
                    className="relative h-28 w-28 touch-none select-none rounded-full border-4 border-[#cbd9bf] bg-white shadow-inner"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      if (!isPlaying || isPaused) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      handleJoystickPointer(e);
                    }}
                    onPointerMove={(e) => {
                      if (e.buttons === 1) handleJoystickPointer(e);
                    }}
                    onPointerUp={stopJoystick}
                    onPointerCancel={stopJoystick}
                  >
                    <div
                      className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#315c34] text-white shadow-md"
                      style={{
                        transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`,
                      }}
                    >
                      🕹️
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {isPlaying && (
          <p className="mt-3 text-center text-[11px] text-[#7a8a70]">
            EGB Backyard · 🐤 fast chicks · 🐓 high value · tight combos · one
            coupon per round (highest tier only)
          </p>
        )}
      </div>
    </main>
  );
}
