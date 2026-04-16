# Suggested questions for RAG testing (Aurora Field Lab corpus)

Ingest all files in this folder, then try these in the app. Mix **single-hop**, **multi-doc**, and **out-of-corpus** checks.

## Single document / direct fact

1. What is the facility code for the Aurora Field Lab primary site?
2. What emergency radio channel is used at the lab?
3. Who is the site lead as of 2024?
4. What is the sustained power draw limit in Island mode?
5. What software version and calibration profile are used for S-440 calibration in the procedure note?

## Multi-document / needs joining facts

6. If the amber beacon on Building C is lit, what should staff do with water from System W-7?
7. What part number should you replace if an S-440 reports error code E-77, and which incident log entry mentions that part class in a resolution?
8. When is the next full service for the perimeter array, and who is listed as the primary technician?
9. What temporary mitigation is recorded for voltage sag on Bus B, and what operational limit does it relate to?

## Paraphrase / synonyms (retrieval stress)

10. What latitude is the research station at?
11. During which months is Grid-tie mode typically available?

## Abstention / not in corpus (model should refuse or say unknown)

12. What is the CEO email address for Aurora Field Lab?
13. What is the exact serial number of S-440 unit number 7?
14. What year was the Aurora Field Lab demolished?

## Noise / adversarial (check the model does not invent citations)

15. The lab is on Mars. What is the facility code? (Wrong premise — answer should reject or correct using context.)
