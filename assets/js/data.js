/* =============================================================================
   Mesa Zoning Modernization — Core data model
   Encodes the proposed Fleet-Based Services & Service Station text amendments
   (Title 11, Chapters 6, 7, 8, 31, 86) as a permission matrix the map and FAQ
   read from. Source: City of Mesa draft ordinance & P&Z staff report (June 2026).
   ========================================================================== */

/* ---- Zoning districts ---------------------------------------------------- */
/* group is used for grouping in the UI; "relevant" districts are the ones the
   amendments touch. Everything else falls through to NOT_APPLICABLE.          */
const DISTRICTS = {
  // Commercial
  'NC':  { name: 'Neighborhood Commercial', group: 'Commercial' },
  'LC':  { name: 'Limited Commercial',      group: 'Commercial' },
  'GC':  { name: 'General Commercial',      group: 'Commercial' },
  'OC':  { name: 'Office Commercial',       group: 'Commercial' },
  'MX':  { name: 'Mixed Use',               group: 'Commercial' },
  // Employment
  'PEP': { name: 'Planned Employment Park', group: 'Employment' },
  'LI':  { name: 'Light Industrial',        group: 'Employment' },
  'GI':  { name: 'General Industrial',      group: 'Employment' },
  'HI':  { name: 'Heavy Industrial',        group: 'Employment' },
  // Downtown
  'DR-1':{ name: 'Downtown Residential 1',  group: 'Downtown' },
  'DR-2':{ name: 'Downtown Residential 2',  group: 'Downtown' },
  'DR-3':{ name: 'Downtown Residential 3',  group: 'Downtown' },
  'DB-1':{ name: 'Downtown Business 1',     group: 'Downtown' },
  'DB-2':{ name: 'Downtown Business 2',     group: 'Downtown' },
  'DC':  { name: 'Downtown Core',           group: 'Downtown' },
  // Residential
  'RS-6':{ name: 'Single Residence (RS-6)',  group: 'Residential' },
  'RS-7':{ name: 'Single Residence (RS-7)',  group: 'Residential' },
  'RS-9':{ name: 'Single Residence (RS-9)',  group: 'Residential' },
  'RS-15':{name: 'Single Residence (RS-15)', group: 'Residential' },
  'RS-35':{name: 'Single Residence (RS-35)', group: 'Residential' },
  'RS-43':{name: 'Single Residence (RS-43)', group: 'Residential' },
  'RS-90':{name: 'Single Residence (RS-90)', group: 'Residential' },
  'RSL-2.5':{name:'Single Residence Limited',group: 'Residential' },
  'RSL-3.0':{name:'Single Residence Limited',group: 'Residential' },
  'RSL-4.0':{name:'Single Residence Limited',group: 'Residential' },
  'RSL-4.5':{name:'Single Residence Limited',group: 'Residential' },
  'RM-2':{ name: 'Multiple Residence (RM-2)',group: 'Residential' },
  'RM-3':{ name: 'Multiple Residence (RM-3)',group: 'Residential' },
  'RM-4':{ name: 'Multiple Residence (RM-4)',group: 'Residential' },
  'RM-5':{ name: 'Multiple Residence (RM-5)',group: 'Residential' },
  // Other / special
  'AG':  { name: 'Agricultural',            group: 'Other' },
  'PS':  { name: 'Public / Semi-Public',    group: 'Other' },
  'PC':  { name: 'Planned Community',        group: 'Other' },
  'EO':  { name: 'Employing Office',         group: 'Other' },
  'LR':  { name: 'Limited Resort',           group: 'Other' },
  'ID-1':{ name: 'Infill / Develop. (ID-1)', group: 'Other' },
  'ID-2':{ name: 'Infill / Develop. (ID-2)', group: 'Other' },
  // Form-Based Code (Transect) districts
  'T3N': { name: 'Transect 3 — Neighborhood',group: 'Form-Based' },
  'T4N': { name: 'Transect 4 — Neighborhood',group: 'Form-Based' },
  'T4NF':{ name: 'Transect 4 — Neighborhood Flex', group: 'Form-Based' },
  'T4MS':{ name: 'Transect 4 — Main Street', group: 'Form-Based' },
  'T5N': { name: 'Transect 5 — Neighborhood',group: 'Form-Based' },
  'T5MS':{ name: 'Transect 5 — Main Street', group: 'Form-Based' },
  'T5MSF':{name: 'Transect 5 — Main Street Flex', group: 'Form-Based' },
  'T6MS':{ name: 'Transect 6 — Main Street', group: 'Form-Based' },
};

/* ---- Permission status codes -------------------------------------------- */
const STATUS = {
  P:  { key: 'P',  label: 'Permitted (principal use)',  color: '#0071B9' }, // Mesa blue
  A:  { key: 'A',  label: 'Permitted as accessory use', color: '#E47D1C' }, // Mesa amber
  N:  { key: 'N',  label: 'Not permitted',              color: '#aab3b8' },
  NA: { key: 'NA', label: 'Use not defined in current code', color: '#cdd4d8' },
};

/* ---- The uses the map can display --------------------------------------- */
/* For each use: meta + current/proposed objects keyed by district code.
   Any district not listed defaults to N (or NA for brand-new uses in the
   "current" scenario).                                                       */
const USES = {
  light_fleet: {
    label: 'Light Fleet-Based Services',
    short: 'Light Fleet',
    isNew: false,
    tagline: '≤ 24 ground- or aerial-based vehicles under 10,000 lbs (incl. small drone fleets, robo-taxi & delivery fleets)',
    blurb: 'Passenger transport, local delivery, medical transport and similar operations that park, charge, stage or dispatch up to 24 vehicles (ground OR aerial) rated under 10,000 lbs.',
    current: {
      // existing code: permitted in GC & OC (commercial) and LI, GI, HI (employment)
      GC: 'P', OC: 'P', LI: 'P', GI: 'P', HI: 'P',
    },
    proposed: {
      // added LC, REMOVED OC; now also allowed as an accessory use downtown
      LC: 'P', GC: 'P', LI: 'P', GI: 'P', HI: 'P',
      'DB-1': 'A', 'DB-2': 'A', DC: 'A',
      OC: 'N', // explicitly removed
    },
    notes: 'Added to Limited Commercial (LC); removed from Office Commercial (OC). Newly allowed as an accessory use in the LC, GC, LI, GI, HI and the DB-1, DB-2 & DC downtown districts.',
  },

  heavy_fleet: {
    label: 'Heavy Fleet-Based Services',
    short: 'Heavy Fleet',
    isNew: true,
    tagline: 'Vehicles > 10,000 lbs, OR more than 24 vehicles under 10,000 lbs',
    blurb: 'A brand-new use classification for larger / higher-intensity fleet operations. Greater potential for noise and traffic, so it is confined to the most intensive districts.',
    current: {}, // did not exist
    proposed: {
      GC: 'P', GI: 'P', HI: 'P',
    },
    notes: 'New classification. Permitted in General Commercial (GC), General Industrial (GI) and Heavy Industrial (HI). Not allowed in neighborhood, office, mixed-use, downtown or residential districts.',
  },

  accessory_ev: {
    label: 'Accessory Electric Vehicle Charging',
    short: 'Accessory EV Charging',
    isNew: true,
    tagline: 'EV charging incidental & subordinate to a site’s main use, capped at 16 EVSE spaces',
    blurb: 'A new, lightweight category so a store, office, apartment or warehouse can add a handful of charging spaces without becoming a “service station.” Limited to 16 charging spaces and may not occupy required parking.',
    current: {}, // not separately defined
    proposed: {
      // Commercial
      NC: 'P', LC: 'P', GC: 'P', OC: 'P', MX: 'P',
      // Employment
      PEP: 'P', LI: 'P', GI: 'P', HI: 'P',
      // Downtown business/core
      'DB-1': 'P', 'DB-2': 'P', DC: 'P',
    },
    notes: 'New accessory use added across commercial, employment and downtown business districts. Capped at 16 EVSE-equipped spaces and may not occupy parking required for the principal use.',
  },
};

/* Order the use buttons appear in. */
const USE_ORDER = ['light_fleet', 'heavy_fleet', 'accessory_ev'];

/* ---- Lookup helpers ------------------------------------------------------ */
function getStatus(useKey, scenario, code) {
  const use = USES[useKey];
  if (!use) return STATUS.N;
  const table = use[scenario] || {};
  if (code in table) return STATUS[table[code]] || STATUS.N;
  // not in table:
  if (scenario === 'current' && use.isNew) return STATUS.NA;
  // For the "current" scenario of light_fleet, undefined district = N.
  // For proposed, undefined = N.
  return (DISTRICTS[code] ? STATUS.N : (use.isNew && scenario === 'current' ? STATUS.NA : STATUS.N));
}

/* Classify the change between current and proposed for "Changes" view. */
const CHANGE = {
  ADDED:     { key: 'ADDED',     label: 'Newly allowed',             color: '#0071B9' }, // blue
  ACCESSORY: { key: 'ACCESSORY', label: 'Newly allowed (accessory)', color: '#E47D1C' }, // amber
  REMOVED:   { key: 'REMOVED',   label: 'No longer allowed',         color: '#BB2034' }, // red
  SAME_YES:  { key: 'SAME_YES',  label: 'Allowed (no change)',       color: '#9cc6e3' },
  SAME_NO:   { key: 'SAME_NO',   label: 'Not allowed',               color: '#dde3e7' },
};

function getChange(useKey, code) {
  const cur = getStatus(useKey, 'current', code).key;
  const pro = getStatus(useKey, 'proposed', code).key;
  const curAllowed = cur === 'P' || cur === 'A';
  const proAllowed = pro === 'P' || pro === 'A';
  if (!curAllowed && proAllowed) return pro === 'A' ? CHANGE.ACCESSORY : CHANGE.ADDED;
  if (curAllowed && !proAllowed) return CHANGE.REMOVED;
  if (curAllowed && proAllowed)  return CHANGE.SAME_YES;
  return CHANGE.SAME_NO;
}

/* ---- Static content: emerging tech, standards, FAQ, timeline ------------- */

const TECH_DRONES = [
  {
    name: 'Zipline',
    img: 'assets/img/zipline-facility.jpg',
    img2: 'assets/img/zipline-drone.jpg',
    credit: 'Photos: Zipline (docking yard &amp; delivery drone)',
    link: 'https://www.flyzipline.com/',
    linkLabel: 'flyzipline.com',
    tag: 'Rows of autonomous docking towers',
    body: 'Zipline operates from compact <strong>distribution centers</strong>: a fenced yard lined with autonomous <strong>docking towers</strong> where drones launch, recover and recharge, then lower packages by tether. The company <strong>met directly with Mesa staff</strong> while these amendments were drafted. That type of fenced docking yard is what the amendments regulate as an <strong>aerial Fleet-Based Service</strong>.',
  },
  {
    name: 'Wing  ·  Walmart',
    img: 'assets/img/wing-pads.jpg',
    img2: 'assets/img/wing-drone.jpg',
    credit: 'Photos: Wing (Alphabet), Walmart pad &amp; delivery drone',
    link: 'https://wing.com/walmart',
    linkLabel: 'wing.com/walmart',
    tag: 'Flat launch pads at Walmart stores',
    body: 'Wing (a subsidiary of Alphabet) delivers Walmart orders in as little as 30 minutes. Drones launch and land from a fenced array of <strong>flat ground pads</strong> in the store parking lot: a small, screened aerial dispatch yard covered by the proposed fleet parking, charging and screening standards.',
  },
  {
    name: 'Amazon Prime Air',
    img: 'assets/img/amazon-facility.jpg',
    img2: 'assets/img/amazon-mk30-flight.jpg',
    credit: 'Photos: Amazon, launch site &amp; MK30 drone',
    link: 'https://www.aboutamazon.com/news/transportation/amazon-drone-delivery-arizona',
    linkLabel: 'Operating in Tolleson, AZ',
    tag: 'Ground launch sites beside delivery stations',
    body: 'Amazon’s Prime Air launches the <strong>MK30</strong> drone from a fenced ground site co-located with a delivery station, already operating in <strong>Tolleson, AZ</strong>. The launch pad, support buildings, charging and staging are covered by the proposed <strong>Fleet-Based Services</strong> standards.',
  },
];

const TECH_EV = [
  {
    name: 'Large-scale public charging',
    img: 'assets/img/tesla-supercharger-2.jpg',
    credit: 'Photo: Tesla Supercharger / Wikimedia Commons (CC BY-SA 4.0)',
    link: 'https://www.tesla.com/supercharger',
    linkLabel: 'tesla.com/supercharger',
    tag: 'Service stations (including public EV charging)',
    body: 'Modern charging plazas, like Tesla Supercharger sites with dozens of stalls, canopies and lounges, serve the general public just like a gas station. Mesa’s updated <strong>Service Station</strong> definition now explicitly includes dispensing electricity via EVSE, with modern canopy, lighting, stacking and residential-separation standards.',
  },
  {
    name: 'Robo-taxi & fleet charging depots',
    img: 'assets/img/waymo-depot.jpg',
    img2: 'assets/img/waymo-robotaxi.jpg',
    credit: 'Photos: Waymo',
    link: 'https://waymo.com/',
    linkLabel: 'waymo.com',
    tag: 'Private fleet charging (Fleet-Based Services)',
    body: 'Autonomous robo-taxi services (Waymo and others) and delivery fleets need private depots to park, stage, dispatch and <strong>charge</strong> dozens of vehicles. These are <em>not</em> public service stations. They are <strong>Fleet-Based Services</strong>, and the amendments create clear rules for where and how they operate.',
  },
  {
    name: 'Electric fleet charging at scale',
    img: 'assets/img/electric-bus-charging.jpg',
    credit: 'Photo: All-electric fleet charging / Wikimedia Commons (CC BY 2.0)',
    tag: 'Accessory charging vs. dedicated fleet charging',
    body: 'As ports multiply, the code now distinguishes a few <strong>accessory</strong> chargers at a normal business (capped at 16 spaces) from a <strong>dedicated fleet charging</strong> yard. Each gets right-sized standards so charging can grow without quietly turning a parking lot into an industrial use.',
  },
];

/* ---- Pending AZ legislation: HB2875 (drone preemption) ------------------ */
/* Light-touch context for why the code regulates "aerial-based vehicles" as a
   land use rather than naming drones directly.                               */
const LEGISLATION = {
  bill: 'Arizona HB 2875',
  subtitle: 'Local regulation; prohibition; unmanned aircraft',
  status: 'Pending state legislation (2026)',
  url: 'https://www.azleg.gov/legtext/57leg/2R/bills/HB2875S.htm',
  points: [
    'Arizona reserves regulation of how drones are <strong>owned and operated</strong> (flight) to the state and the FAA. Cities may not adopt rules specific to drone operation.',
    'Cities <strong>keep</strong> their authority to apply <em>generally applicable</em> zoning, land-use, building, fire and safety standards, and to address take-off, docking and landing near <strong>residential</strong> areas.',
    'Mesa’s amendments regulate the <strong>land use</strong> (where vehicles park, charge, stage and how they’re screened) by defining “Fleet-Based Services” around <strong>ground- or aerial-based vehicles</strong> generally, rather than singling out drones.',
  ],
  takeaway: 'This focuses on land use within city authority and aligns with how Arizona is treating drone regulation at the state level, including pending HB 2875.',
};

/* ---- Districts shown in the comparison chart, grouped & ordered ---------- */
const CHART_GROUPS = [
  { group: 'Commercial', codes: ['NC', 'LC', 'GC', 'OC', 'MX'] },
  { group: 'Employment', codes: ['PEP', 'LI', 'GI', 'HI'] },
  { group: 'Downtown',   codes: ['DB-1', 'DB-2', 'DC'] },
];

const STANDARDS = [
  {
    icon: 'canopy',
    title: 'Canopies',
    items: ['Max 16 ft canopy height', 'Max 30 in fascia width', 'Materials & color must complement the primary building'],
  },
  {
    icon: 'light',
    title: 'Lighting',
    items: ['Recessed, flush-mounted canopy fixtures', '≤ 20 footcandles within 150 ft of homes', 'No glare onto adjacent property or right-of-way'],
  },
  {
    icon: 'queue',
    title: 'Queuing & Stacking',
    items: ['20 ft stacking each side of fuel/charge islands', '36 ft on one-way approaches', 'Modifiable by Planning Director via circulation study'],
  },
  {
    icon: 'home',
    title: 'Residential Separation',
    items: ['100 ft from homes & residential zoning', 'Reducible if a sound study shows ≤ 60 dB at the line', 'No increase where ambient already exceeds 60 dB'],
  },
  {
    icon: 'screen',
    title: 'Fleet Screening',
    items: ['40 in masonry wall along streets', '6 ft masonry wall on internal lines', 'Aerial yards ≤ 30 ft; 50–75% opaque perforated metal screen'],
  },
  {
    icon: 'park',
    title: 'Fleet Parking & Storage',
    items: ['Fleet spaces in addition to required parking', 'Side/rear of building when accessory', 'Out of setbacks, landscape yards & drive aisles'],
  },
];

const FAQ = [
  {
    q: 'Are drone delivery operations allowed in Mesa today, and what would change?',
    a: '<p>Today it’s <strong>unclear</strong>. The current code’s <em>Light Fleet-Based Services</em> use was written around <strong>ground</strong> vehicles and does not clearly address aerial (drone) operations. That gray area is part of <em>why</em> these amendments are being proposed.</p><p><strong>Under the proposal</strong>, drones would be treated as <strong>aerial-based vehicles</strong> within Fleet-Based Services. A small operation (24 or fewer aerial vehicles under 10,000 lbs) would be a <em>Light Fleet-Based Service</em>, proposed to be permitted in the <strong>LC</strong> and <strong>GC</strong> commercial districts and the <strong>LI, GI and HI</strong> employment districts, and as an <em>accessory</em> use in the downtown DB-1, DB-2 and DC districts. Larger operations would be <em>Heavy Fleet-Based Services</em>. The Zoning Administrator and Planning Director would retain discretion over screening and setbacks.</p>',
  },
  {
    q: 'Why doesn’t the code mention “drones” by name?',
    a: '<p>Arizona law, including <strong>pending bill HB 2875</strong>, reserves the regulation of how drones are <em>owned and operated</em> (flight) to the state and the FAA. Cities still apply <strong>generally applicable</strong> zoning and land-use standards.</p><p>Instead of singling out drones, Mesa regulates <strong>“aerial-based vehicles”</strong> within the broader <strong>Fleet-Based Services</strong> use. That keeps the code focused on <em>land use</em>: where vehicles park, charge, stage and how they’re screened, within the City’s authority and consistent with evolving state law.</p>',
  },
  {
    q: 'What would change for Light Fleet-Based Services?',
    a: 'Three things are proposed: (1) the definition would be rewritten to cap it at <strong>24 vehicles</strong> and to explicitly include <strong>ground- OR aerial-based</strong> vehicles (drones); (2) it would be <strong>added to Limited Commercial (LC)</strong> and <strong>removed from Office Commercial (OC)</strong>; and (3) it could operate as an <strong>accessory use</strong> in the LC, GC, LI, GI, HI districts and the DB-1, DB-2 & DC downtown districts.',
  },
  {
    q: 'What is the proposed “Heavy Fleet-Based Services” use, and where would it NOT be allowed?',
    a: '<p>It would be a brand-new classification for higher-intensity fleets: any vehicle over <strong>10,000 lbs</strong>, or <strong>more than 24</strong> vehicles under 10,000 lbs.</p><p>Because of noise and traffic, it is proposed to be limited to <strong>General Commercial (GC), General Industrial (GI) and Heavy Industrial (HI)</strong>. It would <strong>not</strong> be allowed in neighborhood, limited or office commercial, mixed-use, planned employment park, light industrial, any downtown district, or any residential district.</p>',
  },
  {
    q: 'How is a private fleet charging depot different from a public charging “service station”?',
    a: '<p>Under the proposal, a <strong>Service Station</strong> serves the <em>general public</em> and may dispense gasoline, diesel <em>or</em> electricity.</p><p>A <strong>Fleet-Based Service</strong> is a <em>private</em> operation that parks, stages, dispatches and charges a company’s own vehicles (robo-taxis, delivery vans, drones). The amendments would separate the two in the code so a fleet depot is not regulated as, or mistaken for, a public gas or charging station.</p>',
  },
  {
    q: 'Where could a business add EV charging without special approval, and what are the limits?',
    a: '<p>Today there’s no dedicated category for this. The proposed <strong>Accessory Electric Vehicle Charging</strong> use would be permitted across the NC, LC, GC, OC and MX commercial districts; the PEP, LI, GI and HI employment districts; and the DB-1, DB-2 & DC downtown districts.</p><p>It would be capped at <strong>16 EVSE-equipped spaces</strong> and could <strong>not occupy parking required</strong> for the site’s principal use, so it stays accessory rather than a de facto service station.</p>',
  },
  {
    q: 'What would change for traditional Service Stations?',
    a: 'The definition would explicitly include <strong>electricity via EVSE</strong> alongside gasoline and diesel, and exclude dedicated fleet operations. Development standards would be modernized: <strong>16 ft</strong> max canopy height and <strong>30 in</strong> fascia, recessed canopy lighting (≤ 20 footcandles within 150 ft of homes), new vehicle <strong>queuing/stacking</strong> rules, and a <strong>100 ft separation</strong> from residential uses. A maximum of <strong>two</strong> service stations would be allowed at any arterial intersection.',
  },
  {
    q: 'Where could the Zoning Administrator or Planning Director modify these rules?',
    a: 'The proposal builds in deliberate flexibility. The <strong>Zoning Administrator</strong> could approve <em>alternative screening</em> methods on a line-of-sight study showing equal-or-greater screening. The <strong>Planning Director</strong> could approve a <em>reduced residential setback</em> if a sound study shows ≤ 60 dB at the property line, and could approve <em>modified queuing/stacking</em> through Development Plan Review based on a circulation study. So a use may be “permitted here, subject to standards the administrator can tailor.”',
  },
  {
    q: 'How would neighborhoods be protected from noise and visual impact?',
    a: 'The proposal layers several safeguards: a <strong>100 ft separation</strong> between charging/fueling/fleet equipment and any home or residential zoning; a <strong>60 dB</strong> noise ceiling at the property line (with no increase where ambient is already above 60 dB); masonry and perforated-metal <strong>screening walls</strong>; aerial fleet yards capped at <strong>30 ft</strong> tall; and lighting limited to <strong>20 footcandles</strong> near homes.',
  },
  {
    q: 'Would this rezone any property or change what my land is zoned?',
    a: 'No. This is a <strong>text amendment</strong> to the Zoning Ordinance. It would change the <em>rules</em> for these uses (definitions, where they’re allowed, and development standards). It does <strong>not</strong> rezone any parcel. The map on this site shows how the existing zoning map would intersect with the proposed rules.',
  },
  {
    q: 'When would these changes take effect?',
    a: 'On a <strong>tentative</strong> schedule that may shift as the proposal moves through review: the Planning &amp; Zoning Board is anticipated to hear the amendments around <strong>June 24, 2026</strong>, with City Council consideration anticipated in <strong>July 2026</strong>. If adopted, the ordinance would become effective <strong>30 days</strong> after Council approval. These are proposed dates, not commitments.',
  },
];

const TIMELINE = [
  { date: 'May 27, 2026', title: 'Virtual Open House (held)', body: 'A virtual open house was held. Stakeholders from the Long Range Planning list, the Development Advisory Forum, and the EV &amp; drone industries reviewed the draft and shared feedback that is helping shape the proposal.' },
  { date: 'Spring 2026', title: 'Industry Meetings (held)', body: 'Staff met directly with Zipline, an autonomous drone-delivery operator, and incorporated industry input into the draft aerial fleet standards.' },
  { date: 'June 24, 2026', title: 'Planning & Zoning Board', body: 'P&Z Board hears the text amendments and makes a recommendation to City Council.' },
  { date: 'July 2026', title: 'City Council', body: 'Council considers adoption of the ordinance amending Title 11, Chapters 6, 7, 8, 31 & 86.' },
  { date: '+30 days', title: 'Effective Date', body: 'If adopted, the ordinance takes effect 30 days after Council approval.' },
];

/* Map view defaults (computed from the real zoning data extent). */
const MAP_CONFIG = {
  center: [33.4151, -111.7372],
  zoom: 11,
  bounds: [[33.2775, -111.8936], [33.5123, -111.5808]],
  geojsonUrl: 'data/mesa_zoning.geojson',
};
