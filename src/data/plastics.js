// Common plastic-blend names per brand — general disc golf knowledge, not copied
// from any single source. Used to power plastic-type autocomplete suggestions.
export const PLASTICS_BY_BRAND = {
  "Innova": ["Champion", "Star", "GStar", "Halo Star", "Halo Champion", "DX", "Pro", "R-Pro", "XT", "Blizzard Champion", "Shryke", "Metal Flake Champion"],
  "Discraft": ["ESP", "Z", "Z Lite", "Ti", "X", "Pro-D", "Elite Z", "Elite X", "CryZtal", "Jawbreaker", "FLX", "Big Z"],
  "Dynamic Discs": ["Lucid", "Fuzion", "Classic", "Prime", "Classic Blend", "Lucid-X", "Lucid Ice", "BioFuzion", "Moonshine"],
  "Latitude 64": ["Opto", "Gold", "Retro", "Zero Hard", "Zero Medium", "Royal", "Opto Air", "Opto Glimmer"],
  "Westside Discs": ["VIP", "Tournament", "Origio Burst", "VIP Air", "Race"],
  "MVP": ["Neutron", "Proton", "Plasma", "Fission", "Eclipse", "Cosmic Neutron", "Electron"],
  "Axiom": ["Neutron", "Proton", "Plasma", "Fission", "Cosmic Neutron"],
  "Streamline": ["Neutron", "Proton", "Fission", "Cosmic Neutron"],
  "Discmania": ["C-Line", "S-Line", "D-Line", "P-Line", "G-Line", "Lux", "Neo", "Vapor"],
  "Kastaplast": ["K1", "K1 Hard", "K1 Glimmer", "K3", "K3 Soft"],
  "Prodigy": ["400", "400G", "400 Spectrum", "500", "500 Spectrum", "300", "300 Soft", "750", "AIR"],
  "Gateway": ["SureGrip", "Diamond", "Suregrip S", "Evolution"],
  "Infinite Discs": ["S-Blend", "C-Blend", "I-Blend", "G-Blend", "Metal Flake C-Blend"],
  "Millennium": ["Standard", "Sirius", "Quantum", "M3"],
  "DGA": ["ProLine", "SP Line", "D-Line", "Fluid"],
  "Legacy": ["Icon", "Pinnacle", "Legend", "Fusion"],
  "Lone Star Discs": ["Bluebonnet", "Sapphire", "Sandstone", "Alamo"],
  "Mint Discs": ["Sublime", "Eternal", "Apex"],
  "Thought Space Athletics": ["Aura", "Ethereal", "Nebula", "Aether"],
  "RPM": ["Magma", "Granite", "Basalt", "Cosmic"],
};

export const ALL_PLASTICS = [...new Set(Object.values(PLASTICS_BY_BRAND).flat())].sort((a, b) => a.localeCompare(b));
