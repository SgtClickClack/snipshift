import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DefaultTheme } from '@react-navigation/native';

// Custom colors matching SnipShift branding
const snipshiftColors = {
  primary: '#FF6B35', // Coral/orange accent
  primaryContainer: '#FFE5DD',
  secondary: '#4A90E2', // Blue
  secondaryContainer: '#E3F2FD',
  tertiary: '#7CB342', // Green
  tertiaryContainer: '#E8F5E8',
  error: '#D32F2F',
  errorContainer: '#FFEBEE',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FF6B35',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#4A90E2',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#7CB342',
  onError: '#FFFFFF',
  onErrorContainer: '#D32F2F',
  onBackground: '#1C1B1F',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  outlineVariant: '#C4C7C5',
  inverseSurface: '#313033',
  inverseOnSurface: '#F4EFF4',
  inversePrimary: '#FFB4A0',
  shadow: '#000000',
  scrim: '#000000',
  surfaceTint: '#FF6B35',
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...snipshiftColors,
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FFB4A0',
    primaryContainer: '#872100',
    secondary: '#A4C8FF',
    secondaryContainer: '#004A77',
    tertiary: '#A8D57F',
    tertiaryContainer: '#165200',
    error: '#FFB4AB',
    errorContainer: '#93000A',
    background: '#0F1419',
    surface: '#0F1419',
    surfaceVariant: '#2D3135',
    onPrimary: '#5B1A00',
    onPrimaryContainer: '#FFDBCF',
    onSecondary: '#00315B',
    onSecondaryContainer: '#D4E3FF',
    onTertiary: '#003900',
    onTertiaryContainer: '#C4F08E',
    onError: '#690005',
    onErrorContainer: '#FFDAD6',
    onBackground: '#E0E2E8',
    onSurface: '#E0E2E8',
    onSurfaceVariant: '#C4C7C5',
    outline: '#8E918F',
    outlineVariant: '#424746',
    inverseSurface: '#E0E2E8',
    inverseOnSurface: '#2D3135',
    inversePrimary: '#FF6B35',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#FFB4A0',
  },
};

// Navigation theme (for React Navigation)
export const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: snipshiftColors.primary,
    background: snipshiftColors.background,
    card: snipshiftColors.surface,
    text: snipshiftColors.onSurface,
    border: snipshiftColors.outline,
    notification: snipshiftColors.error,
  },
};

export const navigationDarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FFB4A0',
    background: '#0F1419',
    card: '#0F1419',
    text: '#E0E2E8',
    border: '#424746',
    notification: '#FFB4AB',
  },
};

// Default theme export
export const theme = lightTheme;
