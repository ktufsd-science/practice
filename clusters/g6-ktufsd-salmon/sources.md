# G6 Chinook Salmon Practice Cluster: Image and Data Sources

Working folder only. Not a publish path. Built 2026-11-20 for
`ktufsd/6th-grade/G6-Salmon-Practice-Cluster-MS-LS1-4-LS1-5.docx`.
No AI-generated images. No invented data.

## Images

### adult-chinook-staging.jpg (anchor photo, page 1)
- File: resized to 1200 px from `fws-staging-original.jpg` (4608 x 3456, PENTAX Optio WG-2 EXIF), downloaded directly from fws.gov.
- Source page: https://www.fws.gov/media/spring-chinook-staging-spawning
- Direct file: https://www.fws.gov/sites/default/files/2021-07/staging-spring-chinook-winthrop-national-fish-hatchery-michael-humling.jpg
- Agency: U.S. Fish and Wildlife Service (Winthrop National Fish Hatchery)
- Photographer: Michael Humling/USFWS (USFWS staff credit format)
- License as stated on the source page: "Media Usage Rights/License: Public Domain"
- Also on Wikimedia Commons as "Spring Chinook salmon staging for spawning.png", tagged Public domain, credited Michael Humling/USFWS.
- Source description: "Spring Chinook salmon spend weeks in the rivers where they eventually spawn, staging in cool water areas."
- Credit line used in the doc: "Photo: Michael Humling, U.S. Fish and Wildlife Service (public domain)"

### juvenile-chinook-raceway.jpg (Block 3 photo, page 4)
- File: resized to 1200 px from `juvenile-chinook-raceway-commons-original.png` (1602 x 902).
- Downloaded from Wikimedia Commons: https://upload.wikimedia.org/wikipedia/commons/1/12/Coleman_NFH_Chinook_salmon_juvenile_in_raceway.png
  (Commons page: "File:Coleman NFH Chinook salmon juvenile in raceway.png", tagged Public domain, author Laura Mahoney/USFWS, source given as the fws.gov page below.)
- Original source page: https://www.fws.gov/media/juvenile-chinook-salmon-5
- Agency: U.S. Fish and Wildlife Service (Coleman National Fish Hatchery, California)
- Photographer: Laura Mahoney/USFWS
- License as stated on the fws.gov page (checked 2026-11-20): "Media Usage Rights/License: Public Domain"
- Note: the fws.gov page lists the original as 3840 x 2160; I could not locate a direct original download link in the page HTML, so the Commons copy (smaller) was used. Same image, same credit.
- Credit line used in the doc: "Photo: Laura Mahoney, U.S. Fish and Wildlife Service (public domain)"

### growth-graph.png (Block 3 graph, page 4)
- Drawn by KTUFSD with matplotlib (`../make_graph.py`) from the published values below. Not a copy of a published figure.

## Data

### Growth graph values
- Source: Myrick, C. A., and J. J. Cech, Jr. 2002. Growth of American River fall-run Chinook salmon in California's Central Valley: temperature and ration effects. California Fish and Game 88(1):35 to 44. (Peer-reviewed journal of the California Department of Fish and Game.)
- Copy read: https://www.noaa.gov/sites/default/files/legacy/document/2020/Oct/07354626790.pdf (page 40 table image checked visually, not just OCR).
- Values used: column G, growth rate in % body weight per day, means only (standard errors omitted):

| Water temperature | Satiation ration (Table 2) | 25% of satiation (Table 1) |
|---|---|---|
| 11 C | 2.68 | -0.28 |
| 15 C | 3.60 | -0.75 |
| 19 C | 4.38 | -0.53 |

- Study facts used in the Block 3 text (Methods section): 720 fish, mean starting weight 1.7 g, all hatched and reared at Nimbus Salmon and Steelhead Hatchery (American River fall-run), four replicate tanks of 30 fish per temperature x ration treatment, 30-day experiment, rations of 100% satiation or 25% of satiation.
- Simplifications: "satiation ration" is called "full food supply" and "25% of satiation" is called "reduced food supply (25%)"; "% body weight per day" is labeled "percent of body mass per day." No values were changed or rounded.

### Spawning behavior and egg survival text (anchor and Block 2)
- Primary: Allen, M. A., and T. J. Hassler. 1986. Species Profiles: Life Histories and Environmental Requirements of Coastal Fishes and Invertebrates (Pacific Southwest): Chinook Salmon. U.S. Fish and Wildlife Service Biological Report 82(11.49); U.S. Army Corps of Engineers TR EL-82-4. Read via https://archive.org/details/DTIC_ADA172723 (also https://archive.org/details/doi-report_i-4989-2821149).
  - Female turns on her side and flexes body and tail to force gravel and fine sediment into the water column, deposited downstream.
  - Dominant male accompanies the female and aggressively chases away other males.
  - Female moves upstream and repeats; fertilized eggs buried 20 to 60 cm below the gravel surface with material from the new nest; redd = several nests.
  - Female may defend the redd from intruding females for 5 to 9 days after spawning.
  - Causes of egg mortality listed: shock injury from scouring, impaction, or superimposed spawning; low dissolved oxygen; toxic chemicals; excessively high water temperature; fungi or oligochaetes; predation by insects or fish; heavy sedimentation. (Cluster lists five of these in student language.)
  - Egg mortality "as high as 95%" under poor conditions and "as low as 10%" under ideal conditions.
  - Homing to parent stream through olfactory cues; salmon usually stop feeding after entering fresh water; usually spawn at 3 to 4 years old; fry spend 1 to 18 months in fresh water.
- Supporting: Beauchamp, D. A., M. F. Shepard, and G. B. Pauley. 1983. Species Profiles (Pacific Northwest): Chinook Salmon. FWS/OBS-82/11.6. https://archive.org/details/DTIC_ADA147263
  - Alevins remain in the gravel 4 to 6 weeks; adults live "?. to 4 weeks" after spawning (first digit garbled in the OCR text, likely 2; the cluster only says "a few weeks"); female produces 3,000 to 6,000 eggs.

### Numbers chosen by KTUFSD (not from data)
- Item 3 uses "Suppose a female lays 5,000 eggs." This is a stated hypothetical inside the published range (3,000 to 6,000 in Beauchamp et al. 1983; population averages of 3,634 and 7,295 in Allen and Hassler 1986).
