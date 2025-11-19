// Jest setup file for testing-library/jest-dom matchers
import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder (required by react-router-dom in Jest environment)
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

