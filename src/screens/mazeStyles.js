import { StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';

export const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  content: {
    padding: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingIcon: {
    fontSize: 44,
    marginBottom: 12,
  },

  loadingTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  headerInfo: {
    flex: 1,
  },

  title: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 18,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  hero: {
    minHeight: 155,
    borderRadius: 22,
    marginBottom: 18,
    padding: 18,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  heroContent: {
    maxWidth: '75%',
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
  },

  heroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  heroBadge: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  heroBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },

  subjectsSection: {
  marginBottom: 20,
},

  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  subjectTile: {
    width: '22.5%',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    ...SHADOWS.small,
  },

  subjectTileIcon: {
    fontSize: 24,
    marginBottom: 4,
  },

  subjectTileName: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: '800',
  },

  searchSection: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    ...SHADOWS.small,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 3,
    marginBottom: 10,
  },

  searchIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  searchInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 11,
  },

  searchButton: {
    width: 45,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchError: {
    color: COLORS.error || '#E85D5D',
    fontSize: 9,
    marginTop: 8,
    fontWeight: '800',
  },

  searchInputWrap: {
  flex: 1,
  justifyContent: 'center',
  },

  clearButton: {
    position: 'absolute',
    right: 8,
    padding: 4,
  },

  suggestionBox: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  suggestionHeader: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  suggestionIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },

  suggestionLabelWrap: {
    flex: 1,
  },

  suggestionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  suggestionMatch: {
    color: COLORS.textPrimary,
    fontWeight: '900',
  },

  suggestionTag: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '800',
  },

  searchResultCard: {
    marginTop: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  resultInfo: {
    flex: 1,
  },

  resultSubject: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },

  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  availableText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '800',
  },

  unavailableText: {
    color: COLORS.error || '#E85D5D',
    fontSize: 9,
    fontWeight: '800',
  },

  resultMeta: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 8,
  },

  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },

  favoriteButtonActive: {
    backgroundColor: COLORS.primary,
  },

  favoriteButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },

  favoriteButtonTextActive: {
    color: COLORS.white,
  },

  playSubjectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },

  playSubjectText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  favoritesSection: {
    marginBottom: 20,
  },

  favoriteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  favoriteHeaderInfo: {
    flex: 1,
  },

  favoriteCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteCountText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
  },

  emptyFavorites: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  emptyFavoriteTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyFavoriteText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 5,
  },

  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 9,
    marginBottom: 9,
    ...SHADOWS.small,
  },

  favoriteMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  favoriteIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  favoriteIcon: {
    fontSize: 20,
  },

  favoriteInfo: {
    flex: 1,
  },

  favoriteName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },

  favoriteMeta: {
    color: COLORS.textSecondary,
    fontSize: 8,
    marginTop: 2,
  },

  removeFavoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },

  subjectIconBox: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  subjectIcon: {
    fontSize: 27,
  },

  subjectInfo: {
    flex: 1,
  },

  subjectLabel: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  subjectName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  titleSection: {
    marginBottom: 15,
  },

  difficultyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },

  difficultySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  difficultyList: {
    gap: 10,
  },

  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 13,
    borderWidth: 2,
    ...SHADOWS.small,
  },

  difficultyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },

  difficultyIcon: {
    fontSize: 25,
  },

  difficultyIonIcon: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(26,16,48,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  difficultyInfo: {
    flex: 1,
  },

  difficultyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },

  difficultyName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  difficultyTag: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 5,
  },

  difficultyTagText: {
    color: COLORS.white,
    fontSize: 6,
    fontWeight: '900',
  },

  difficultyDescription: {
    color: COLORS.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },

  difficultyBest: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 6,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },

  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  stat: {
    fontSize: 8,
    fontWeight: '900',
  },

  statCoin: {
    fontSize: 9,
  },

  difficultyArrow: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  difficultyRewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inkDark,
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },

  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardBannerContent: {
    flex: 1,
  },

  rewardBannerTitle: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  rewardBannerText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 3,
  },

  rewardBannerCoin: {
    fontSize: 20,
  },

  /* ========================================================
     DAILY CHALLENGE + ACHIEVEMENTS
  ======================================================== */

  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: COLORS.accent,
    ...SHADOWS.small,
  },

  dailyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  dailyIcon: {
    fontSize: 24,
  },

  dailyInfo: {
    flex: 1,
  },

  dailyLabel: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  dailyName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },

  dailyMeta: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 3,
    lineHeight: 13,
  },

  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    ...SHADOWS.small,
  },

  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },

  achievementLocked: {
    opacity: 0.45,
  },

  achievementIcon: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },

  achievementInfo: {
    flex: 1,
  },

  achievementTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },

  achievementDesc: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 1,
  },

  /* ========================================================
     SETTINGS
  ======================================================== */

  settingsCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 22,
    ...SHADOWS.large,
  },

  settingsScroll: {
    maxHeight: 400,
    marginTop: 14,
    marginBottom: 16,
  },

  settingsLabel: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },

  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.backgroundSecondary,
  },

  optionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  optionChipText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },

  optionChipTextActive: {
    color: COLORS.white,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
  },

  toggleInfo: {
    flex: 1,
    paddingRight: 10,
  },

  toggleLabel: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },

  toggleHint: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },

  /* ========================================================
     GAME SCREEN EXTRAS
  ======================================================== */

  gameHeaderInfo: {
    flex: 1,
  },

  gameTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },

  gameSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 8,
    ...SHADOWS.small,
  },

  hudItem: {
    flex: 1,
    alignItems: 'center',
  },

  hudLabel: {
    color: COLORS.textTertiary,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  hudValue: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  heartsRow: {
    flexDirection: 'row',
    gap: 1,
  },

  heart: {
    fontSize: 11,
  },

  heartDead: {
    opacity: 0.25,
  },

  pauseButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pauseText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  powerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },

  powerChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  powerChipOn: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.backgroundSecondary,
  },

  powerChipText: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: '800',
  },

  mazeOuter: {
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  wall: {
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  coin: {
    backgroundColor: COLORS.accent,
  },

  powerCell: {
    textAlign: 'center',
    fontWeight: '900',
    color: COLORS.primary,
  },

  quizNode: {
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizMark: {
    color: COLORS.white,
    fontWeight: '900',
  },

  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  countdownText: {
    color: COLORS.primary,
    fontSize: 56,
    fontWeight: '900',
  },

  /* Goals card */
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    ...SHADOWS.small,
  },

  goalList: {
    flex: 1,
  },

  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },

  goalText: {
    color: COLORS.textPrimary,
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },

  goalTextDone: {
    color: COLORS.textSecondary,
  },

  goalTextWarn: {
    color: '#E85D5D',
  },

  goalQuizDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },

  goalQuizMark: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },

  goalGhostEmoji: {
    fontSize: 14,
    width: 16,
    textAlign: 'center',
  },

  goalImage: {
    width: 52,
    height: 52,
  },

  joystickBase: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(120,120,160,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(120,120,160,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  joystickKnob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    opacity: 0.85,
  },

  controls: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },

  controlButton: {
    width: 60,
    height: 54,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  controlText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },

  keyboardHint: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontSize: 9,
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  quizCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.large,
  },

  quizLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizLoadingText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 12,
    fontWeight: '800',
  },

  quizTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quizHeader: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
    flex: 1,
  },

  streakBadge: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  streakBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '900',
  },

  quizDifficulty: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  timerTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.backgroundSecondary,
    overflow: 'hidden',
    marginBottom: 12,
  },

  timerFill: {
    height: 6,
    borderRadius: 3,
  },

  question: {
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 16,
    fontWeight: '700',
  },

  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },

  answerHidden: {
    opacity: 0.25,
  },

  answerCorrect: {
    borderColor: '#2F9E44',
    backgroundColor: 'rgba(47,158,68,0.14)',
  },

  answerWrong: {
    borderColor: '#E85D5D',
    backgroundColor: 'rgba(232,93,93,0.14)',
  },

  answerLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  answerLetterText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  answerText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1,
  },

  quizPowerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },

  quizPowerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },

  quizPowerDisabled: {
    opacity: 0.35,
  },

  quizPowerText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },

  feedback: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '800',
  },

  questionHint: {
    color: COLORS.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },

  pauseOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  pauseCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    ...SHADOWS.large,
  },

  pauseIcon: {
    textAlign: 'center',
    fontSize: 40,
    marginBottom: 8,
  },

  pauseTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  pauseSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },

  resumeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  resumeText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
  },

  restartButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  restartText: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 13,
  },

  exitButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.error || '#E85D5D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  exitText: {
    color: COLORS.error || '#E85D5D',
    fontWeight: '900',
    fontSize: 13,
  },

  /* ========================================================
     REVIEW SCREEN
  ======================================================== */

  reviewHero: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    ...SHADOWS.medium,
  },

  reviewEmoji: {
    fontSize: 44,
  },

  reviewTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },

  reviewSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },

  reviewStars: {
    color: COLORS.accent,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 4,
  },

  newBestBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },

  newBestText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '900',
  },

  reviewStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  reviewStat: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  reviewStatValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
  },

  reviewStatLabel: {
    color: COLORS.textTertiary,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    ...SHADOWS.small,
  },

  reviewNote: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 6,
  },

  missedCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },

  missedQuestion: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },

  missedWrong: {
    color: '#E85D5D',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },

  missedRight: {
    color: '#2F9E44',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },

  missedExplain: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },

  topRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },

  topRunRank: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '900',
    width: 26,
  },

  topRunScore: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    width: 70,
  },

  topRunMeta: {
    color: COLORS.textSecondary,
    fontSize: 9,
    flex: 1,
  },

  reviewButtons: {
    marginTop: 4,
    marginBottom: 20,
  },

  difficultyHero: {
    minHeight: 145,
    borderRadius: 22,
    marginBottom: 20,
    padding: 18,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  difficultyHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  difficultyHeroContent: {
    maxWidth: '82%',
  },

  difficultyHeroTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },

  difficultyHeroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },

  difficultyHeroBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  difficultyHeroBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
  },
});


export default styles;
