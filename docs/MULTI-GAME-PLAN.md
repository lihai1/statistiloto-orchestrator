---
agent: devin-local
session: productive-gander
created: 2026-09-05T23:39:41Z
---
# Multi-Game Lottery Platform — Domain-Corrected Production Architecture

Reworked plan correcting major domain errors (777 picks 7 not arbitrary K; 123 has only exact-order ×600 prize; Chance uses 32-card deck with positional suit matching not poker hands) via a compositional GameDefinition/BetTypeDefinition model with versioned rules, an EvaluateBet engine, expected-vs-observed statistics, per-game routing, and structured agent rule lookup.

## 1. Executive verdict

**Verdict: Reject and rework.** The original plan's strategic direction is correct (multi-game, end-to-end, GameSpec-driven) but it contains critical domain errors that would ship an incorrect product:

| Game | Original plan error | Verified official rule |
|------|---------------------|------------------------|
| **777** | "Pick K numbers 4-10" | Pick exactly **7** (Regular), **8** (Systematic 8 → 8 combos), or **9** (Systematic 9 → 36 combos) |
| **777** | Missed 0-hit tier | **0 hits = 5₪ prize** (unique 777 feature) |
| **123** | Invented 6 tiers (exact/any-order/front-pair/back-pair/single) | **Only one prize: exact order = stake × 600**. No intermediate prizes. |
| **Chance** | "52-card deck, poker hands (4-of-a-kind/flush/etc.)" | **32-card deck** (7,8,9,10,J,Q,K,A per suit). **Positional suit matching** with multiplier prizes, not poker hands. |
| **Chance** | Missed bet types entirely | **Chance 1/2/3/4, Rav-Chance, Systematic** — each with different multiplier tables |
| **Lotto** | Missed Double Lotto and Systematic Strong | **Regular, Double, Systematic (6=5/8/9/10/11/12), Systematic Strong (4/5/6/7)** |
| **All** | No bet-type abstraction | Bet type is a first-class domain concept — a Systematic 8 selection is fundamentally different from a Regular 7 |
| **All** | Prizes as constants in GameSpec | Prizes must be **versioned rules** (Lotto jackpot is parimutuel/progressive; 777 is fixed; 123 is stake×multiplier; Chance is stake×multiplier) |
| **All** | "Hot/cold means better numbers" UX | Must be **observed-vs-expected** with explicit "does not affect next draw" messaging |

The corrected plan below uses a compositional `GameDefinition` + `BetTypeDefinition` model, an `EvaluateBet` engine, versioned rules, expected-vs-observed statistics, per-game routing, and structured agent rule lookup.

---

## 2. Domain-rule corrections (verified from pais.co.il, 2026-09-06)

### 2.1 Lotto (verified: pais.co.il/info/lotto-how-to-play.aspx)

**Draw:** 6 numbers from 1–37 + 1 strong number from 1–7. Twice weekly (Tue/Sat, sometimes Thu).

**Bet types:**
| Bet type | Selection | Combos | Cost/combo | Notes |
|----------|-----------|--------|------------|-------|
| Regular | 6 + 1 strong | 1 | 3₪ | Base game |
| Double Lotto | 6 + 1 strong | 1 | 6₪ | 2× prize on all tiers |
| Systematic 6=5 | 6 numbers (strong fixed) | 1 | 3₪ | Edge case |
| Systematic 8 | 8 numbers + 1 strong | C(8,6)=28 | 3₪ each | |
| Systematic 9 | 9 + 1 strong | C(9,6)=84 | | |
| Systematic 10 | 10 + 1 strong | C(10,6)=210 | | |
| Systematic 11 | 11 + 1 strong | C(11,6)=462 | | |
| Systematic 12 | 12 + 1 strong | C(12,6)=924 | | |
| Systematic Strong 4 | 6 + 4 strong | 4 | 3₪ each | |
| Systematic Strong 5 | 6 + 5 strong | 5 | | |
| Systematic Strong 6 | 6 + 6 strong | 6 | | |
| Systematic Strong 7 | 7 + 7 strong | 7×C(7,6)=7 | | | (7 numbers, 7 strong) |

**Prize model:** Tiers 1–2 (6+strong, 6) are **parimutuel/progressive** (jackpot grows until won, split among winners). Tiers 3–8 are **fixed** (5+strong, 5, 4+strong, 4, 3+strong, 3). Double Lotto doubles all prizes. Extra is a separate raffle (6 digits 1–7) — **not part of this analysis platform**.

**Implementation implications:**
- The existing 8-tier model is correct for Lotto evaluation.
- Systematic forms expand C(N,6) combinations — existing `generateCombinations` logic is correct.
- Systematic Strong expands the strong-number dimension — **new**: current code only expands regular numbers.
- Double Lotto is a payout multiplier (×2) — modeled as a bet-type property, not a separate game.
- Parimutuel prizes require historical prize data (already scraped via `prize_seeder.go`).

### 2.2 777 (verified: pais.co.il/info/About777.aspx)

**Draw:** 17 numbers from 1–70. Twice daily (Sun–Fri 13:30 & 19:30, Sat 21:30).

**Bet types:**
| Bet type | Selection | Combos | Cost | Notes |
|----------|-----------|--------|------|-------|
| Regular 7 | 7 numbers | 1 | 7₪ | Base game |
| Systematic 8 | 8 numbers | C(8,7)=8 | 56₪ | 8 combos of 7 |
| Systematic 9 | 9 numbers | C(9,7)=36 | 252₪ | 36 combos of 7. **Guaranteed prize** (even 0 hits wins 180₪) |

**Prize model:** ALL FIXED, no splitting:
| Hits | Prize |
|------|-------|
| 7 | 70,000₪ |
| 6 | 500₪ |
| 5 | 50₪ |
| 4 | 20₪ |
| 3 | 5₪ |
| 0 | 5₪ |

**Cap (חסם):** If >214 first-prize winners in a draw, total first-prize payout capped at 15M₪.

**Implementation implications:**
- Player ALWAYS picks 7 (or 8/9 for systematic which expand to 7-number combos). Never arbitrary K.
- 0-hit prize is a real tier — must be in the evaluation model.
- Systematic 8/9 expand to C(N,7) combinations, each evaluated independently.
- Fixed prizes mean no parimutuel scraping needed — prize table is a rule constant (but still versioned).
- Hypergeometric baseline: P(k hits | N=70, K=17 drawn, n=7 picked) = C(17,k)×C(53,7-k)/C(70,7).

### 2.3 123 (verified: pais.co.il/info/About-123.aspx)

**Draw:** 3 digits 0–9, **positional** (3 separate machines: left, middle, right). Daily.

**Bet type:** Only one — **Regular**. Pick 3 digits in order. Stake is user-chosen (1₪–500₪ per table).

**Prize model:** **Single prize only** — exact order match = **stake × 600**. Odds: 1:1000.

> "אין פרסי ביניים עבור ניחוש חלק מהמספרים או סידור אחר שלהם"
> ("There are no intermediate prizes for guessing some of the numbers or a different order")

**Implementation implications:**
- The original plan's 6 tiers (exact/any-order/front-pair/back-pair/single) are **completely wrong**.
- Evaluation is trivial: `win = (user[0]==drawn[0] && user[1]==drawn[1] && user[2]==drawn[2])`.
- Payout = stake × 600. Stake is a user input, not a game constant.
- Statistics are positional: P(d1), P(d2|d1), P(d3|d1,d2), ordered pairs/triples, repeat-digit patterns.
- Theoretical baseline: each digit uniform 1/10, so P(exact) = 1/1000.

### 2.4 Chance (verified: pais.co.il/info/About-Chance.aspx)

**Draw:** 4 cards from a **32-card deck** (4 suits × 8 ranks: 7,8,9,10,J,Q,K,A). One card per suit per draw. ~7×/day (every 2 hours).

**Bet types:**
| Bet type | Selection | Multiplier table |
|----------|-----------|------------------|
| Chance 1 | 1 card from 1 suit | 1 hit: ×5 |
| Chance 2 | 1 card from each of 2 suits | 2 hits: ×30, 1 hit: ×1/2 |
| Chance 3 | 1 card from each of 3 suits | 3 hits: ×300, 2 hits: ×7/10, 1 hit: ×3/10 |
| Chance 4 | 1 card from each of 4 suits | 4: ×2000, 3: ×8/10, 2: ×5/10, 1: ×2/10 |
| Rav-Chance | 1 card from each of 4 suits | 4: ×1000, 3: ×20, 2: ×2, 1: ×1/2 |
| Systematic | Up to 4 cards per suit | Up to 256 combos (4×4×4×4), applies Chance 1-4 or Rav-Chance multiplier |

**Prize model:** All **stake × multiplier** (fixed multipliers, not parimutuel). Stake chosen from: 5,10,25,50,70,100,250,500₪.

**Implementation implications:**
- **NOT poker hands.** No four-of-a-kind, flush, etc. The original plan's poker model is entirely wrong.
- It's a **positional categorical game**: 4 suit-positions, each with 8 possible ranks.
- Each bet type defines which positions are active and how many hits are needed.
- Chance 4 and Rav-Chance both guess 4 cards but have **different multiplier tables** — this proves bet type is a separate concept from game.
- Card encoding: suit ∈ {0,1,2,3}, rank ∈ {0..7} (7=0, 8=1, 9=2, 10=3, J=4, Q=5, K=6, A=7). Card code = suit×8 + rank (0–31).
- Theoretical baseline: P(hit one position) = 1/8. P(all 4) = 1/4096.

---

## 3. Recommended domain model

### 3.1 Core types (Go)

```go
// GameType identifies a PAIS game.
type GameType int32
const (
    GAME_TYPE_UNSPECIFIED GameType = 0  // → LOTTO for backward compat
    LOTTO                 GameType = 1
    SEVEN_SEVEN_SEVEN     GameType = 2
    ONE_TWO_THREE         GameType = 3
    CHANCE                GameType = 4
)

// BetType identifies a wager format within a game.
type BetType int32
const (
    // Lotto
    LOTTO_REGULAR           BetType = 1
    LOTTO_DOUBLE            BetType = 2
    LOTTO_SYSTEMATIC_8      BetType = 3
    LOTTO_SYSTEMATIC_9      BetType = 4
    LOTTO_SYSTEMATIC_10     BetType = 5
    LOTTO_SYSTEMATIC_11     BetType = 6
    LOTTO_SYSTEMATIC_12     BetType = 7
    LOTTO_SYSTEMATIC_STRONG_4 BetType = 8
    LOTTO_SYSTEMATIC_STRONG_5 BetType = 9
    LOTTO_SYSTEMATIC_STRONG_6 BetType = 10
    LOTTO_SYSTEMATIC_STRONG_7 BetType = 11
    // 777
    SEVEN_REGULAR_7         BetType = 20
    SEVEN_SYSTEMATIC_8      BetType = 21
    SEVEN_SYSTEMATIC_9      BetType = 22
    // 123
    ONE_TWO_THREE_REGULAR   BetType = 30
    // Chance
    CHANCE_1                BetType = 40
    CHANCE_2                BetType = 41
    CHANCE_3                BetType = 42
    CHANCE_4                BetType = 43
    CHANCE_RAV              BetType = 44
    CHANCE_SYSTEMATIC       BetType = 45
)
```

### 3.2 GameDefinition

```go
// GameDefinition is the canonical description of a game's draw structure.
// One per GameType. Does NOT include bet-type-specific logic.
type GameDefinition struct {
    GameType         GameType
    DisplayName      string
    DrawSchema       DrawSchema
    BetTypes         []BetTypeDefinition
    AnalysisCapabilities AnalysisCapabilities
    RuleVersion      string  // e.g. "2024-01"
}

// DrawSchema describes what a draw produces.
type DrawSchema struct {
    Domain       DrawDomain  // NUMERIC_UNORDERED, NUMERIC_POSITIONAL, CARD_POSITIONAL
    DrawnCount   int         // Lotto:6, 777:17, 123:3, Chance:4
    MaxValue     int         // Lotto:37, 777:70, 123:10, Chance:32
    HasStrong    bool        // Lotto only
    StrongMax    int         // Lotto:7
    Positions    int         // 123:3, Chance:4, others:0 (unpositioned)
    PositionDomain string    // "digit_0_9", "card_32", "number_1_70", etc.
}

type DrawDomain int32
const (
    NUMERIC_UNORDERED  DrawDomain = 0  // Lotto, 777
    NUMERIC_POSITIONAL DrawDomain = 1  // 123
    CARD_POSITIONAL    DrawDomain = 2  // Chance
)
```

### 3.3 BetTypeDefinition

```go
// BetTypeDefinition describes a specific wager format.
type BetTypeDefinition struct {
    BetType          BetType
    GameType         GameType
    DisplayName      string
    SelectionSchema  SelectionSchema
    CombinationRule  CombinationRule
    EvaluationRule   EvaluationRule
    PayoutRule       PayoutRule
    CostRule         CostRule
    RuleVersion      string
    EffectiveFrom    time.Time
    EffectiveTo      *time.Time  // nil = currently active
    Source           string      // "pais.co.il/info/About777.aspx"
}

// SelectionSchema describes what the user picks.
type SelectionSchema struct {
    PickCount     int    // 777 Regular:7, Sys8:8, Sys9:9, Lotto:6, 123:3, Chance4:4
    StrongPicks    int    // Lotto Systematic Strong: 4-7, others:0
    Positional     bool   // 123, Chance: true
    Domain         string // "number_1_70", "digit_0_9", "card_32"
    MinStake       float64 // 123: 1, Chance: 5, Lotto/777: 0 (fixed cost)
    MaxStake       float64 // 123: 500, Chance: 500, Lotto/777: 0
    StakeOptions   []float64 // Chance: [5,10,25,50,70,100,250,500], 123: [1..500], Lotto/777: nil
}

// CombinationRule describes how a selection expands into evaluable combos.
type CombinationRule struct {
    Type         CombinationType  // SINGLE, SYSTEMATIC_REGULAR, SYSTEMATIC_STRONG
    ComboSize    int              // 777:7, Lotto:6 (the per-combo pick size)
    ExpandRegular  bool           // expand C(N, ComboSize) from regular picks
    ExpandStrong   bool           // expand strong picks × regular combos
}

// EvaluationRule describes how to match a combo against a draw.
type EvaluationRule struct {
    Type       EvaluationType  // LOTTO_TIER, SEVEN_HIT_COUNT, EXACT_POSITIONAL, CHANCE_POSITIONAL
    MatchCount bool            // 777: count hits; Lotto: tier-based
    Positional bool            // 123, Chance: position matters
    ZeroHitPrize bool          // 777: 0 hits wins
}

// PayoutRule describes how prizes are calculated.
type PayoutRule struct {
    Type       PayoutType  // FIXED, PARIMUTUEL, STAKE_MULTIPLIER, PROGRESSIVE
    Tiers      []PayoutTier  // fixed/multiplier tiers
    Multiplier float64       // Double Lotto: 2.0
    CapAmount  float64       // 777: 15,000,000 cap on first prize
    CapThreshold int         // 777: 214 winners
}

type PayoutTier struct {
    Label       string  // "7 hits", "6+strong", "exact order"
    MatchCount  int     // 777: 7,6,5,4,3,0; Lotto: 6+strong=1, etc.
    HasStrong   bool    // Lotto tiers with strong
    Amount      float64 // FIXED: 70000; STAKE_MULTIPLIER: 0 (use Multiplier)
    Multiplier  float64 // STAKE_MULTIPLIER: 600 (123), 5 (Chance1), 2000 (Chance4)
}

type PayoutType int32
const (
    FIXED            PayoutType = 0  // 777
    PARIMUTUEL       PayoutType = 1  // Lotto tiers 1-2
    STAKE_MULTIPLIER PayoutType = 2  // 123, Chance
    PROGRESSIVE      PayoutType = 3  // Lotto jackpot (subtype of parimutuel)
)
```

### 3.4 AnalysisCapabilities

```go
// AnalysisCapabilities declares which statistics are meaningful for a game.
type AnalysisCapabilities struct {
    NumberFrequency       bool   // Lotto, 777
    PairFrequency         bool   // Lotto, 777
    TripleFrequency       bool   // Lotto, 777
    QuadFrequency         bool   // 777 (high data density)
    PositionalFrequency   bool   // 123, Chance
    ConditionalFrequency  bool   // 123: P(d2|d1), P(d3|d1,d2)
    CrossPositionAnalysis bool   // Chance: cross-suit patterns
    ExpectedVsObserved    bool   // all games
    HypergeometricBaseline bool  // 777, Lotto
    RecencyAnalysis       bool   // all
    CombinationHistory    bool   // Lotto, 777 (has-won checking)
    SequenceHistory       bool   // 123 (ordered triple history)
    MaxGroupDepth         int    // Lotto:6, 777:4, 123:3, Chance:4
}
```

### 3.5 Registry

```go
// GameRegistry is the single source of truth for game/bet definitions.
// Built at init time from versioned rule files.
package gameconfig

var Registry = NewGameRegistry()  // initialized in game_definitions.go

func init() {
    Registry.Register(lottoDefinition())
    Registry.Register(sevenSevenSevenDefinition())
    Registry.Register(oneTwoThreeDefinition())
    Registry.Register(chanceDefinition())
}
```

Each `*Definition()` function returns a `GameDefinition` with all bet types, rules, and payout tables hardcoded from verified official sources, tagged with `RuleVersion` and `Source`.

---

## 4. API / proto changes

### 4.1 Proto contract

```proto
enum GameType {
  GAME_TYPE_UNSPECIFIED = 0;
  LOTTO = 1;
  SEVEN_SEVEN_SEVEN = 2;
  ONE_TWO_THREE = 3;
  CHANCE = 4;
}

enum BetType {
  BET_TYPE_UNSPECIFIED = 0;
  // Lotto
  LOTTO_REGULAR = 1;
  LOTTO_DOUBLE = 2;
  LOTTO_SYSTEMATIC_8 = 3;
  // ... (all 11 Lotto bet types)
  // 777
  SEVEN_REGULAR_7 = 20;
  SEVEN_SYSTEMATIC_8 = 21;
  SEVEN_SYSTEMATIC_9 = 22;
  // 123
  ONE_TWO_THREE_REGULAR = 30;
  // Chance
  CHANCE_1 = 40;
  CHANCE_2 = 41;
  CHANCE_3 = 42;
  CHANCE_4 = 43;
  CHANCE_RAV = 44;
  CHANCE_SYSTEMATIC = 45;
}
```

**Request messages** gain `game_type` and `bet_type`:

```proto
message GenerateFormRequest {
  int32 how_many = 1;
  int32 form_type = 2;        // deprecated, kept for backward compat
  repeated int32 will_be = 3;
  Strength strength = 4;
  DateWindow window = 5;
  GameType game_type = 6;     // NEW
  BetType bet_type = 7;       // NEW
  double stake = 8;           // NEW: 123/Chance stake
}

message SimulateRequest {
  repeated int32 form = 1;
  int32 strong = 2;
  DateWindow archive_window = 3;
  DateWindow simulate_window = 4;
  double ticket_cost = 5;
  repeated double prize_amounts = 6;  // deprecated for Lotto-only
  GameType game_type = 7;             // NEW
  BetType bet_type = 8;               // NEW
  double stake = 9;                   // NEW
}
```

**New messages:**

```proto
message GameDefinitionRequest {
  GameType game_type = 1;
}

message GameDefinitionResponse {
  GameType game_type = 1;
  string display_name = 2;
  DrawSchema draw_schema = 3;
  repeated BetTypeDefinition bet_types = 4;
  AnalysisCapabilities analysis_capabilities = 5;
  string rule_version = 6;
}

message BetTypeDefinitionResponse {
  BetType bet_type = 1;
  string display_name = 2;
  SelectionSchema selection_schema = 3;
  CombinationRule combination_rule = 4;
  EvaluationRule evaluation_rule = 5;
  PayoutRule payout_rule = 6;
  CostRule cost_rule = 7;
  string rule_version = 8;
}

message EvaluationResult {
  repeated ComboEvaluation combos = 1;  // one per expanded combo
  double total_stake = 2;
  double total_payout = 3;
  double net = 4;
  repeated PrizeCategory prize_categories = 5;
}

message ComboEvaluation {
  repeated int32 selection = 1;
  int32 match_count = 2;
  bool positional_match = 3;
  string prize_category = 4;
  double payout = 5;
  double stake = 6;
}
```

**New RPCs:**
```proto
rpc GetGameDefinition(GameDefinitionRequest) returns (GameDefinitionResponse);
rpc GetBetTypeDefinition(BetTypeDefinitionRequest) returns (BetTypeDefinitionResponse);
```

### 4.2 Backward compatibility

- `GAME_TYPE_UNSPECIFIED` → Go service resolves to `LOTTO`
- `BET_TYPE_UNSPECIFIED` → resolves to `LOTTO_REGULAR` (for Lotto) or the default bet type for the game
- `form_type` field kept for existing Lotto clients (maps to systematic form sizes)
- `prize_amounts` field kept for existing Lotto clients (ignored when `bet_type` is specified)
- Old requests without `game_type`/`bet_type` work exactly as before
- All existing Lotto E2E tests pass unchanged

---

## 5. Go engine architecture

### 5.1 Draw model

```go
// Draw is the canonical representation of a single draw result.
type Draw struct {
    GameType      GameType
    DrawNumber    int
    DrawDateTime  time.Time
    RuleVersion   string
    RawPayload    json.RawMessage  // original scraped data
    NormalizedResult NormalizedResult
    Source        string
    SourceVersion string
    IngestedAt    time.Time
}

// NormalizedResult holds the structured draw data.
// Uses a discriminated union by GameType.
type NormalizedResult struct {
    Numbers    []int  // Lotto: [6], 777: [17], 123: [3 digits], Chance: [4 card codes]
    Strong     int    // Lotto only, 0 for others
    Positional bool   // 123, Chance: true
}
```

### 5.2 GameDefinition registry

**New file:** `lottery-stats-server/internal/gameconfig/registry.go`
- `GameRegistry` struct with `Register(def GameDefinition)` and `Get(gameType GameType) GameDefinition`
- `GetBetType(betType BetType) BetTypeDefinition`
- Initialized in `gameconfig/definitions.go` with all verified rules from Section 2
- This is the **single source of truth** — no other package hardcodes game rules

### 5.3 Evaluation engine

**New file:** `lottery-stats-server/internal/engine/evaluator.go`

```go
// BetEvaluator evaluates a user's selection against a draw.
type BetEvaluator interface {
    Evaluate(draw NormalizedResult, bet BetSelection, def BetTypeDefinition) EvaluationResult
}

// BetSelection is the user's picks.
type BetSelection struct {
    GameType  GameType
    BetType   BetType
    Numbers   []int    // regular picks
    Strong    []int    // strong picks (Lotto systematic strong)
    Stake     float64  // 123/Chance stake
}

// EvaluationResult is the full result of evaluating a bet against a draw.
type EvaluationResult struct {
    Combos          []ComboEvaluation
    TotalStake      float64
    TotalPayout     float64
    Net             float64
    PrizeCategories []PrizeCategory
}
```

**Implementations:**
- `LottoEvaluator` — expands systematic forms (C(N,6) + strong expansion), evaluates 8 tiers, handles Double multiplier, handles parimutuel vs fixed
- `SevenEvaluator` — expands systematic (C(N,7)), counts hits per combo, applies fixed prize table including 0-hit tier, handles cap
- `OneTwoThreeEvaluator` — exact positional match, payout = stake × 600
- `ChanceEvaluator` — positional suit matching, applies bet-type-specific multiplier table (Chance 1/2/3/4/Rav/Systematic)

### 5.4 Statistics architecture

**New file:** `lottery-stats-server/internal/engine/statistics.go`

```go
type StatisticsEngine interface {
    Frequency(archive Archive, spec AnalysisCapabilities) FrequencyReport
    ExpectedVsObserved(archive Archive, spec AnalysisCapabilities) EvOReport
    PositionalAnalysis(archive Archive, spec AnalysisCapabilities) PositionalReport
}

type FrequencyReport struct {
    NumberFrequency  map[int]int      // number → count
    PairFrequency    map[[2]int]int
    TripleFrequency  map[[3]int]int
    QuadFrequency    map[[4]int]int    // 777 only
    TotalDraws       int
}

type EvOReport struct {
    Entries []EvOEntry
}

type EvOEntry struct {
    Value       int      // or [N]int for groups
    Observed    int
    ObservedPct float64  // observed / total
    Expected    float64  // theoretical
    ExpectedPct float64
    Difference  float64  // observed_pct - expected_pct
    SampleSize  int
}
```

**Per-game statistics:**

| Game | Engine | Key statistics |
|------|--------|----------------|
| Lotto | `LottoStatsEngine` (existing tree, depth 6) | Number freq, pair/triple freq, recency, co-occurrence, EvO with hypergeometric |
| 777 | `SevenStatsEngine` (tree, depth 4) | Number freq, pair/triple/quad co-occurrence, EvO with hypergeometric C(17,k)C(53,7-k)/C(70,7), hit-distribution |
| 123 | `PositionalStatsEngine` (new) | P(d1), P(d2\|d1), P(d3\|d1,d2), ordered pairs/triples, repeat-digit patterns, EvO with uniform 1/10 |
| Chance | `ChanceStatsEngine` (new) | Rank freq per suit, EvO with uniform 1/8, cross-position patterns, streak/recency |

### 5.5 Existing tree reuse

- `LotteryArchive` + `LoTree` reused for **Lotto and 777** (both numeric unordered). Depth configurable via `AnalysisCapabilities.MaxGroupDepth`.
- 777: depth 4 (pair/triple/quad). `WinningCombos` uses string key (70 > 63 breaks bitmask).
- **123 and Chance do NOT use the tree** — they use `PositionalArchive` (new) which preserves order.

### 5.6 Scraper / ingestion architecture

```go
// GameResultSource is the generic ingestion pipeline.
type GameResultSource interface {
    Fetch(ctx context.Context, from, to time.Time) ([]RawDraw, error)
    Parse(raw []RawDraw) ([]Draw, error)
    Validate(draws []Draw) ([]Draw, []ValidationError)
    Normalize(draws []Draw) []Draw
}

type RawDraw struct {
    GameType    GameType
    DrawNumber  int
    DrawDateTime time.Time
    RawHTML     string  // or CSV
    Source      string
    SourceVersion string
}
```

**Implementations:**
- `LottoSource` — existing CSV scraper, refactored to implement interface
- `SevenSource` — official `pais.co.il/777/archive.aspx` (ASP.NET POST) with `paisresults.co.il` fallback
- `OneTwoThreeSource` — official `/123/archive.aspx` with fallback
- `ChanceSource` — official `/chance/archive.aspx` with fallback

**Validation:** Each draw validated against `DrawSchema` (correct count, value range, positional constraints). Invalid draws quarantined with `ValidationError`, not silently inserted.

**Provenance:** Every draw carries `Source`, `SourceVersion`, `IngestedAt`. Official source is primary; fallback is tagged explicitly.

---

## 6. Database changes

### 6.1 Recommended schema

**Option: Hybrid model** — one `draws` table with JSONB payload + typed columns for query efficiency.

```sql
-- Rename lottery_results → draws (or add new table and migrate)
CREATE TABLE lottery.draws (
    id              BIGSERIAL PRIMARY KEY,
    game_type       VARCHAR(20)  NOT NULL,
    draw_number     INT          NOT NULL,
    draw_datetime   TIMESTAMPTZ  NOT NULL,
    rule_version    VARCHAR(20),
    numbers         INT[]        NOT NULL,   -- query-friendly: [6],[17],[3],[4]
    strong          INT          DEFAULT 0,  -- Lotto only
    raw_payload     JSONB,                   -- original scrape data
    prize_amounts   JSONB,                   -- per-draw prize data (Lotto parimutuel)
    source          VARCHAR(100) NOT NULL,
    source_version  VARCHAR(20),
    ingested_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(game_type, draw_number)
);

CREATE INDEX idx_draws_game_date ON lottery.draws(game_type, draw_datetime);
CREATE INDEX idx_draws_game_number ON lottery.draws(game_type, draw_number);
```

**Why hybrid:** `numbers[]` and `strong` columns enable efficient `WHERE numbers @> ARRAY[...]` queries. `raw_payload` JSONB preserves original data for re-parsing. `rule_version` enables historical rule-aware evaluation.

### 6.2 Migration strategy

**Migration 03:** `lottery-stats-server/db-migration/migrations/03-rename-to-draws-add-metadata.yaml`
```yaml
- changeSet:
    id: rename-to-draws-add-metadata
    changes:
      - renameTable:
          oldTableName: lottery_results
          newTableName: draws
      - addColumn:
          tableName: draws
          columns:
            - column: { name: draw_datetime, type: TIMESTAMPTZ }
            - column: { name: rule_version, type: VARCHAR(20) }
            - column: { name: raw_payload, type: JSONB }
            - column: { name: source, type: VARCHAR(100), defaultValue: "pais.co.il" }
            - column: { name: source_version, type: VARCHAR(20) }
            - column: { name: ingested_at, type: TIMESTAMPTZ, defaultValueComputed: "now()" }
      - dropUniqueConstraint:
          tableName: draws
          uniqueColumns: draw_number
      - addUniqueConstraint:
          tableName: draws
          columnNames: game_type, draw_number
          constraintName: uq_draws_game_number
      - createIndex:
          tableName: draws
          indexName: idx_draws_game_date
          columns: [game_type, draw_datetime]
    # Backfill draw_datetime from draw_date, rule_version from 'pre-2024'
    # Backfill source from 'pais.co.il' for existing Lotto rows
```

**Backward compat:** Existing `lottery_type` column renamed to `game_type` with values mapped (`lotto` → `lotto`, etc.). Repository layer updated. Existing Lotto data migrated with `game_type='lotto'`, `rule_version='pre-2024'`.

### 6.3 Saved plays schema (Java BFF)

```sql
-- V5 migration
ALTER TABLE app.saved_numbers ADD COLUMN game_type VARCHAR(20) NOT NULL DEFAULT 'lotto';
ALTER TABLE app.saved_numbers ADD COLUMN bet_type VARCHAR(30) NOT NULL DEFAULT 'lotto_regular';
ALTER TABLE app.saved_numbers ADD COLUMN stake DECIMAL(10,2);
ALTER TABLE app.saved_numbers ADD COLUMN selection_meta JSONB;
-- selection_meta: { strong: [3], positions: [...] } for non-standard shapes
CREATE INDEX idx_saved_numbers_game_bet ON app.saved_numbers(game_type, bet_type);
```

---

## 7. Java BFF changes

### 7.1 Principle: no domain logic duplication

The BFF **does not hardcode game rules**. It:
1. Proxies `GameDefinition` and `BetTypeDefinition` from Go via gRPC
2. Passes `game_type` + `bet_type` + `stake` through to Go for all computation RPCs
3. Stores saved plays with `game_type` + `bet_type` + `stake` + `selection_meta`

### 7.2 DTOs

```java
public record GenerateFormRequest(
    @NotNull @Min(0) Integer howMany,
    Integer formType,           // deprecated
    List<Integer> willBe,
    LocalDate from,
    LocalDate to,
    String strength,            // deprecated
    String gameType,            // NEW: "lotto", "777", "123", "chance"
    String betType,             // NEW: "lotto_regular", "seven_systematic_8", etc.
    Double stake                // NEW: 123/Chance
) {}

public record SimulateRequest(
    List<Integer> form,
    Integer strong,
    LocalDate archiveFrom, LocalDate archiveTo,
    LocalDate simulateFrom, LocalDate simulateTo,
    Double ticketCost,
    List<Double> prizeAmounts,  // deprecated
    String gameType,            // NEW
    String betType,             // NEW
    Double stake                // NEW
) {}
```

### 7.3 New endpoints

```java
@GetMapping("/api/games/{gameType}/definition")
public GameDefinitionResponse getGameDefinition(@PathVariable String gameType);

@GetMapping("/api/games/{gameType}/bets/{betType}/definition")
public BetTypeDefinitionResponse getBetTypeDefinition(...);
```

### 7.4 Saved plays

```java
public record SaveNumbersRequest(
    List<Integer> numbers,
    List<Integer> willBe,
    LocalDate from, LocalDate to,
    String gameType,    // NEW
    String betType,     // NEW
    Double stake        // NEW
) {}

public record SavedNumbersResponse(
    Long id,
    String category,
    List<Integer> numbers,
    List<Integer> willBe,
    LocalDate from, LocalDate to,
    String gameType,    // NEW
    String betType,     // NEW
    Double stake        // NEW
) {}
```

`UserNumbersController` accepts `gameType` and `betType` query params for filtering.

---

## 8. Angular UX architecture

### 8.1 Routing

```typescript
const routes: Routes = [
  { path: 'games/lotto', loadComponent: () => import('./features/games/lotto/lotto-page.component') },
  { path: 'games/777', loadComponent: () => import('./features/games/seven/seven-page.component') },
  { path: 'games/123', loadComponent: () => import('./features/games/one-two-three/ott-page.component') },
  { path: 'games/chance', loadComponent: () => import('./features/games/chance/chance-page.component') },
  // Each game page has nested tabs:
  //   /games/777/statistics
  //   /games/777/generate
  //   /games/777/simulate
  //   /games/777/analyze
  // Redirect old routes:
  { path: 'lab', redirectTo: 'games/lotto/generate', pathMatch: 'full' },
];
```

**Benefits:** Deep links, browser history, shareable URLs, per-game analytics, independent loading, SEO/content pages.

### 8.2 State management

```typescript
// game-store.service.ts — shared across all game pages
@Injectable({ providedIn: 'root' })
export class GameStoreService {
  readonly activeGame = signal<LotteryType>('lotto');
  readonly gameDefinition = signal<GameDefinition | null>(null);
  readonly activeBetType = signal<string>('lotto_regular');
  readonly betTypeDefinition = signal<BetTypeDefinition | null>(null);
  // Per-game session state (preserved on navigation):
  readonly sessionState = signal<Record<string, GameSessionState>>({});

  setGame(type: LotteryType) { /* fetch definition, reset bet type, preserve session */ }
  setBetType(betType: string) { /* fetch bet definition */ }
}
```

**Per-game session state:** Each game maintains independent picker state. Switching 777 → Lotto → 777 preserves the user's 777 selection.

### 8.3 Game switcher

- Segmented control at top of workspace: לוטו / 777 / 123 / צ'אנס
- Navigates to `/games/{type}` (URL is source of truth)
- RTL-aware, Hebrew labels

### 8.4 Per-game picker UX

**Lotto:** Existing ball picker (1–37 grid + strong 1–7). Bet type selector: Regular / Double / Systematic / Systematic Strong.

**777:** Compact 70-number board with:
- Large touch targets (7×10 grid or paginated)
- Sticky counter: "X מתוך 7 נבחרו" (or 8/9 for systematic)
- Bet type selector: Regular 7 / Systematic 8 / Systematic 9
- Selection limit enforced by bet type
- No strong number

**123:** Three positional digit selectors (0–9 each):
- Large per-position digit buttons or scroll wheels
- Explicit "סדר חשוב" (order matters) label
- Position labels: מיקום 1 / 2 / 3
- Stake selector (1₪–500₪)

**Chance:** Four suit-lanes (♠ ♥ ♦ ♣), each with 8 rank buttons (7,8,9,10,J,Q,K,A):
- Bet type selector: Chance 1/2/3/4 / Rav-Chance / Systematic
- Chance 1: only 1 suit-lane active
- Chance 2: 2 suit-lanes active
- Chance 4 / Rav: all 4 lanes active
- Systematic: up to 4 cards per lane
- Stake selector (5/10/25/50/70/100/250/500₪)
- Card visuals with suit symbol + rank

### 8.5 Statistics presentation (observed vs expected)

Replace "hot/cold" with:

```
מספר 17
תדירות נצפית: 28.1%    (42 מתוך 149 הגרלות)
תדירות צפויה: 24.3%
הפרש: +3.8 נקודות אחוז

הערה: אלה נתוני עבר בלבד. הם אינם מעלים את הסיכוי שמספר זה יעלה בהגרלה הבאה.
```

Every statistics view shows: Observed, Expected, Difference, Sample size, Disclaimer.

### 8.6 Mobile RTL considerations

- Touch targets ≥44×44px (WCAG)
- No horizontal scroll for critical actions
- Sticky primary action button
- RTL: numbers read left-to-right even in RTL layout (123 positions labeled right-to-left)
- Dark mode, high contrast, reduced motion
- Screen reader labels for all pickers

---

## 9. Agent architecture

### 9.1 Structured rule lookup (not RAG)

**New agent tool:** `get_game_definition(game_type, bet_type=None)`

```python
def get_game_definition(game_type: str, bet_type: str | None = None) -> dict:
    """Retrieve authoritative game/bet rules from the Go service via gRPC.
    
    This is the canonical source for:
    - valid bet types
    - ticket cost
    - prize rules
    - number limits
    - selection constraints
    
    RAG docs are for explanations only, not authoritative rules.
    """
    # Calls Go GetGameDefinition / GetBetTypeDefinition RPC
```

### 9.2 Context injection

When chat is opened from a game-specific screen, inject:

```python
context = {
    "gameContext": "777",
    "betContext": "SEVEN_SYSTEMATIC_8",
    "page": "simulate",
    "selection": [3, 17, 42, 55, 68, 70, 8],
    "archiveWindow": {"from": "2024-01-01", "to": "2026-09-01"},
}
```

Keyword detection (`777`, `123`, `chance`, `צ'אנס`) is **fallback only** when no explicit context is provided.

### 9.3 RAG responsibilities

RAG docs cover:
- **Explanations:** "How does 777 systematic 8 work?"
- **Educational content:** "What is hypergeometric distribution?"
- **Statistical methodology:** "Why observed ≠ expected doesn't mean predictive"
- **Product guidance:** "How to use the simulator"
- **Responsible use:** "Historical patterns don't affect future draws"

RAG docs do NOT contain:
- Prize amounts (use `get_game_definition`)
- Valid bet types (use `get_game_definition`)
- Number limits (use `get_game_definition`)
- Current official rules (use `get_game_definition`)

### 9.4 Tool changes

All 4 tools (`generate_form`, `get_statistics`, `analyze`, `simulate`) gain `game_type` and `bet_type` params. Cache key includes both.

### 9.5 Disambiguation

`chance` in user text → check `gameContext` first. If `gameContext == "chance"`, it's the Chance game. If no context, ask for clarification: "Did you mean the Chance lottery game, or probability in general?"

---

## 10. Statistics methodology

### 10.1 Descriptive statistics (what happened)

| Game | Statistics |
|------|-----------|
| Lotto | Number freq, pair/triple freq, recency, co-occurrence, combination history |
| 777 | Number freq, pair/triple/quad co-occurrence, hit-distribution, systematic ticket simulation |
| 123 | P(d1), P(d2\|d1), P(d3\|d1,d2), ordered pairs/triples, repeat-digit patterns, sequence history |
| Chance | Rank freq per suit, cross-position patterns, streak/recency, ordered patterns |

### 10.2 Theoretical probability (what should happen)

| Game | Baseline |
|------|----------|
| Lotto | P(number) = 6/37, P(pair) = C(6,2)/C(37,2), hypergeometric |
| 777 | P(k hits) = C(17,k)×C(53,7-k)/C(70,7), hypergeometric |
| 123 | P(digit at position) = 1/10, P(exact) = 1/1000, uniform |
| Chance | P(rank at suit) = 1/8, P(all 4) = 1/4096, uniform |

### 10.3 Expected vs observed

Every frequency display includes:
- **Observed count** and **observed percentage**
- **Expected count** and **expected percentage** (from theoretical model)
- **Difference** in percentage points
- **Sample size** (number of draws)
- **Disclaimer:** "Historical observation only. Does not increase probability in the next independent draw."

### 10.4 Statistical significance

Apply chi-square goodness-of-fit only where justified (large sample, categorical data). Display as informational, not predictive. Do NOT present random noise as meaningful insight. If a deviation is within expected statistical noise, label it as such.

### 10.5 Simulation (backtesting)

- Use `BetEvaluator` to evaluate user's selection against each historical draw
- Use **rules applicable at the draw date** when possible (rule versioning)
- For parimutuel prizes (Lotto tiers 1-2), use actual historical prize data if available, otherwise use conservative estimates
- For fixed/multiplier prizes (777, 123, Chance), use the rule's prize table directly
- Report: total stake, total payout, net, hit distribution, per-tier breakdown

### 10.6 Historical pattern exploration

- "Has this exact combination ever won?" (Lotto, 777)
- "How often has this positional sequence appeared?" (123)
- "How often have these cards been drawn?" (Chance)
- All framed as **descriptive**, never predictive

---

## 11. Product strategy

### 11.1 Positioning shift

From: "Lotto statistics app"
To: **"Israeli lottery intelligence platform"**

Focus on:
- Historical analysis and understanding
- Results checking
- Statistical context (observed vs expected)
- Simulations (backtesting)
- Saved plays management
- AI explanations

NOT a ticket-purchasing clone. NOT a prediction tool.

### 11.2 Retention and frequency

| Game | Draw freq | Return frequency impact |
|------|-----------|------------------------|
| Lotto | 2×/week | Weekly engagement |
| 777 | 2×/day | Daily engagement (high) |
| 123 | Daily | Daily engagement |
| Chance | 7×/day | Multiple daily engagement (highest) |

**Features for recurring utility:**
- Daily dashboard: "Today's 777 and Chance draws analyzed"
- Notifications: "New 777 draw results available" (opt-in, not gambling-push)
- Saved play checking: "Your saved 777 selection hit 5 of 7 in today's draw"
- Streak tracking: "You've checked results 7 days in a row"

### 11.3 Monetization

- **Free tier:** Lotto statistics, basic generate, 1 saved play
- **Premium:** All games, unlimited saved plays, advanced statistics (EvO, chi-square), systematic simulation, ad-free
- **Ad inventory:** Higher with 777/Chance daily return frequency

### 11.4 Responsible gaming

- Never claim historical patterns improve odds
- Show theoretical odds alongside observed data
- "Historical observation only" disclaimers on every statistics view
- Link to responsible gaming resources (PAIS already does this)
- No "hot numbers" messaging — use "frequently observed" with expected baseline

---

## 12. Revised implementation phases

### Phase 0 — Architecture Foundation v2

**Scope:** Verify official rules, define GameDefinition/BetTypeDefinition, rule versioning, draw representation, proto/API contract, evaluation engine, statistics capability model, backward compatibility. **Migrate Lotto to the new model first.** No visible new game.

**Files/components affected:**
- `proto/lottery.proto` — add `GameType`, `BetType` enums, `game_type`/`bet_type` fields, `GameDefinitionResponse`, `BetTypeDefinitionResponse`, `EvaluationResult` messages, `GetGameDefinition`/`GetBetTypeDefinition` RPCs
- `lottery-stats-server/internal/gameconfig/` — **NEW package**: `registry.go`, `definitions.go` (all 4 games' definitions from verified rules)
- `lottery-stats-server/internal/engine/` — **NEW package**: `evaluator.go` (interface + LottoEvaluator), `statistics.go` (interface + LottoStatsEngine)
- `lottery-stats-server/internal/lottery-tree/lottery_archive.go` — configurable depth via `AnalysisCapabilities`
- `lottery-stats-server/internal/lottery-tree/form_generator.go` — spec-driven min size, conditional strong
- `lottery-stats-server/internal/services/lottery_service.go` — route by `game_type`/`bet_type`, new RPCs
- `lottery-stats-server/internal/services/lottery_manager.go` — game-type in cache key
- `lottery-stats-server/internal/services/simulate.go` — use `BetEvaluator` for Lotto (refactor existing logic into `LottoEvaluator`)
- `lottery-stats-server/internal/repository/lottery_result_repository.go` — `game_type` filter
- `lottery-stats-server/db-migration/migrations/03-rename-to-draws-add-metadata.yaml` — **NEW**
- `server/src/main/java/.../dto/` — add `gameType`, `betType`, `stake` to request DTOs
- `server/src/main/java/.../service/LotteryClientService.java` — set `gameType`/`betType` on gRPC builders, add `getGameDefinition`/`getBetTypeDefinition`
- `server/src/main/java/.../controller/GenerateController.java` — add `GET /api/games/{type}/definition`, `GET /api/games/{type}/bets/{bet}/definition`
- `server/src/main/resources/db/migration/V5__add_game_bet_type_to_saved_numbers.sql` — **NEW**
- `server/src/main/java/.../entity/SavedNumbers.java` — add `gameType`, `betType`, `stake`
- `ui-fable/src/app/shared/models/game-definition.model.ts` — **NEW**
- `ui-fable/src/app/shared/services/game-store.service.ts` — **NEW**
- `ui-fable/src/app/shared/components/game-switcher/` — **NEW**
- `ui-fable/src/app/core/api/api.service.ts` — add `getGameDefinition()`, `getBetTypeDefinition()`
- `agent/app/tools/lottery_grpc.py` — add `game_type`, `bet_type` params
- `agent/app/tools/game_rules.py` — **NEW**: `get_game_definition` tool

**Tests:**
- `gameconfig/definitions_test.go` — verify all definitions match official rules
- `engine/evaluator_test.go` — Lotto evaluator: all 8 tiers, systematic expansion, Double multiplier, systematic strong
- `engine/statistics_test.go` — Lotto EvO with hypergeometric
- `services/lottery_service_test.go` — route by game_type, backward compat (UNSPECIFIED → LOTTO)
- Java: `LotteryClientServiceTest` — gameType/betType forwarded
- UI: `game-store.service.spec.ts`, `game-switcher.component.spec.ts`
- Agent: `test_lottery_grpc.py` — game_type/bet_type forwarded, `test_game_rules.py` — definition lookup

**Acceptance criteria:**
- [ ] All existing Lotto E2E tests pass unchanged
- [ ] `GET /api/games/lotto/definition` returns correct Lotto definition with all 11 bet types
- [ ] `GET /api/games/lotto/bets/lotto_systematic_8/definition` returns C(8,6)=28 combos
- [ ] Lotto simulate with `bet_type=LOTTO_DOUBLE` doubles all prizes
- [ ] Lotto simulate with `bet_type=LOTTO_SYSTEMATIC_STRONG_4` expands 4 strong × C(6,6)=4 combos
- [ ] `UNSPECIFIED` game_type/bet_type → Lotto Regular (backward compat)
- [ ] `make proto && make test-go && make test-java && make test-agent && npm test`

**Migration concerns:** Rename `lottery_results` → `draws`, add metadata columns, composite unique. Backfill existing rows. Run during maintenance window.

**Rollback:** Migration 03 is reversible (Liquibase supports rollback). If rollback needed, restore `lottery_results` table name and drop new columns. Proto changes are additive (new field numbers), so old stubs still work.

### Phase 1 — 777

**Scope:** Official ingestion, Regular 7, Systematic 8, Systematic 9, historical stats, simulation, UI, saved plays, Agent, E2E.

**Files/components affected:**
- `lottery-stats-server/internal/scraper/seven_source.go` — **NEW**: official archive.aspx POST + paisresults.co.il fallback
- `lottery-stats-server/internal/engine/seven_evaluator.go` — **NEW**: hit-count evaluation, 0-hit prize, systematic C(N,7) expansion, cap logic
- `lottery-stats-server/internal/engine/seven_stats.go` — **NEW**: number freq, pair/triple/quad, EvO with hypergeometric C(17,k)C(53,7-k)/C(70,7)
- `lottery-stats-server/internal/lottery-tree/lottery_archive.go` — depth 4 for 777, string-key WinningCombos
- `lottery-stats-server/internal/seeder/lottery_seeder.go` — multi-game seeding
- `lottery-stats-server/internal/startup/server.go` — per-game scraper cron (777 2×/day)
- `ui-fable/src/app/features/games/seven/` — **NEW**: seven-page component with nested tabs
- `ui-fable/src/app/shared/components/seven-picker/` — **NEW**: 70-number board, bet type selector (Regular/Sys8/Sys9), sticky counter
- `ui-fable/src/app/shared/components/observed-expected/` — **NEW**: EvO display component
- `agent/app/rag/docs_source/game-777.md` — **NEW**: explanations, methodology, responsible use

**Tests:**
- `scraper/seven_source_test.go` — HTML fixture parse (official + fallback)
- `engine/seven_evaluator_test.go` — all 6 prize tiers (7,6,5,4,3,0 hits), systematic 8/9 expansion, cap
- `engine/seven_stats_test.go` — EvO with hypergeometric
- UI: `seven-picker.component.spec.ts`, `observed-expected.component.spec.ts`
- E2E: `e2e/games/seven.spec.ts` — switch to 777, pick 7, generate, simulate, verify 0-hit tier

**Acceptance criteria:**
- [ ] 777 Regular: pick 7, simulate → tiers show 7/6/5/4/3/0 hits with correct prizes (70,000/500/50/20/5/5)
- [ ] 777 Systematic 8: pick 8, simulate → 8 combos evaluated, aggregate payout
- [ ] 777 Systematic 9: pick 9, simulate → 36 combos, guaranteed prize (even 0 hits wins)
- [ ] Statistics show observed vs expected with hypergeometric baseline
- [ ] "Historical observation only" disclaimer visible
- [ ] Saved 777 plays don't appear in Lotto
- [ ] Agent can answer "what are the 777 prizes?" via `get_game_definition`

**Rollback:** 777 is behind game switcher. Disable 777 route, remove 777 scraper cron. Existing Lotto unaffected.

### Phase 2 — 123

**Scope:** Positional archive/statistics, positional UX, exact-order evaluation, stake×600 payout.

**Files/components affected:**
- `lottery-stats-server/internal/scraper/ott_source.go` — **NEW**
- `lottery-stats-server/internal/engine/ott_evaluator.go` — **NEW**: exact positional match, payout = stake × 600
- `lottery-stats-server/internal/engine/positional_stats.go` — **NEW**: P(d1), P(d2|d1), P(d3|d1,d2), ordered pairs/triples, repeat-digit patterns, EvO with uniform 1/10
- `lottery-stats-server/internal/engine/positional_archive.go` — **NEW**: preserves order (does NOT sort, unlike LotteryArchive)
- `ui-fable/src/app/features/games/one-two-three/` — **NEW**
- `ui-fable/src/app/shared/components/digit-position-picker/` — **NEW**: 3 positional digit selectors (0–9), stake selector

**Tests:**
- `scraper/ott_source_test.go` — fixture parse
- `engine/ott_evaluator_test.go` — exact match only, no partial prizes, payout = stake × 600
- `engine/positional_stats_test.go` — P(d1), P(d2|d1), ordered triples, EvO
- E2E: `e2e/games/ott.spec.ts` — pick 3 digits in order, simulate, verify only exact match wins

**Acceptance criteria:**
- [ ] 123 picker shows 3 positional digit selectors with "order matters" label
- [ ] Simulate: only exact order match wins, payout = stake × 600
- [ ] NO any-order, front-pair, back-pair, or single-digit prizes (verified against official rules)
- [ ] Statistics show positional frequency with uniform 1/10 expected baseline
- [ ] Stake selector (1₪–500₪)

**Rollback:** Disable 123 route. Existing games unaffected.

### Phase 3 — Chance

**Scope:** 32-card deck, 4 suit-positions, Chance 1/2/3/4/Rav-Chance/Systematic bet types, multiplier-based payouts.

**Files/components affected:**
- `lottery-stats-server/internal/scraper/chance_source.go` — **NEW**: parse 4-card grid (suit + rank), 32-card deck
- `lottery-stats-server/internal/engine/chance_evaluator.go` — **NEW**: positional suit matching, per-bet-type multiplier table, systematic expansion (up to 256 combos)
- `lottery-stats-server/internal/engine/chance_stats.go` — **NEW**: rank freq per suit, cross-position patterns, EvO with uniform 1/8
- `ui-fable/src/app/features/games/chance/` — **NEW**
- `ui-fable/src/app/shared/components/chance-picker/` — **NEW**: 4 suit-lanes × 8 ranks, bet type selector, stake selector
- `ui-fable/src/app/shared/components/lottery-card/` — **NEW**: card visual (suit + rank)

**Tests:**
- `scraper/chance_source_test.go` — 32-card deck parse
- `engine/chance_evaluator_test.go` — all bet types (Chance 1/2/3/4/Rav/Systematic), multiplier tables, positional matching
- `engine/chance_stats_test.go` — rank freq per suit, EvO with 1/8
- E2E: `e2e/games/chance.spec.ts` — pick cards per suit, simulate, verify multiplier payouts

**Acceptance criteria:**
- [ ] Chance picker shows 4 suit-lanes with 8 ranks each (7,8,9,10,J,Q,K,A) — NOT 52 cards
- [ ] Chance 1: 1 lane active, 1 hit = ×5
- [ ] Chance 4: 4 lanes, 4 hits = ×2000, 3 hits = ×8/10, etc.
- [ ] Rav-Chance: 4 lanes, 4 hits = ×1000 (different from Chance 4)
- [ ] Systematic: up to 4 cards per lane, up to 256 combos
- [ ] NO poker-hand evaluation (no flush, 4-of-a-kind, etc.)
- [ ] Statistics show rank frequency per suit with 1/8 expected baseline

**Rollback:** Disable Chance route. Existing games unaffected.

### Phase 4 — Advanced product

**Scope:** Cross-game dashboard, notifications, saved-play checking, advanced statistical explanations, subscriptions, agent recommendations.

**Not in scope for initial implementation.** Build only after all 4 games are correct and tested.

---

## 13. Risks

| Risk | Mitigation |
|------|------------|
| **Incorrect official rules** | All rules verified from pais.co.il on 2026-09-06. Definitions in `gameconfig` tagged with `Source` URL. Unit tests assert exact prize tables. |
| **Rule changes** | `RuleVersion` + `EffectiveFrom`/`EffectiveTo` on all definitions. Historical simulation uses applicable rules at draw date. |
| **Scraper instability** | Official source primary, paisresults.co.il fallback. Each draw carries `Source` provenance. Scraper failure logged, non-blocking. Fixture-based tests, no live network in CI. |
| **Historical prize inaccuracies** | Lotto parimutuel prizes scraped per-draw (existing `prize_seeder.go`). Conservative estimates when real data missing. 777/123/Chance are fixed/multiplier — no scraping needed. |
| **Misleading statistics** | EvO framework with theoretical baseline. "Historical observation only" disclaimer on every statistics view. No "hot/cold = better" messaging. Chi-square only where justified. |
| **DB migration** | Liquibase rollback supported. Composite unique `(game_type, draw_number)` is strictly more correct. Maintenance window for rename. |
| **Backward compatibility** | `UNSPECIFIED` → Lotto. New proto fields are additive. Existing E2E tests must pass unchanged. `form_type`/`prize_amounts` kept for old clients. |
| **UX complexity** | Per-game routes with lazy loading. Each game has dedicated picker. Shared design language but not shared picker component. |
| **Agent hallucination** | Rules come from `get_game_definition` tool (structured API), not RAG. RAG for explanations only. Context injection from game screen. |
| **Performance** | 777: depth-4 tree (not 17). Cache keyed by game type. 777/Chance high draw frequency → more rows, but queries filtered by `game_type`. Benchmarks for 777 archive. |
| **Chance 32-card deck confusion** | Card encoding 0–31 (not 0–51). Unit tests verify deck size. Picker shows only 8 ranks per suit. |

---

## 14. Final architecture decision

**Commit to:**

1. **Compositional domain model**: `GameDefinition` (draw schema + analysis capabilities) + `BetTypeDefinition` (selection + combination + evaluation + payout + cost rules). No flat `GameSpec` with boolean flags.

2. **Single source of truth**: `gameconfig` package in Go holds all definitions. Java, UI, and Agent consume via gRPC/REST API. No duplicated rules in constants or RAG.

3. **`BetEvaluator` interface**: `Evaluate(draw, bet, def) EvaluationResult`. Returns multiple combo evaluations, prize categories, stake, payout, net. Handles systematic expansion naturally.

4. **Versioned rules**: Every definition carries `RuleVersion`, `EffectiveFrom`, `EffectiveTo`, `Source`. Historical simulation uses applicable rules.

5. **Expected-vs-observed statistics**: Every frequency display shows observed, expected (theoretical), difference, sample size, and "does not affect next draw" disclaimer.

6. **Per-game routing**: `/games/{type}/{action}`. URL is source of truth. Per-game session state preserved on navigation.

7. **Hybrid DB model**: `draws` table with typed `numbers[]`/`strong` columns + JSONB `raw_payload`. Composite unique `(game_type, draw_number)`.

8. **Agent structured rule lookup**: `get_game_definition` tool calls Go gRPC. RAG for explanations only. Context injection from game screen.

9. **Incremental delivery**: Phase 0 (foundation + Lotto migration) → Phase 1 (777) → Phase 2 (123) → Phase 3 (Chance) → Phase 4 (advanced). Each phase independently deployable and rollback-able.

10. **TDD**: Every game has scraper fixture tests, evaluator tests, statistics tests, API tests, UI tests, and E2E tests. Existing Lotto E2E must pass at every phase.
