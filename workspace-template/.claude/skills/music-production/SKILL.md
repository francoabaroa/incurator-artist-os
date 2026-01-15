---
name: music-production
description: Technical guidance for recording, mixing, and mastering with systematic diagnosis frameworks. Use when artist asks about studio setup, DAW techniques, vocal chains, mix issues (muddy, harsh, flat), achieving professional sound, or any recording/production questions. Also triggers for plugin recommendations, acoustic treatment, gain staging, or troubleshooting audio problems.
---

# Music Production

Expert guidance for music creation from recording through final master, with systematic problem-solving frameworks.

## When to Use This Skill

- Questions about home studio setup or acoustic treatment
- Troubleshooting mix issues (muddy, harsh, flat, boomy, thin)
- Pre-mastering preparation
- DAW workflow and plugin recommendations
- Vocal recording and processing
- Achieving specific sonic references

## The Diagnosis Framework

Before suggesting fixes, systematically diagnose the problem:

### Step 1: Identify the Symptom

**Common symptom categories:**

| Symptom | Likely Frequency Range | Common Causes |
|---------|------------------------|---------------|
| "Muddy" | 200-500Hz | Too much low-mid buildup |
| "Harsh" | 2-5kHz | Excessive presence, bad room |
| "Boomy" | 80-200Hz | Room modes, proximity effect |
| "Thin" | <200Hz | Over-filtering, bad mic placement |
| "Boxy" | 300-800Hz | Room resonances, cheap mics |
| "Sibilant" | 5-10kHz | Mic position, over-compression |
| "Dull" | >8kHz | Missing high-frequency content |
| "No punch" | 1-4kHz attack | Over-compression, weak transients |

### Step 2: Locate the Source

**Ask in this order:**

1. **Is it in the recording or the mix?**
   - Can you hear it in the raw track solo'd? → Recording problem
   - Only appears in full mix? → Mix problem

2. **Is it one element or everything?**
   - One instrument/vocal → Focus there
   - Everything → Room, monitoring, or master bus issue

3. **Does it come and go?**
   - Consistent → Permanent fix needed
   - Intermittent → May be performance-related or automation issue

### Step 3: Fix at the Source

**The Hierarchy of Fixes (Best → Worst):**

```
1. Fix the source (re-record, move mic, change instrument)
      ↓
2. Edit the performance (timing, pitch, comping)
      ↓
3. Subtractive processing (EQ cuts, gating)
      ↓
4. Additive processing (EQ boosts, compression)
      ↓
5. Creative effects (saturation, reverb, modulation)
```

**Golden Rule: Fix it at the source. Move the mic. Change the string. Tuning won't fix a bad performance.**

## The "Fix-It" Decision Trees

### Mix Sounds Muddy

```
1. Check Low-Mid Buildup (200-500Hz)
   ├─ Multiple instruments fighting? → High-pass everything but bass/kick
   ├─ Too many elements in same range? → Choose ONE to own that space
   └─ Room resonance captured? → Re-record or surgical cut

2. Check Bass/Kick Relationship
   ├─ Both fighting for 80-120Hz? → Sidechain or frequency split
   └─ Neither is clear? → Define ONE as the sub foundation

3. Check Reverb/Delay
   ├─ Too much low-end in reverbs? → Roll off below 200Hz on sends
   └─ Too long decay? → Shorten reverb, tighten delays
```

### Mix Sounds Harsh

```
1. Identify the Culprit
   ├─ Vocals? → Check 2-4kHz, de-esser, try different mic
   ├─ Guitars? → Check 3-5kHz, amp sim settings
   └─ Cymbals? → Check 5-8kHz, room mics, sample replacement

2. Check Recording Conditions
   ├─ Recorded in untreated room? → Reflections = harshness
   └─ Singer too close to mic? → Proximity effect overcorrected

3. Processing Audit
   ├─ Too much compression? → Bringing up harsh frequencies
   ├─ EQ boost in 2-5kHz? → Try cutting instead of boosting elsewhere
   └─ Clipper/limiter too aggressive? → Back off, add headroom
```

### Vocals Not Sitting Right

```
1. Level Problems
   ├─ Too loud? → Automate or compress more
   ├─ Too quiet? → Bring up and use more compression
   └─ Inconsistent? → Volume automation before compression

2. Frequency Problems
   ├─ Fighting with guitar/keys? → Cut 200-500Hz from competing elements
   ├─ Lacking presence? → Boost 2-4kHz (gently)
   └─ Too bright/piercing? → De-ess, cut 3-6kHz

3. Space Problems
   ├─ Too dry (disconnected)? → Add short room reverb
   ├─ Too wet (distant)? → Reduce reverb, use delays instead
   └─ Wrong depth? → Adjust pre-delay on reverb
```

### No Low End / Weak Bass

```
1. Monitoring Reality Check
   ├─ Are you hearing bass in your room? → Check speaker placement
   ├─ Mixing on headphones only? → Bass perception is unreliable
   └─ Room modes killing frequencies? → Move listening position

2. Source Problems
   ├─ DI bass too clean? → Add saturation/amp sim
   ├─ Kick drum samples weak? → Layer with sub-focused sample
   └─ Synth bass too harmonically rich? → Filter, focus on fundamental

3. Mix Problems
   ├─ Bass and kick fighting? → Use sidechain or frequency carving
   ├─ Low-end not in mono? → Make everything below 80-100Hz mono
   └─ Too much low-end reverb? → High-pass reverb returns
```

## Recording Best Practices

### Gain Staging Checklist

**Signal Chain:**
```
Microphone → Preamp → Interface → DAW
            ↑         ↑           ↑
         -10dB     -6dB        -18dBFS
         target    target      target peak
```

- Preamp: Aim for around -10dB on the preamp meter
- Interface input: Hitting -6dB to -3dB max
- DAW: Peaks around -18dBFS to -12dBFS (leave headroom)
- **Never clip at any stage.** You can always add gain later.

### Microphone Selection Matrix

| Source | Budget Option | Pro Option | Placement Tip |
|--------|---------------|------------|---------------|
| Vocals (female) | AT2020 | Neumann U87, TLM 103 | 6-8 inches, slight angle |
| Vocals (male) | SM7B | Sony C-800G | 4-6 inches, pop filter essential |
| Acoustic guitar | SM81 | AKG C414 | 12th fret, 8-12 inches |
| Electric guitar | SM57 | Royer 121 | On-axis = bright, off-axis = warm |
| Kick drum | AKG D112 | Shure Beta 52 | Inside shell for attack, outside for boom |
| Snare | SM57 | Telefunken M80 | 1-2 inches above rim, angled at head |

### Room Acoustics Quick Fixes

**If you can't treat your room:**
- Record in the tightest space possible (closets work)
- Use heavy blankets behind and around the mic
- Record late at night when ambient noise is lowest
- Face away from the loudest wall
- Put the mic closer to reduce room sound

## Mixing Frameworks

### The Static Mix Method

Before reaching for any plugins:

1. **Faders only** — Get the best balance you can with just levels
2. **Pan positions** — Place everything in the stereo field
3. **Listen for 10 minutes** — Take notes on what bothers you
4. **Then process** — Only fix what you identified as problems

### The "Less is More" Audit

**For every plugin on your mix:**
- Can you HEAR what it's doing? → If no, bypass it
- Is it fixing a problem or just "doing something"? → Be honest
- Would the mix suffer without it? → A/B test

**The rule:** If you can't hear a plugin, bypass it. Each plugin adds phase shift and complexity.

### Reference Track Method

1. Import 2-3 reference tracks in your genre
2. Match loudness (use LUFS metering)
3. A/B constantly during mixing
4. Ask: "What's different?"
5. Make adjustments to close the gap

**Common discoveries:**
- Reference has more high-end (my mix is dull)
- Reference has less low-mid (my mix is muddy)
- Reference is wider (my mix is narrow)
- Reference has more dynamic movement (my mix is over-compressed)

### The Car Test

**A mix isn't done until it sounds good in terrible environments:**
- Car stereo
- Phone speaker
- Bluetooth pill speaker
- Laptop speakers
- AirPods/earbuds

**What to listen for:**
- Can you hear the vocal clearly?
- Is the bass present but not overwhelming?
- Do cymbals/hi-hats hurt your ears?
- Does it feel balanced?

## Pre-Mastering Checklist

Before sending to mastering or running through LANDR/eMastered:

- [ ] **Headroom**: Peaks at -3dB to -6dB (no clipping)
- [ ] **Master bus clean**: Remove limiters, heavy compression, and "loudness" plugins
- [ ] **Bit depth**: Export at 24-bit or 32-bit float
- [ ] **Sample rate**: Same as recording (usually 44.1kHz or 48kHz)
- [ ] **Top and tail**: Leave 0.5-1 second of silence at start, let reverb tails ring out
- [ ] **No DC offset**: Most DAWs handle this automatically
- [ ] **File format**: WAV or AIFF (uncompressed)

## Anti-Patterns: What NOT to Do

❌ **"Fix it in the mix"** — The lie that keeps bad recordings alive. Fix it at the source.
❌ **Boosting to solve problems** — Usually, cutting elsewhere is better than boosting.
❌ **Too many plugins on every track** — If you can't hear it, bypass it.
❌ **Mixing without references** — You'll drift without a target.
❌ **Only listening on one system** — Your mix will lie to you.
❌ **Mastering your own mix immediately** — Take a break. Listen tomorrow.
❌ **Chasing "loudness"** — Streaming platforms normalize. -14 LUFS is plenty loud.

## Workflow

1. **Diagnosis**
   - What specific symptom are they experiencing?
   - What's the source (recording vs. mix)?
   - What's their monitoring situation?

2. **Targeted Recommendation**
   - Use the decision trees above
   - Prioritize source fixes over processing fixes
   - Give one clear action, not five options

3. **Verification**
   - How can they verify the fix worked?
   - Suggest A/B testing or reference comparisons
   - Recommend checking on multiple systems

4. **Update Workspace**
   - Add production tasks to `tasks/backlog.json`
   - If applicable, note lessons learned for future sessions

## Output Files

- `tasks/backlog.json` - Production and technical tasks

## More Information

- See [references/mix-checklist.md](references/mix-checklist.md) for systematic mix review
- See [references/mastering-checklist.md](references/mastering-checklist.md) for pre-mastering prep
- See [references/gear-recommendations.md](references/gear-recommendations.md) for budget-specific suggestions
