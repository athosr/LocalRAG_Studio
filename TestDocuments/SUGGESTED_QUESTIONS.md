# Suggested questions for RAG testing (Aurora Field Lab corpus)

Ingest all files in this folder (the five legacy demo files plus **`afl_corpus_001.md`–`afl_corpus_100.md`**), then try these in the app. Mix **single-hop**, **multi-doc**, and **out-of-corpus** checks.

## Single document / direct fact

1. What is the facility code for the Aurora Field Lab primary site?
2. What emergency radio channel is used at the lab?
3. Who is the site lead as of 2024?
4. What is the sustained power draw limit in Island mode?
5. What software version and calibration profile are used for S-440 calibration in the procedure note?

## Multi-document / needs joining facts (legacy bundle)

6. If the amber beacon on Building C is lit, what should staff do with water from System W-7?
7. What part number should you replace if an S-440 reports error code E-77, and which incident log entry mentions that part class in a resolution?
8. When is the next full service for the perimeter array, and who is listed as the primary technician?
9. What temporary mitigation is recorded for voltage sag on Bus B, and what operational limit does it relate to?

## Multi-document clusters — **requires 2–5 files** (new `afl_corpus_*.md` set)

Each item below is answerable only by combining the listed sources (no single file contains the full answer).

10. **(3 files)** `afl_corpus_011.md`, `afl_corpus_012.md`, `afl_corpus_013.md` — During **Storm Dial Orange**, where must escorted visitors muster by default, and which **VHF** channel is used for visitor coordination (not the staff emergency simplex)?
11. **(4 files)** `afl_corpus_021.md`, `afl_corpus_022.md`, `afl_corpus_023.md`, `afl_corpus_024.md` — For Helios line **POH-2025-11814**, which **dock** must receive the crate for acclimation, what is the **PO prefix** required on packing slips, and who served as **secondary approver** on the recorded approver pair?
12. **(5 files)** `afl_corpus_031.md`, `afl_corpus_032.md`, `afl_corpus_033.md`, `afl_corpus_034.md`, `afl_corpus_035.md` — For **ECN-2025-190** / feeder **F-B12**, list the **Bus B voltage** threshold and **duration**, the lug **torque** spec, the **idle soak** duration, and the **kitchen sub-meter** plus **kilowatt** cap that defines “idle loads” for that soak.
13. **(2 files)** `afl_corpus_015.md`, `afl_corpus_016.md` — Routing tag **XT-015** starts in note 015; what is the **completion token** recorded under **Completion** in note 016?
14. **(3 files)** `afl_corpus_041.md`, `afl_corpus_042.md`, `afl_corpus_043.md` — For manifest line **OL-77**, where is **FG-9** stored (vault, bay, shelf hint), which **access key** applies, and what is the **local sign-out cutoff** time?
15. **(4 files)** `afl_corpus_051.md`, `afl_corpus_052.md`, `afl_corpus_053.md`, `afl_corpus_054.md` — Which **perimeter node** and **hypothesis id** tie the cyclic PM2.5 spikes to kitchen damper motion, which **gasket kit** does runbook **RB-INT-09** specify at step 7, how many kits are on hand, and which hypothesis id should maintenance cite when that kit is used in this pattern?
16. **(5 files)** `afl_corpus_061.md`, `afl_corpus_062.md`, `afl_corpus_063.md`, `afl_corpus_064.md`, `afl_corpus_065.md` — For **CV-2**, at what **temperature** does **CRYO-HI** trigger (with duration), what **escalation level** is that, who is the **W12-2025** primary for that escalation, which **PLT-** badge may receive delegation, and within how many **minutes** must a delegated response file template **SR-CRYO-L2**?
17. **(3 files)** `afl_corpus_071.md`, `afl_corpus_072.md`, `afl_corpus_073.md` — Which mitigation ticket and legacy handheld are implicated in the **151.825 MHz** spur, what replacement unit is specified on the work order, and what **dBm** threshold applies on checklist **CL-RF-60** across how many fence-line grid points?
18. **(2 files)** `afl_corpus_081.md`, `afl_corpus_082.md` — When **W-7** turbidity exceeds **4 NTU**, which processing **mode** applies and what **free chlorine target (mg/L)** is required at outlet sampler **OS-W7-OUT** until hourly grabs clear?
19. **(4 files)** `afl_corpus_086.md`, `afl_corpus_087.md`, `afl_corpus_088.md`, `afl_corpus_089.md` — For uplink window **UW-2025-08-11A**, which **satellite asset tag** binds the window, which **store-and-forward queue** is the fallback, under which **weather flag** may that queue be used without executive approval, and what wind **knots** / **duration** define that flag at **ANM-EC**?

## Multi-document — **legacy + new** (still ≤5 files)

20. **(3 files)** `01_aurora_lab_overview.txt`, `04_incident_log_excerpt.txt`, `afl_corpus_032.md` — Island mode cites an **18 kW** sustained cap in the overview and incident log; what **minimum Bus B voltage** and **minutes** must be held per **ECN-2025-190** before closing **F-B12** after the ice event?

## Paraphrase / synonyms (retrieval stress)

21. What latitude is the research station at?
22. During which months is Grid-tie mode typically available?

## Abstention / not in corpus (model should refuse or say unknown)

23. What is the CEO email address for Aurora Field Lab?
24. What is the exact serial number of S-440 unit number 7?
25. What year was the Aurora Field Lab demolished?

## Noise / adversarial (check the model does not invent citations)

26. The lab is on Mars. What is the facility code? (Wrong premise — answer should reject or correct using context.)
