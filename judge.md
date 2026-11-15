# Judge Profiles

Briefing on the three judges, built from their public LinkedIn profiles and posts (as of mid-Nov 2026). Facts are taken from their own pages. Items under **Likely to reward** and **Likely to push on** are inferences from what they post and build, not statements from the judges.

Common thread: all three are active in the Malaysian.ai / 500 Global community in KL and run or attend the weekly Show & Tell. Their feedback is shaped by seeing many unfinished demos, so working code and honest trade-offs land better than polished decks.

---

## 1. Ken Ooi

**Role:** AI Engineer at A47 AI. Co-host of the Malaysian.ai podcast. Resident at Malaysian.ai (500 Global, KL).
**Background:** MEng Mechatronics, Robotics & Automation (Southampton). Ex-Shell. TEDx speaker. Finalist at the BEYOND Expo AI Hackathon, Macau 2026.

### What he builds
- Power Studio: a node-based canvas for AI video workflows (similar to Higgsfield or Freepik Spaces).
- Multi-model generation backend: Kling, Seedance, Wan, Seedream, GPT Image, Gemini and TTS behind one registry, with per-provider queues, failure recovery and credit billing with automatic refunds.
- Story Studio (a story becomes a shot-by-shot node graph) and a Carousel/video renderer (FFmpeg, Remotion).
- An agentic podcast-editing workspace.
- Stack: Python, TypeScript, Next.js, Supabase, FFmpeg, Remotion.
- Traction he cites: 500+ users, 9,000+ generations in the first 90 days.

### Views he has posted (hackathon takeaways)
- Every hackathon has a rubric. Winning starts with following it.
- How you show it can beat how good it is.
- Cut what doesn't matter. Everyone builds a dashboard, and don't demo your sign-up page.
- Don't ask AI what to build. You get the most average answer.
- Spend more time on the idea. AI builds fast, so thinking is the scarce part.

### Likely to reward
- A sharp, non-generic idea with a clear audience.
- A demo that shows the core flow in seconds and skips boilerplate screens.
- Production thinking: queues, failure handling, cost and billing, since he builds these himself.
- Creative or video/media use cases that go beyond a prompt box.
- Marketing and distribution awareness. He is organizing a builders-meet-marketers event.

### Likely to push on
- Why this idea, and why not the obvious one every team picked?
- What happens when a model call fails or costs too much?
- Who uses it, and how do you reach them?

---

## 2. Mohtasham Murshid Madani

**Role:** AI Engineer. Founder, Oikina. SpaceXAI Ambassador (Cursor Ambassador for KL and Kashmir). Resident at Malaysian.ai. Recently left CitySage after a year.
**Background:** BSc Computer Science, Taylor's University (2023–2026).

### What he builds
- Oikina: an "enterprise small cloud", the runtime under agent-built apps covering identity, policy, data, releases and audit.
- `@mohtasham/md-to-docx`: open-source Markdown to .docx library, 1,000,000+ npm downloads, v4.
- Haze Monitor (hazemonitor.com): ad-free haze tracker for Malaysia and Singapore using official DOE and NEA readings, 13K users in four weeks. Built with Isaac Tan Heng Wai.
- VideoClaw (UGC and competitor-style ads), CitizenAudit (1st place, BIS × FOSS Standard-a-thon), Checkmate (misinformation verification; 1st runner-up at ImagineHack 2025; top 10 of 1,547 at the Great Malaysia AI Hackathon).
- Past: AI agents for government councils, including on-prem deployment.

### Track record and views
- 19-hackathon-wins conversation on the Malaysian.ai podcast with Hong Bing Sim. Discussed what judges look for and why they stop at dashboards.
- Describes his workflow as writing briefs, running parallel agent tasks on separate branches, and reviewing the results. He says the bottleneck is now taste: deciding what to build and what to throw away.
- His VideoClaw engineering notes lock in a verified baseline, then strip back context and tools while checking that quality doesn't drop.
- Showed an open design reference library (Binmob) for prompt engineering.

### Likely to reward
- A real problem with real users and measurable early traction.
- Use of official or trustworthy data sources.
- Evidence the thing works: a verified baseline, tests, checks.
- Clean developer ergonomics and open-source readiness.
- Thoughtful agent design: scoped tools, human approval before changes, audit trail.
- SEO and AI discoverability details such as llms.txt and an OpenAPI spec (he credits these for traffic).

### Likely to push on
- Is this a dashboard? What is the actual action or decision it enables?
- Governance and safety: who approves changes, and how do you audit them?
- How did you verify quality did not regress?

---

## 3. Andrew G.

**Role:** Founding Engineer at Postlight. Resident at Malaysian.ai. Previously CTO at AIMA Labs. Runs the Show & Tell write-ups and shares them on LinkedIn.
**Background:** 9+ years as a senior full-stack and AI systems engineer. Published AI researcher (the "Towards Artificial Life" / PAULA work on biologically-plausible learning).

### What he builds
- kube32: a Kubernetes-compatible control plane and WebAssembly pod runtime for the ESP32-S3, with demos running DOOM and a keyword-spotter, diffusion and story-model pipeline across microcontrollers. Open source, v0.1.0.
- Real-time multimodal agent platform over WebRTC and telephony (turn latency under 800 ms, 99.99% uptime), MCP tool-synthesis, multi-region Kubernetes on AWS, and a telemetry/evaluation harness with p50–p99 latency tracing.
- Earlier: Callegram (winner, Telegram Mini Apps Contest 2023), HUNTME (logistics hiring platform, FMCSA API checks plus OpenAI screening, 7,500 users), Pokemod (rebuilt Android app and backend, 5x revenue).
- Stack: Python (FastAPI), TypeScript, React, Next.js, AWS, Docker, PostgreSQL, Redis.

### Patterns in how he evaluates (from his Show & Tell summaries)
- He highlights the decisions and trade-offs behind a demo, not only the result.
- He values unfinished work that states what is still hard (e.g. "proving the full sensor-to-alert flow is the hard part").
- He gives credit to constraint-aware design: CPU and battery limits, on-device processing, human-editable controls, hard math checks that reject bad totals.
- He includes honest numbers about his own work (kube32: 3.2 fps alone, 1.7 fps with two players, 174 ms a frame, and the bottleneck is the interpreter).
- He likes working code, hardware and live terminals over pitches ("No corporate pitches, no selling and no theory").

### Likely to reward
- Engineering depth and a clear architecture you can explain.
- Honest benchmarks, with limits stated up front.
- Reliability work: latency tracing, failure recovery, evaluation harnesses.
- Constraints turned into design choices (local-first, resource-limited, privacy-preserving).
- Anything novel at the systems or research level.

### Likely to push on
- Where does it break? What are the numbers?
- Which part is actually yours, and which is an API call?
- How do you measure that it's working in production?

---

## Cross-judge cheat sheet

| | Ken Ooi | Mohtasham | Andrew G. |
|---|---|---|---|
| Lens | Idea + story + media craft | Real users + verified quality | Systems depth + honest limits |
| Loves | Sharp idea, tight demo, creative AI | Traction, official data, agent safety | Benchmarks, reliability, constraints |
| Tired of | Dashboards, sign-up screens, generic AI ideas | Dashboards, unverified claims | Pitch-only decks, hand-waving |
| Ask yourself | Why this idea? | Who uses it and how do you know it works? | Where does it break? |

### What to do with this
1. Open the demo with the single core action. Skip login and dashboards.
2. Say why the idea is not the obvious one for this problem statement.
3. Show one real number: users, latency, accuracy, cost per run.
4. State one limitation and what you would fix next.
5. Show a failure path or approval step. All three judges care about what happens when things go wrong.
6. Keep a 30-second answer ready for "how would people find this?"

### Sources
Public LinkedIn profiles and posts of Ken Ooi, Mohtasham Murshid Madani and Andrew G., viewed 15 Nov 2026. Update this file if the judging panel or the rubric changes.
