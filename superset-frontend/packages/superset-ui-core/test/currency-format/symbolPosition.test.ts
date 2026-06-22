/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  resolveSymbolPosition,
  formatWithSymbolPosition,
  resetLegacySuffixWarning,
} from '@superset-ui/core';

afterEach(() => {
  window.featureFlags = {};
  resetLegacySuffixWarning();
});

test('resolveSymbolPosition honors an explicit position regardless of locale', () => {
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');
});

test('resolveSymbolPosition derives the position from the locale when unset', () => {
  // en-US places the symbol before the value for these currencies.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('GBP', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', undefined, 'en-US')).toEqual('prefix');

  // Eurozone locales place the EUR symbol after the value.
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'de-DE')).toEqual('suffix');
});

test('resolveSymbolPosition returns the same result on repeated calls (cached)', () => {
  // The second call hits the memoized (locale, currencyCode) entry.
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
});

test('resolveSymbolPosition falls back to prefix for unknown currencies', () => {
  expect(resolveSymbolPosition('INVALID_CODE', undefined, 'en-US')).toEqual(
    'prefix',
  );
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'prefix',
  );
});

test('formatWithSymbolPosition places the symbol according to the position', () => {
  expect(formatWithSymbolPosition('$', '1,000', 'prefix')).toEqual('$ 1,000');
  expect(formatWithSymbolPosition('€', '1,000', 'suffix')).toEqual('1,000 €');
});

test('resolveSymbolPosition returns suffix when CURRENCY_LEGACY_SUFFIX_DEFAULT is enabled', () => {
  window.featureFlags = { CURRENCY_LEGACY_SUFFIX_DEFAULT: true };
  // USD would be 'prefix' in en-US under the new behavior, but the legacy
  // flag forces 'suffix' regardless of locale.
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('suffix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
  expect(resolveSymbolPosition(undefined, undefined, 'en-US')).toEqual(
    'suffix',
  );
});

test('resolveSymbolPosition still honors explicit positions when legacy flag is enabled', () => {
  window.featureFlags = { CURRENCY_LEGACY_SUFFIX_DEFAULT: true };
  expect(resolveSymbolPosition('EUR', 'prefix', 'fr-FR')).toEqual('prefix');
  expect(resolveSymbolPosition('USD', 'suffix', 'en-US')).toEqual('suffix');
});

test('resolveSymbolPosition uses locale-based behavior when CURRENCY_LEGACY_SUFFIX_DEFAULT is off', () => {
  window.featureFlags = { CURRENCY_LEGACY_SUFFIX_DEFAULT: false };
  expect(resolveSymbolPosition('USD', undefined, 'en-US')).toEqual('prefix');
  expect(resolveSymbolPosition('EUR', undefined, 'fr-FR')).toEqual('suffix');
});

test('resolveSymbolPosition emits a deprecation warning once when legacy flag is enabled', () => {
  window.featureFlags = { CURRENCY_LEGACY_SUFFIX_DEFAULT: true };
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  resolveSymbolPosition('USD', undefined, 'en-US');
  expect(warnSpy).toHaveBeenCalledTimes(1);
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining('CURRENCY_LEGACY_SUFFIX_DEFAULT'),
  );
  // Second call should not warn again.
  resolveSymbolPosition('EUR', undefined, 'en-US');
  expect(warnSpy).toHaveBeenCalledTimes(1);
  warnSpy.mockRestore();
});
