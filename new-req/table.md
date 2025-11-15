# REQUIREMENTS DOCUMENT — Battle/Kill List System with Banking + Money Printing Integration

## 1. Project Overview

Create a new system where the user can:
- Play Battles or Kill List challenges
- Mark the result as WIN or LOSE
- Assign a price, with strict constraints
- Select a bank where money is deposited or deducted
- Allow negative bank balances (loan mode)
- Integrate an existing Money Printing UI from another project

The agent must combine:
- These requirements
- The provided codebase containing the money-printing UI

into a new, clean, working project.

---

## 2. Functional Requirements

### 2.1 Battle / Kill List Selection
- User can select either:
  - **Battle**
  - **Kill List**
- No limit on how many battles per day

### 2.2 Price Input (Mandatory Constraint)
Price must:
- Be divisible by 1000
- **Allowed values:** 1000, 2000, 3000, 4000, 5000, ...
- **Disallowed values:** Any number not divisible by 1000

**Validation Rule:**
```
if price % 1000 !== 0:
    reject with error "Price must be divisible by 1000"
```

### 2.3 Battle Result
User must select:
- **WIN**
- **LOSE**

### 2.4 Bank Selection
User has two banks:
- Nabil Bank
- Rastriya Banijya Bank

User must choose one bank per battle result.

### 2.5 Banking Logic

**If WIN:**
- Selected bank adds the price amount

**If LOSE:**
- Selected bank deducts the price amount
- If deduction exceeds bank balance → bank goes negative
- Negative value = loan

**Example:**
```
Bank balance = 2000
User loses 5000
New balance = –3000 (loan)
```

No blocking if balance becomes negative.

---

## 3. Money Printing Feature

### 3.1 Trigger Rule
Money printing happens **ONLY if WIN**.

### 3.2 Printing Amount Constraint
The printed amount must:
- Be exactly equal to the price awarded
- Can only be printed one time per battle win

**Flow:**
1. User wins
2. Selected bank gets credited
3. Money printing UI pops up with exact winning amount

---

## 4. Money Printing UI Integration

You (the agent) will receive:
- A separate project/codebase that contains the money-printing animation/UI

**Requirements for integration:**
1. Inspect the provided project
2. Identify the component(s), function(s), or module(s) responsible for:
   - Showing the printed money
   - Handling animation
   - Trigger logic (if any)
   - Styling
3. Extract only the necessary code
4. Integrate it into the new project
5. Expose a function like: `printMoney(amount)`

This function will:
- Trigger the UI money printing animation
- Display the exact amount won
- Work seamlessly inside the new project's UI

---

## 5. Random Quotes (Driving Factor Slider)

**Purpose:** To show motivational quotes in an auto-sliding carousel.

**Implementation:**
- Use the best sliding method in the existing project framework (React/Next.js recommended)
- Quotes will be displayed randomly or in auto-loop

**Sample data:**
```
"Stay hungry."
"Win your daily battles."
"Every kill adds up."
"Consistency beats motivation."
```

---

## 6. Final System Flow (Very Important)

1. User chooses: **Battle OR Kill List**
2. User enters price → Validate: divisible by 1000
3. User chooses: **WIN or LOSE**
4. User selects bank: Nabil Bank or Rastriya Banijya Bank
5. Apply logic:
   - If WIN → add to bank
   - If LOSE → subtract (even if balance goes negative)
6. If WIN → Trigger: `printMoney(price)`
7. Update UI with:
   - Battle summary
   - Bank balances
   - Loan if negative
   - Money-printed animation

---

## 7. Technical Requirements

### 7.1 Framework
The agent may choose the most compatible framework (React/Next.js preferred unless specified later).

### 7.2 Code Quality
- Modular components
- Clean logic separation
- Configurable bank list
- Reusable money-printing function
- Strict validation on price

---

## 8. **UI/UX DESIGN REQUIREMENTS (CRITICAL FOR MOTIVATION)**

### 8.1 Design Philosophy
**The UI must be a MOTIVATIONAL POWERHOUSE that drives users to WIN.**

**Core Principles:**
- **High energy, bold, aggressive design**
- **Dark, powerful color schemes** (blacks, deep blues, golds, electric accents)
- **Smooth, premium animations** everywhere
- **Celebration-first mindset** for wins
- **Urgency and intensity** for battle selection

---

### 8.2 Visual Design Standards

#### Color Palette
- **Primary Background:** Deep black (#0a0a0a) or dark navy (#0f1419)
- **Accent Colors:**
  - Gold (#FFD700) for wins, money, achievements
  - Electric Blue (#00D4FF) for actions, buttons
  - Crimson Red (#DC143C) for losses, loans, danger
  - Neon Green (#39FF14) for positive momentum
- **Gradients:** Use bold gradients (gold→orange, blue→purple) for key elements
- **Glass-morphism:** Frosted glass effects on cards and panels

#### Typography
- **Headings:** Bold, aggressive fonts (Montserrat Black, Bebas Neue, Rajdhani Bold)
- **Numbers:** Large, impactful display (70px+ for bank balances)
- **Quotes:** Elegant, inspiring fonts (Playfair Display, Cinzel)
- All text should have subtle shadows or glows for depth

#### Spacing & Layout
- **Generous whitespace** to let elements breathe
- **Card-based design** with elevated shadows
- **Symmetrical balance** with dynamic asymmetry where appropriate
- **Mobile-first** but desktop-optimized

---

### 8.3 Component-Specific UI Requirements

#### **Battle Type Selection**
- **Large, bold cards** for "Battle" vs "Kill List"
- Hover effects: Scale up (1.05x), glow border, shift background
- Active state: Pulsing glow animation
- Icons: Sword/Shield for Battle, Target/Crosshair for Kill List
- Sound effect on selection (optional but recommended)

#### **Price Input**
- **Massive, centered input field**
- Real-time validation with smooth color transitions
  - Valid: Green glow
  - Invalid: Red shake animation + error text
- Display suggested amounts as quick-select chips below input
- Format numbers with commas (5,000 not 5000)

#### **Win/Lose Selection**
- **HUGE buttons, 50%/50% screen split**
- **WIN button:**
  - Gold gradient background
  - Triumphant icon (trophy, crown, star)
  - Hover: Confetti particle effect preview
  - Text: "VICTORY" or "WIN"
- **LOSE button:**
  - Dark red/crimson gradient
  - Defeated icon (broken shield, decline arrow)
  - Hover: Subtle crack effect
  - Text: "DEFEAT" or "LOSS"

#### **Bank Selection**
- **Premium bank cards** with bank logos
- 3D tilt effect on hover
- Show current balance prominently
- Color-code loan status (negative = red highlight)
- Animate balance changes with counting effect

#### **Bank Balance Display**
- **Dashboard-style cards** at top of screen
- **Nabil Bank** card on left
- **Rastriya Banijya Bank** card on right
- Display:
  - Bank name with logo/icon
  - Current balance (huge numbers)
  - Loan indicator if negative (red badge: "LOAN: ₹3,000")
  - Mini trend graph (optional: win/loss history)
- Animate balance updates with smooth counting transitions

#### **Money Printing Animation**
- **Full-screen takeover** on WIN
- Explosion of money bills from center
- Bills should:
  - Have realistic paper texture
  - Show actual amount on them
  - Float with physics (gravity, rotation, drift)
  - Fade out after 3-5 seconds
- Background darkens to spotlight the money
- Sound effect: Cash register "cha-ching!" or paper shuffle
- Confetti particles mixed with money
- Final amount display: Huge golden text "+₹5,000" fades in center

#### **Motivational Quotes Carousel**
- **Always visible** at top or bottom of screen
- Auto-slide every 5-7 seconds
- Smooth fade/slide transitions
- Quotes in elegant font, medium size
- Background: Subtle gradient or blur
- Optional: Author attribution for famous quotes
- Pause on hover for reading

---

### 8.4 Micro-Interactions & Animations

**Every interaction must feel PREMIUM:**

1. **Button clicks:** 
   - Scale down (0.95x) on press
   - Haptic feedback (if mobile)
   - Ripple effect from click point

2. **Form submissions:**
   - Loading state with spinner
   - Success: Checkmark animation
   - Error: Shake + red flash

3. **Transitions:**
   - Page transitions: Fade + slide (300ms)
   - Card appearances: Stagger fade-in
   - Number changes: Count-up animation

4. **Hover states:**
   - Subtle lift (transform: translateY(-4px))
   - Shadow intensity increase
   - Glow or border color change

5. **Background:**
   - Subtle particle system (floating dots, lines)
   - OR animated gradient mesh
   - OR dark with spotlight effects

---

### 8.5 Motivational Psychology Elements

**Features that drive user engagement:**

1. **Win Streak Counter:**
   - Display consecutive wins prominently
   - Special badge at 5, 10, 20 wins
   - Fire emoji or flame icon for streaks

2. **Loss Recovery Motivation:**
   - After loss: "Champions fall but rise stronger"
   - Show how much you need to win back
   - "Get back in the game" CTA

3. **Progress Indicators:**
   - Daily win goal tracker (e.g., "3/5 wins today")
   - Weekly earnings chart
   - Total battles fought counter

4. **Achievement Badges (Optional):**
   - "First Blood" - First win
   - "Debt Free" - Clear all loans
   - "High Roller" - Win ₹50,000+ in one day
   - "Warrior" - 100 total battles

5. **Competitive Elements:**
   - "Best day" record display
   - "Biggest win" showcase
   - Personal bests highlighted

---

### 8.6 Responsive Design Requirements

**Mobile (320px - 768px):**
- Stack all elements vertically
- Full-width buttons
- Larger touch targets (minimum 44px)
- Simplified animations (performance)
- Collapsible bank cards

**Tablet (768px - 1024px):**
- 2-column layout where appropriate
- Side-by-side bank cards
- Medium-sized animations

**Desktop (1024px+):**
- Maximum width container (1400px)
- Full animation effects
- Hover states active
- Multi-column dashboard layout

---

### 8.7 Performance Requirements

- **First load:** < 2 seconds
- **Animations:** 60fps minimum
- **No jank:** Smooth scrolling and transitions
- **Optimized images:** WebP format, lazy loading
- **Code splitting:** Load money printing UI only when needed

---

### 8.8 Accessibility (Don't compromise motivation)

- **High contrast** text (WCAG AA minimum)
- **Keyboard navigation** support
- **Screen reader** labels on all interactive elements
- **Focus indicators** clearly visible
- **Motion preferences:** Respect `prefers-reduced-motion`

---

## 9. Agent Responsibilities

The agent must:
1. Read this requirement document fully
2. Scan the provided "money printing" old project
3. Identify relevant:
   - Components
   - Animation logic
   - Helper functions
   - CSS or assets
4. Extract only what is needed
5. **Build a NEW clean project with EXCEPTIONAL UI/UX**
6. Integrate the money-printing UI into the new project
7. **Implement ALL motivational design elements**
8. Ensure all flows work together without errors
9. Provide final working project with:
   - Code
   - Documentation
   - Integration notes

---

## 10. Deliverables

1. **Complete new project folder**
2. **Integrated money-printing module**
3. **Fully functional:**
   - Battle/Kill list workflow
   - Bank update logic
   - Negative loan mode
   - Price validation
   - Random quote slider
   - Money printing animation
   - **Premium motivational UI**
4. **README explaining:**
   - Project structure
   - How money printing works
   - How bank logic works
   - UI design decisions
   - How to run the system

---

## 11. Success Criteria

**The project is successful when:**
- ✅ User feels EXCITED to engage with the system
- ✅ Wins feel TRIUMPHANT and celebrated
- ✅ Losses feel like TEMPORARY setbacks with comeback potential
- ✅ UI is SMOOTH, FAST, and BEAUTIFUL
- ✅ Every interaction feels PREMIUM
- ✅ User wants to come back DAILY
- ✅ All functional requirements met perfectly

---

**Remember: This is not just a banking app. This is a BATTLE SYSTEM. Every pixel should scream VICTORY or CHALLENGE. Make the user FEEL like a warrior managing their conquest.**

---

## 12. Database Schema Design

### 12.1 Database Selection
**Recommended:** PostgreSQL or MongoDB
- PostgreSQL for relational data integrity
- MongoDB for flexible document storage
- Can use localStorage for simple MVP, but database recommended for production

---

### 12.2 Table Structures

#### **Table 1: users**
Stores user profile and authentication data.

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    total_battles INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    total_lost DECIMAL(15,2) DEFAULT 0.00
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

**Fields explained:**
- `user_id`: Unique identifier
- `username`, `email`, `password_hash`: Authentication
- `total_battles`, `total_wins`, `total_losses`: Lifetime stats
- `current_win_streak`, `best_win_streak`: Motivational tracking
- `total_earned`, `total_lost`: Financial summary

---

#### **Table 2: banks**
Stores bank information and current balances per user.

```sql
CREATE TABLE banks (
    bank_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    is_loan BOOLEAN DEFAULT false,
    loan_amount DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, bank_name)
);

CREATE INDEX idx_banks_user_id ON banks(user_id);
CREATE INDEX idx_banks_bank_name ON banks(bank_name);
```

**Fields explained:**
- `bank_id`: Unique identifier
- `user_id`: Links to user
- `bank_name`: "Nabil Bank" or "Rastriya Banijya Bank"
- `balance`: Current balance (can be negative)
- `is_loan`: Flag indicating if bank is in loan status
- `loan_amount`: Absolute value of loan if negative

**Initial Data:**
```sql
-- Auto-create two banks per user on registration
INSERT INTO banks (user_id, bank_name, balance) VALUES
    ('user_uuid', 'Nabil Bank', 0.00),
    ('user_uuid', 'Rastriya Banijya Bank', 0.00);
```

---

#### **Table 3: battles**
Stores every battle/kill list entry with complete details.

```sql
CREATE TABLE battles (
    battle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    battle_type VARCHAR(20) NOT NULL CHECK (battle_type IN ('Battle', 'Kill List')),
    price DECIMAL(15,2) NOT NULL CHECK (price > 0 AND MOD(price, 1000) = 0),
    result VARCHAR(10) NOT NULL CHECK (result IN ('WIN', 'LOSE')),
    bank_name VARCHAR(100) NOT NULL,
    bank_id UUID NOT NULL REFERENCES banks(bank_id),
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    money_printed BOOLEAN DEFAULT false,
    money_printed_amount DECIMAL(15,2) DEFAULT 0.00,
    battle_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_battles_user_id ON battles(user_id);
CREATE INDEX idx_battles_battle_date ON battles(battle_date);
CREATE INDEX idx_battles_result ON battles(result);
CREATE INDEX idx_battles_user_date ON battles(user_id, battle_date);
```

**Fields explained:**
- `battle_id`: Unique identifier
- `user_id`: Links to user
- `battle_type`: "Battle" or "Kill List"
- `price`: Amount (validated: divisible by 1000)
- `result`: "WIN" or "LOSE"
- `bank_name`, `bank_id`: Which bank was affected
- `balance_before`, `balance_after`: Audit trail
- `money_printed`: Flag if money animation triggered
- `money_printed_amount`: Amount printed (for wins)
- `battle_date`: Date of battle (for daily tracking)
- `notes`: Optional user notes

---

#### **Table 4: bank_transactions**
Detailed transaction log for audit and history.

```sql
CREATE TABLE bank_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES banks(bank_id) ON DELETE CASCADE,
    battle_id UUID REFERENCES battles(battle_id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'LOAN_TAKEN', 'LOAN_CLEARED')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON bank_transactions(user_id);
CREATE INDEX idx_transactions_bank_id ON bank_transactions(bank_id);
CREATE INDEX idx_transactions_battle_id ON bank_transactions(battle_id);
CREATE INDEX idx_transactions_created_at ON bank_transactions(created_at);
```

**Fields explained:**
- `transaction_id`: Unique identifier
- `user_id`, `bank_id`: Links to user and bank
- `battle_id`: Links to battle (if applicable)
- `transaction_type`: Type of transaction
- `amount`: Transaction amount
- `balance_before`, `balance_after`: Audit trail
- `description`: Transaction description

---

#### **Table 5: achievements**
Tracks user achievements and badges.

```sql
CREATE TABLE achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_name VARCHAR(100) UNIQUE NOT NULL,
    achievement_description TEXT,
    achievement_icon VARCHAR(50),
    achievement_type VARCHAR(50) NOT NULL,
    criteria_value INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predefined achievements
INSERT INTO achievements (achievement_name, achievement_description, achievement_icon, achievement_type, criteria_value) VALUES
    ('First Blood', 'Win your first battle', '🏆', 'WINS', 1),
    ('Warrior', 'Complete 100 battles', '⚔️', 'BATTLES', 100),
    ('Debt Free', 'Clear all loans', '💰', 'LOAN_CLEARED', 0),
    ('High Roller', 'Win ₹50,000+ in one day', '💎', 'DAILY_EARNINGS', 50000),
    ('Win Streak 5', 'Win 5 battles in a row', '🔥', 'WIN_STREAK', 5),
    ('Win Streak 10', 'Win 10 battles in a row', '🔥🔥', 'WIN_STREAK', 10),
    ('Century', 'Win 100 battles', '💯', 'WINS', 100),
    ('Millionaire', 'Earn ₹1,000,000 total', '🤑', 'TOTAL_EARNED', 1000000);
```

---

#### **Table 6: user_achievements**
Tracks which achievements each user has unlocked.

```sql
CREATE TABLE user_achievements (
    user_achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_viewed BOOLEAN DEFAULT false,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at);
```

**Fields explained:**
- `user_achievement_id`: Unique identifier
- `user_id`, `achievement_id`: Links to user and achievement
- `unlocked_at`: When achievement was earned
- `is_viewed`: Whether user has seen the achievement notification

---

#### **Table 7: daily_stats**
Aggregated daily statistics for performance tracking.

```sql
CREATE TABLE daily_stats (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    total_battles INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_earned DECIMAL(15,2) DEFAULT 0.00,
    total_lost DECIMAL(15,2) DEFAULT 0.00,
    net_profit DECIMAL(15,2) DEFAULT 0.00,
    win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stat_date)
);

CREATE INDEX idx_daily_stats_user_id ON daily_stats(user_id);
CREATE INDEX idx_daily_stats_date ON daily_stats(stat_date);
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, stat_date);
```

**Fields explained:**
- `stat_id`: Unique identifier
- `user_id`: Links to user
- `stat_date`: Date of statistics
- `total_battles`, `total_wins`, `total_losses`: Daily counts
- `total_earned`, `total_lost`, `net_profit`: Daily financial summary
- `win_streak`: Current streak on that day

---

#### **Table 8: motivational_quotes**
Stores the rotating motivational quotes.

```sql
CREATE TABLE motivational_quotes (
    quote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_text TEXT NOT NULL,
    author VARCHAR(100),
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial quotes
INSERT INTO motivational_quotes (quote_text, author, category, is_active, display_order) VALUES
    ('Stay hungry.', 'Anonymous', 'motivation', true, 1),
    ('Win your daily battles.', 'Anonymous', 'action', true, 2),
    ('Every kill adds up.', 'Anonymous', 'persistence', true, 3),
    ('Consistency beats motivation.', 'Anonymous', 'discipline', true, 4),
    ('Fall seven times, stand up eight.', 'Japanese Proverb', 'resilience', true, 5),
    ('Victory belongs to those who believe in it the most.', 'Napoleon', 'belief', true, 6),
    ('Champions are made in the grind.', 'Anonymous', 'work', true, 7),
    ('No risk, no reward.', 'Anonymous', 'courage', true, 8);

CREATE INDEX idx_quotes_active ON motivational_quotes(is_active);
CREATE INDEX idx_quotes_order ON motivational_quotes(display_order);
```

**Fields explained:**
- `quote_id`: Unique identifier
- `quote_text`: The motivational quote
- `author`: Quote attribution
- `category`: Type of motivation
- `is_active`: Whether to display in rotation
- `display_order`: Order in carousel

---

### 12.3 Database Relationships

```
users (1) ──────< (∞) banks
users (1) ──────< (∞) battles
users (1) ──────< (∞) bank_transactions
users (1) ──────< (∞) user_achievements
users (1) ──────< (∞) daily_stats

banks (1) ──────< (∞) battles
banks (1) ──────< (∞) bank_transactions

battles (1) ──────< (1) bank_transactions

achievements (1) ──────< (∞) user_achievements
```

---

### 12.4 Key Database Operations

#### **Creating a Battle (Transaction Flow)**

```javascript
// Pseudo-code for battle creation
async function createBattle(userId, battleData) {
    // Start transaction
    const transaction = await db.beginTransaction();
    
    try {
        // 1. Get current bank balance
        const bank = await db.banks.findOne({
            user_id: userId,
            bank_name: battleData.bank_name
        });
        
        const balanceBefore = bank.balance;
        
        // 2. Calculate new balance
        let balanceAfter;
        if (battleData.result === 'WIN') {
            balanceAfter = balanceBefore + battleData.price;
        } else {
            balanceAfter = balanceBefore - battleData.price;
        }
        
        // 3. Update bank balance
        await db.banks.update({
            bank_id: bank.bank_id,
            balance: balanceAfter,
            is_loan: balanceAfter < 0,
            loan_amount: balanceAfter < 0 ? Math.abs(balanceAfter) : 0
        });
        
        // 4. Create battle record
        const battle = await db.battles.create({
            user_id: userId,
            battle_type: battleData.battle_type,
            price: battleData.price,
            result: battleData.result,
            bank_name: battleData.bank_name,
            bank_id: bank.bank_id,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            money_printed: battleData.result === 'WIN',
            money_printed_amount: battleData.result === 'WIN' ? battleData.price : 0
        });
        
        // 5. Create transaction record
        await db.bank_transactions.create({
            user_id: userId,
            bank_id: bank.bank_id,
            battle_id: battle.battle_id,
            transaction_type: battleData.result === 'WIN' ? 'CREDIT' : 'DEBIT',
            amount: battleData.price,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `${battleData.battle_type} ${battleData.result}`
        });
        
        // 6. Update user stats
        const userStats = await db.users.findOne({ user_id: userId });
        
        if (battleData.result === 'WIN') {
            await db.users.update({
                user_id: userId,
                total_battles: userStats.total_battles + 1,
                total_wins: userStats.total_wins + 1,
                current_win_streak: userStats.current_win_streak + 1,
                best_win_streak: Math.max(userStats.current_win_streak + 1, userStats.best_win_streak),
                total_earned: userStats.total_earned + battleData.price
            });
        } else {
            await db.users.update({
                user_id: userId,
                total_battles: userStats.total_battles + 1,
                total_losses: userStats.total_losses + 1,
                current_win_streak: 0,
                total_lost: userStats.total_lost + battleData.price
            });
        }
        
        // 7. Update daily stats
        await updateDailyStats(userId, battleData);
        
        // 8. Check for achievements
        await checkAndUnlockAchievements(userId);
        
        // Commit transaction
        await transaction.commit();
        
        return battle;
        
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

---

### 12.5 Important Queries

#### **Get User Dashboard Data**
```sql
-- Get all user data for dashboard
SELECT 
    u.username,
    u.total_battles,
    u.total_wins,
    u.total_losses,
    u.current_win_streak,
    u.best_win_streak,
    u.total_earned,
    u.total_lost,
    b1.balance as nabil_balance,
    b1.is_loan as nabil_is_loan,
    b1.loan_amount as nabil_loan,
    b2.balance as rastriya_balance,
    b2.is_loan as rastriya_is_loan,
    b2.loan_amount as rastriya_loan
FROM users u
LEFT JOIN banks b1 ON u.user_id = b1.user_id AND b1.bank_name = 'Nabil Bank'
LEFT JOIN banks b2 ON u.user_id = b2.user_id AND b2.bank_name = 'Rastriya Banijya Bank'
WHERE u.user_id = $1;
```

#### **Get Recent Battles**
```sql
-- Get last 10 battles
SELECT 
    battle_id,
    battle_type,
    price,
    result,
    bank_name,
    balance_before,
    balance_after,
    created_at
FROM battles
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 10;
```

#### **Get Today's Stats**
```sql
-- Get today's performance
SELECT 
    COALESCE(total_battles, 0) as battles_today,
    COALESCE(total_wins, 0) as wins_today,
    COALESCE(total_losses, 0) as losses_today,
    COALESCE(net_profit, 0) as profit_today
FROM daily_stats
WHERE user_id = $1 AND stat_date = CURRENT_DATE;
```

#### **Check Achievement Unlock**
```sql
-- Check if user should unlock "Win Streak 5"
SELECT 
    u.current_win_streak,
    a.achievement_id,
    a.criteria_value
FROM users u
CROSS JOIN achievements a
LEFT JOIN user_achievements ua ON u.user_id = ua.user_id AND a.achievement_id = ua.achievement_id
WHERE u.user_id = $1 
    AND a.achievement_type = 'WIN_STREAK'
    AND u.current_win_streak >= a.criteria_value
    AND ua.user_achievement_id IS NULL;
```

---

### 12.6 Data Migration & Seeding

**Seed Script (seed.sql):**
```sql
-- Create default admin user
INSERT INTO users (username, email, password_hash) VALUES
    ('warrior_one', 'warrior@battle.com', '$2b$10$hashed_password_here');

-- Get the user_id (replace with actual)
SET @user_id = 'actual-uuid-here';

-- Create banks for user
INSERT INTO banks (user_id, bank_name, balance) VALUES
    (@user_id, 'Nabil Bank', 10000.00),
    (@user_id, 'Rastriya Banijya Bank', 5000.00);

-- Insert motivational quotes (already shown above)

-- Insert achievements (already shown above)
```

---

### 12.7 Backup & Maintenance

**Recommended:**
- **Daily backups** of entire database
- **Transaction logs** enabled for point-in-time recovery
- **Indexes** on frequently queried columns (already added)
- **Periodic cleanup** of old transaction logs (>1 year)
- **Data retention policy**: Keep all battle history indefinitely

---

### 12.8 Security Considerations

- **Password hashing**: Use bcrypt with salt rounds ≥10
- **SQL Injection**: Use parameterized queries always
- **Input validation**: Validate at application layer AND database constraints
- **Row-level security**: Ensure users can only access their own data
- **Audit trails**: Transaction table provides complete history
- **Soft deletes**: Consider adding `deleted_at` columns instead of hard deletes

---

### 12.9 Scalability Considerations

**If app grows:**
- **Partition** `battles` table by date (monthly or yearly)
- **Archive** old transactions to separate table
- **Cache** user stats in Redis for faster dashboard loads
- **Read replicas** for analytics queries
- **Sharding** by user_id if millions of users

---

**Database schema complete. This design supports:**
✅ All functional requirements
✅ Complete audit trail
✅ Achievement system
✅ Performance tracking
✅ Motivational features
✅ Scalability
✅ Data integrity