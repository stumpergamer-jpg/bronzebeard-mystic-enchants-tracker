# Changelog

All notable changes to the Mystic Enchants Tracker will be documented in this file.

## [1.6.0] - 2026-01-14

### Added
- Multilingual support for spell name translations (FR, ES, DE, IT)
- Fallback mechanism for spell ID lookup to handle class-differentiated spells
- Smart icon loading system that handles both simple and class-differentiated spell names

### Fixed
- **Spell Name Display**: Removed parenthetical class identifiers from spell names in the UI
  - Holy Mastery (Paladin) → Holy Mastery
  - Holy Mastery (Priest) → Holy Mastery
  - Restoration Mastery (Druid) → Restoration Mastery
  - Restoration Mastery (Shaman) → Restoration Mastery
- **Tooltip Links**: Fixed spell ID lookup to correctly identify class-specific spell variants
  - Each spell variant now links to its unique Ascension DB page
  - Holy Mastery (Paladin) → spell ID 1134990
  - Holy Mastery (Priest) → spell ID 1134968
  - Restoration Mastery (Druid) → spell ID 1134978
  - Restoration Mastery (Shaman) → spell ID 1134982
- **Spell Icons**: Fixed icon loading for spells with class-specific variants
  - Icons now load correctly using class-differentiated filenames
  - Removed generic icon files that caused display conflicts

### Changed
- Updated spell ID lookup logic in `script.js` to try both simple and parenthesized names
- Modified icon loading to use class suffix for spells requiring differentiation
- Enhanced error logging for missing spell IDs and icons

### Technical Details
- **Files Modified**:
  - `js/data.js`: Updated spell names in enchants array, added translations for all languages
  - `js/script.js`: Enhanced spell ID and icon lookup mechanisms
  - `Icons/`: Removed conflicting generic icon files

## [1.5.0] - Previous Release

### Features
- Multi-language support (EN, FR, ES, DE, IT)
- Dynamic progress tracking with class icons
- Undo functionality
- Faction-specific map detection
- Video guide integration
- Local storage for progress persistence

---

**Note**: This tracker is designed for World of Warcraft: Ascension's Mystic Enchants system.
